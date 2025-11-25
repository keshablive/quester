package services

import (
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/yourusername/quester/internal/models"
)

// AssessmentService handles business logic for assessments
type AssessmentService struct {
	db *gorm.DB
}

// NewAssessmentService creates a new AssessmentService
func NewAssessmentService(db *gorm.DB) *AssessmentService {
	return &AssessmentService{db: db}
}

// CreateAssessment creates a new assessment
func (s *AssessmentService) CreateAssessment(tenantID uuid.UUID, lessonID *uuid.UUID, courseID *uuid.UUID, title, description string, questions map[string]interface{}, passingGrade float64, autoGrade bool, timeLimit *int) (*models.Assessment, error) {
	// Validate that either lessonID or courseID is provided
	if lessonID == nil && courseID == nil {
		return nil, errors.New("either lessonID or courseID must be provided")
	}

	assessment := &models.Assessment{
		TenantID:     tenantID,
		LessonID:     lessonID,
		CourseID:     courseID,
		Title:        title,
		Description:  description,
		Questions:    questions,
		PassingGrade: passingGrade,
		AutoGrade:    autoGrade,
		TimeLimit:    timeLimit,
	}

	// Validation happens in BeforeCreate hook
	if err := s.db.Create(assessment).Error; err != nil {
		return nil, fmt.Errorf("failed to create assessment: %w", err)
	}

	return assessment, nil
}

// GetAssessmentByID retrieves an assessment by ID
func (s *AssessmentService) GetAssessmentByID(tenantID uuid.UUID, assessmentID uuid.UUID) (*models.Assessment, error) {
	var assessment models.Assessment
	if err := s.db.Where("id = ? AND tenant_id = ?", assessmentID, tenantID).First(&assessment).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, models.ErrAssessmentNotFound
		}
		return nil, fmt.Errorf("failed to get assessment: %w", err)
	}

	return &assessment, nil
}

// GetAssessmentsByLesson retrieves all assessments for a lesson
func (s *AssessmentService) GetAssessmentsByLesson(tenantID uuid.UUID, lessonID uint) ([]models.Assessment, error) {
	var assessments []models.Assessment
	if err := s.db.Where("tenant_id = ? AND lesson_id = ?", tenantID, lessonID).Find(&assessments).Error; err != nil {
		return nil, fmt.Errorf("failed to get assessments for lesson: %w", err)
	}

	return assessments, nil
}

// GetAssessmentsByCourse retrieves all assessments for a course
func (s *AssessmentService) GetAssessmentsByCourse(tenantID uuid.UUID, courseID uint) ([]models.Assessment, error) {
	var assessments []models.Assessment
	if err := s.db.Where("tenant_id = ? AND course_id = ?", tenantID, courseID).Find(&assessments).Error; err != nil {
		return nil, fmt.Errorf("failed to get assessments for course: %w", err)
	}

	return assessments, nil
}

// UpdateAssessment updates an existing assessment
func (s *AssessmentService) UpdateAssessment(tenantID uuid.UUID, assessmentID uuid.UUID, updates map[string]interface{}) (*models.Assessment, error) {
	assessment, err := s.GetAssessmentByID(tenantID, assessmentID)
	if err != nil {
		return nil, err
	}

	// Update only allowed fields
	if err := s.db.Model(assessment).Updates(updates).Error; err != nil {
		return nil, fmt.Errorf("failed to update assessment: %w", err)
	}

	return assessment, nil
}

// DeleteAssessment soft deletes an assessment
func (s *AssessmentService) DeleteAssessment(tenantID uuid.UUID, assessmentID uuid.UUID) error {
	result := s.db.Where("id = ? AND tenant_id = ?", assessmentID, tenantID).Delete(&models.Assessment{})
	if result.Error != nil {
		return fmt.Errorf("failed to delete assessment: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return models.ErrAssessmentNotFound
	}

	return nil
}

// SubmitAssessment records a user's assessment submission
func (s *AssessmentService) SubmitAssessment(tenantID uuid.UUID, assessmentID uuid.UUID, userID uuid.UUID, answers map[string]interface{}) (*models.AssessmentSubmission, error) {
	// Check if assessment exists
	assessment, err := s.GetAssessmentByID(tenantID, assessmentID)
	if err != nil {
		return nil, err
	}

	// Check if user has already submitted
	var existingSubmission models.AssessmentSubmission
	err = s.db.Where("tenant_id = ? AND assessment_id = ? AND user_id = ?", tenantID, assessmentID, userID).First(&existingSubmission).Error
	if err == nil {
		return nil, models.ErrAlreadySubmitted
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("failed to check existing submission: %w", err)
	}

	// Create submission
	submission := &models.AssessmentSubmission{
		TenantID:     tenantID,
		AssessmentID: assessmentID,
		UserID:       userID,
		Answers:      answers,
		SubmittedAt:  time.Now(),
	}

	// Auto-grade if possible
	if assessment.AutoGrade {
		if err := s.AutoGrade(submission, assessment); err != nil {
			return nil, fmt.Errorf("failed to auto-grade submission: %w", err)
		}
	}

	if err := s.db.Create(submission).Error; err != nil {
		return nil, fmt.Errorf("failed to create submission: %w", err)
	}

	return submission, nil
}

// AutoGrade automatically grades MCQ and True/False questions
func (s *AssessmentService) AutoGrade(submission *models.AssessmentSubmission, assessment *models.Assessment) error {
	if !assessment.AutoGrade {
		return errors.New("assessment is not configured for auto-grading")
	}

	// Extract questions from assessment
	questionsData, ok := assessment.Questions["questions"].([]interface{})
	if !ok {
		return errors.New("invalid questions format")
	}

	// Extract answers from submission
	answersData, ok := submission.Answers["answers"].([]interface{})
	if !ok {
		return errors.New("invalid answers format")
	}

	if len(questionsData) != len(answersData) {
		return errors.New("number of answers does not match number of questions")
	}

	totalPoints := 0
	earnedPoints := 0

	// Grade each question
	for i, qData := range questionsData {
		question, ok := qData.(map[string]interface{})
		if !ok {
			continue
		}

		answer, ok := answersData[i].(map[string]interface{})
		if !ok {
			continue
		}

		points, ok := question["points"].(float64)
		if !ok {
			continue
		}
		totalPoints += int(points)

		qType, ok := question["type"].(string)
		if !ok {
			continue
		}

		// Grade based on question type
		correct := false
		switch models.QuestionType(qType) {
		case models.QuestionTypeMultipleChoice:
			correctIndex, ok := question["correct_index"].(float64)
			if !ok {
				continue
			}
			userAnswer, ok := answer["selected_index"].(float64)
			if ok && int(correctIndex) == int(userAnswer) {
				correct = true
			}

		case models.QuestionTypeTrueFalse:
			correctAnswer, ok := question["correct"].(bool)
			if !ok {
				continue
			}
			userAnswer, ok := answer["answer"].(bool)
			if ok && correctAnswer == userAnswer {
				correct = true
			}

		default:
			// Cannot auto-grade short answer or essay
			continue
		}

		if correct {
			earnedPoints += int(points)
		}
	}

	// Calculate percentage score
	var score float64
	if totalPoints > 0 {
		score = (float64(earnedPoints) / float64(totalPoints)) * 100
	}

	// Determine if passed
	passed := score >= assessment.PassingGrade

	// Update submission with grade
	submission.Score = &score
	submission.Grade = &score
	submission.Passed = &passed
	now := time.Now()
	submission.GradedAt = &now

	return nil
}

// GetSubmissionByID retrieves a submission by ID
func (s *AssessmentService) GetSubmissionByID(tenantID uuid.UUID, submissionID uint) (*models.AssessmentSubmission, error) {
	var submission models.AssessmentSubmission
	if err := s.db.Preload("Assessment").Preload("User").Where("id = ? AND tenant_id = ?", submissionID, tenantID).First(&submission).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, models.ErrSubmissionNotFound
		}
		return nil, fmt.Errorf("failed to get submission: %w", err)
	}

	return &submission, nil
}

// GetUserSubmissions retrieves all submissions for a user
func (s *AssessmentService) GetUserSubmissions(tenantID uuid.UUID, userID uuid.UUID) ([]models.AssessmentSubmission, error) {
	var submissions []models.AssessmentSubmission
	if err := s.db.Preload("Assessment").Where("tenant_id = ? AND user_id = ?", tenantID, userID).Find(&submissions).Error; err != nil {
		return nil, fmt.Errorf("failed to get user submissions: %w", err)
	}

	return submissions, nil
}

// GetAssessmentSubmissions retrieves all submissions for an assessment
func (s *AssessmentService) GetAssessmentSubmissions(tenantID uuid.UUID, assessmentID uuid.UUID) ([]models.AssessmentSubmission, error) {
	var submissions []models.AssessmentSubmission
	if err := s.db.Preload("User").Where("tenant_id = ? AND assessment_id = ?", tenantID, assessmentID).Find(&submissions).Error; err != nil {
		return nil, fmt.Errorf("failed to get assessment submissions: %w", err)
	}

	return submissions, nil
}

// ManualGrade allows an instructor to manually grade a submission
func (s *AssessmentService) ManualGrade(tenantID uuid.UUID, submissionID uint, graderID uuid.UUID, score float64, feedback string) (*models.AssessmentSubmission, error) {
	submission, err := s.GetSubmissionByID(tenantID, submissionID)
	if err != nil {
		return nil, err
	}

	// Validate score
	if score < 0 || score > 100 {
		return nil, errors.New("score must be between 0 and 100")
	}

	// Get assessment to check passing grade
	assessment, err := s.GetAssessmentByID(tenantID, submission.AssessmentID)
	if err != nil {
		return nil, err
	}

	passed := score >= assessment.PassingGrade
	now := time.Now()

	// Update submission
	updates := map[string]interface{}{
		"score":     score,
		"grade":     score,
		"passed":    passed,
		"graded_by": graderID,
		"graded_at": now,
	}

	if err := s.db.Model(submission).Updates(updates).Error; err != nil {
		return nil, fmt.Errorf("failed to update submission grade: %w", err)
	}

	return submission, nil
}

// GetUserAssessmentResult retrieves a user's result for a specific assessment
func (s *AssessmentService) GetUserAssessmentResult(tenantID uuid.UUID, assessmentID uuid.UUID, userID uuid.UUID) (*models.AssessmentSubmission, error) {
	var submission models.AssessmentSubmission
	err := s.db.Preload("Assessment").
		Where("tenant_id = ? AND assessment_id = ? AND user_id = ?", tenantID, assessmentID, userID).
		First(&submission).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, models.ErrSubmissionNotFound
		}
		return nil, fmt.Errorf("failed to get user assessment result: %w", err)
	}

	return &submission, nil
}
