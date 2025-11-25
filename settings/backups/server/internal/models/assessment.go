package models

import (
	"errors"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Assessment-related errors
var (
	ErrInvalidQuestionType  = errors.New("invalid question type")
	ErrMissingCorrectAnswer = errors.New("correct answer is required for auto-gradable questions")
	ErrInvalidPassingGrade  = errors.New("passing grade must be between 0 and 100")
	ErrAssessmentNotFound   = errors.New("assessment not found")
	ErrSubmissionNotFound   = errors.New("submission not found")
	ErrAlreadySubmitted     = errors.New("assessment already submitted")
)

// QuestionType represents the type of assessment question
type QuestionType string

const (
	QuestionTypeMultipleChoice QuestionType = "multiple_choice"
	QuestionTypeTrueFalse      QuestionType = "true_false"
	QuestionTypeShortAnswer    QuestionType = "short_answer"
	QuestionTypeEssay          QuestionType = "essay"
)

// IsAutoGradable checks if the question type can be auto-graded
func (qt QuestionType) IsAutoGradable() bool {
	return qt == QuestionTypeMultipleChoice || qt == QuestionTypeTrueFalse
}

// Assessment represents a quiz or test within a lesson or course
type Assessment struct {
	ID           uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID     uuid.UUID      `gorm:"type:uuid;not null;index:idx_assessments_tenant" json:"tenant_id"`
	LessonID     *uuid.UUID     `gorm:"type:uuid;index:idx_assessments_lesson" json:"lesson_id,omitempty"`
	CourseID     *uuid.UUID     `gorm:"type:uuid;index:idx_assessments_course" json:"course_id,omitempty"`
	Title        string         `gorm:"type:varchar(255);not null" json:"title"`
	Description  string         `gorm:"type:text" json:"description"`
	Questions    JSONB          `gorm:"type:jsonb;not null" json:"questions"`
	PassingGrade float64        `gorm:"type:decimal(5,2);not null;default:70" json:"passing_grade"`
	AutoGrade    bool           `gorm:"not null;default:true" json:"auto_grade"`
	TimeLimit    *int           `gorm:"comment:Time limit in minutes" json:"time_limit,omitempty"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`

	// Relationships
	Lesson      *Lesson                `gorm:"foreignKey:LessonID;constraint:OnDelete:CASCADE" json:"lesson,omitempty"`
	Course      *Course                `gorm:"foreignKey:CourseID;constraint:OnDelete:CASCADE" json:"course,omitempty"`
	Submissions []AssessmentSubmission `gorm:"foreignKey:AssessmentID;constraint:OnDelete:CASCADE" json:"submissions,omitempty"`
}

// TableName specifies the table name for the Assessment model
func (Assessment) TableName() string {
	return "assessments"
}

// BeforeCreate hook to validate assessment before creation
func (a *Assessment) BeforeCreate(tx *gorm.DB) error {
	// Validate passing grade
	if a.PassingGrade < 0 || a.PassingGrade > 100 {
		return ErrInvalidPassingGrade
	}

	// Validate questions
	if err := a.ValidateQuestions(); err != nil {
		return err
	}

	return nil
}

// BeforeUpdate hook to validate assessment before update
func (a *Assessment) BeforeUpdate(tx *gorm.DB) error {
	// Validate passing grade
	if a.PassingGrade < 0 || a.PassingGrade > 100 {
		return ErrInvalidPassingGrade
	}

	// Validate questions
	if err := a.ValidateQuestions(); err != nil {
		return err
	}

	return nil
}

// ValidateQuestions validates the questions JSONB structure
func (a *Assessment) ValidateQuestions() error {
	questions, ok := a.Questions["questions"].([]interface{})
	if !ok || len(questions) == 0 {
		return errors.New("questions array is required")
	}

	for i, q := range questions {
		question, ok := q.(map[string]interface{})
		if !ok {
			return errors.New("invalid question format")
		}

		// Validate question type
		qType, ok := question["type"].(string)
		if !ok {
			return errors.New("question type is required")
		}

		questionType := QuestionType(qType)
		switch questionType {
		case QuestionTypeMultipleChoice:
			// Validate options and correct_index
			if _, ok := question["options"]; !ok {
				return errors.New("options required for multiple choice questions")
			}
			if _, ok := question["correct_index"]; !ok {
				return ErrMissingCorrectAnswer
			}

		case QuestionTypeTrueFalse:
			// Validate correct answer
			if _, ok := question["correct"]; !ok {
				return ErrMissingCorrectAnswer
			}

		case QuestionTypeShortAnswer, QuestionTypeEssay:
			// These require manual grading
			if a.AutoGrade {
				return errors.New("auto-grade must be false for short answer/essay questions")
			}

		default:
			return ErrInvalidQuestionType
		}

		// Validate points
		if _, ok := question["points"]; !ok {
			return errors.New("points required for question " + string(rune(i+1)))
		}
	}

	return nil
}

// CalculateTotalPoints calculates the total points for all questions
func (a *Assessment) CalculateTotalPoints() int {
	questions, ok := a.Questions["questions"].([]interface{})
	if !ok {
		return 0
	}

	totalPoints := 0
	for _, q := range questions {
		question, ok := q.(map[string]interface{})
		if !ok {
			continue
		}

		if points, ok := question["points"].(float64); ok {
			totalPoints += int(points)
		}
	}

	return totalPoints
}

// IsAutoGradable checks if all questions in the assessment can be auto-graded
func (a *Assessment) IsAutoGradable() bool {
	questions, ok := a.Questions["questions"].([]interface{})
	if !ok {
		return false
	}

	for _, q := range questions {
		question, ok := q.(map[string]interface{})
		if !ok {
			return false
		}

		qType, ok := question["type"].(string)
		if !ok {
			return false
		}

		questionType := QuestionType(qType)
		if !questionType.IsAutoGradable() {
			return false
		}
	}

	return true
}

// AssessmentSubmission represents a user's submission for an assessment
type AssessmentSubmission struct {
	ID           uint       `gorm:"primaryKey" json:"id"`
	TenantID     uuid.UUID  `gorm:"type:uuid;not null;index:idx_assessment_submissions_tenant" json:"tenant_id"`
	AssessmentID uuid.UUID  `gorm:"type:uuid;not null;uniqueIndex:idx_submission_user_assessment" json:"assessment_id"`
	UserID       uuid.UUID  `gorm:"type:uuid;not null;uniqueIndex:idx_submission_user_assessment;index:idx_submissions_user" json:"user_id"`
	Answers      JSONB      `gorm:"type:jsonb;not null" json:"answers"`
	Score        *float64   `gorm:"type:decimal(5,2)" json:"score,omitempty"`
	Grade        *float64   `gorm:"type:decimal(5,2)" json:"grade,omitempty"`
	Passed       *bool      `json:"passed,omitempty"`
	GradedBy     *uuid.UUID `gorm:"type:uuid;index:idx_submissions_grader" json:"graded_by,omitempty"`
	GradedAt     *time.Time `json:"graded_at,omitempty"`
	SubmittedAt  time.Time  `gorm:"not null;default:CURRENT_TIMESTAMP" json:"submitted_at"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`

	// Relationships
	Assessment Assessment `gorm:"foreignKey:AssessmentID;constraint:OnDelete:CASCADE" json:"assessment,omitempty"`
	User       User       `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"user,omitempty"`
	Grader     *User      `gorm:"foreignKey:GradedBy" json:"grader,omitempty"`
}

// TableName specifies the table name for the AssessmentSubmission model
func (AssessmentSubmission) TableName() string {
	return "assessment_submissions"
}

// AutoGrade automatically grades the submission for auto-gradable questions
func (s *AssessmentSubmission) AutoGrade(assessment *Assessment) error {
	if !assessment.IsAutoGradable() {
		return errors.New("assessment contains questions that require manual grading")
	}

	questions, ok := assessment.Questions["questions"].([]interface{})
	if !ok {
		return errors.New("invalid questions format")
	}

	answers, ok := s.Answers["answers"].([]interface{})
	if !ok {
		return errors.New("invalid answers format")
	}

	if len(answers) != len(questions) {
		return errors.New("answer count does not match question count")
	}

	totalPoints := 0
	earnedPoints := 0

	for i, q := range questions {
		question, ok := q.(map[string]interface{})
		if !ok {
			continue
		}

		answer, ok := answers[i].(map[string]interface{})
		if !ok {
			continue
		}

		points := int(question["points"].(float64))
		totalPoints += points

		qType := QuestionType(question["type"].(string))

		switch qType {
		case QuestionTypeMultipleChoice:
			correctIndex := int(question["correct_index"].(float64))
			userIndex := int(answer["selected_index"].(float64))
			if correctIndex == userIndex {
				earnedPoints += points
			}

		case QuestionTypeTrueFalse:
			correct := question["correct"].(bool)
			userAnswer := answer["answer"].(bool)
			if correct == userAnswer {
				earnedPoints += points
			}
		}
	}

	// Calculate grade as percentage
	grade := float64(0)
	if totalPoints > 0 {
		grade = (float64(earnedPoints) / float64(totalPoints)) * 100
	}

	s.Score = &grade
	s.Grade = &grade
	passed := grade >= assessment.PassingGrade
	s.Passed = &passed
	now := time.Now()
	s.GradedAt = &now

	return nil
}

// IsGraded checks if the submission has been graded
func (s *AssessmentSubmission) IsGraded() bool {
	return s.Grade != nil
}

// IsPassed checks if the submission passed
func (s *AssessmentSubmission) IsPassed() bool {
	return s.Passed != nil && *s.Passed
}

// GetUserSubmission retrieves a user's submission for an assessment
func GetUserSubmission(db *gorm.DB, assessmentID uint, userID uuid.UUID) (*AssessmentSubmission, error) {
	var submission AssessmentSubmission
	err := db.Where("assessment_id = ? AND user_id = ?", assessmentID, userID).First(&submission).Error
	if err != nil {
		return nil, err
	}
	return &submission, nil
}

// HasUserSubmitted checks if a user has submitted an assessment
func HasUserSubmitted(db *gorm.DB, assessmentID uint, userID uuid.UUID) (bool, error) {
	var count int64
	err := db.Model(&AssessmentSubmission{}).
		Where("assessment_id = ? AND user_id = ?", assessmentID, userID).
		Count(&count).Error
	if err != nil {
		return false, err
	}
	return count > 0, nil
}
