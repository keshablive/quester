package services

import (
	"context"
	"errors"

	"github.com/gofiber/fiber/v2/log"
	"github.com/google/uuid"
	"github.com/yourusername/quester/internal/models"
	"gorm.io/gorm"
)

// LessonService handles business logic for lessons
type LessonService struct {
	db                 *gorm.DB
	achievementService *AchievementService
}

// NewLessonService creates a new lesson service
func NewLessonService(db *gorm.DB) *LessonService {
	return &LessonService{
		db:                 db,
		achievementService: NewAchievementService(db),
	}
}

// CreateLessonRequest contains data for creating a lesson
type CreateLessonRequest struct {
	CourseID             uuid.UUID              `json:"course_id" validate:"required"`
	Title                string                 `json:"title" validate:"required"`
	ContentType          string                 `json:"content_type" validate:"required,oneof=video text quiz"`
	Content              map[string]interface{} `json:"content" validate:"required"`
	OrderIndex           int                    `json:"order_index" validate:"min=0"`
	PrerequisiteLessonID *uuid.UUID             `json:"prerequisite_lesson_id,omitempty"`
	XPReward             int                    `json:"xp_reward" validate:"min=0"`
}

// Create creates a new lesson
func (s *LessonService) Create(req *CreateLessonRequest) (*models.Lesson, error) {
	// Validate course exists
	var course models.Course
	if err := s.db.First(&course, req.CourseID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, models.ErrCourseNotFound
		}
		return nil, err
	}

	// Validate prerequisite lesson if provided
	if req.PrerequisiteLessonID != nil {
		var prereqLesson models.Lesson
		if err := s.db.Where("id = ? AND course_id = ?", *req.PrerequisiteLessonID, req.CourseID).
			First(&prereqLesson).Error; err != nil {
			return nil, models.ErrInvalidPrerequisite
		}
	}

	// Create lesson
	lesson := &models.Lesson{
		CourseID:             req.CourseID,
		Title:                req.Title,
		ContentType:          models.LessonContentType(req.ContentType),
		Content:              models.JSONB(req.Content),
		OrderIndex:           req.OrderIndex,
		PrerequisiteLessonID: req.PrerequisiteLessonID,
		XPReward:             req.XPReward,
	}

	if err := s.db.Create(lesson).Error; err != nil {
		return nil, err
	}

	return lesson, nil
}

// GetByID retrieves a lesson by ID
func (s *LessonService) GetByID(lessonID uuid.UUID) (*models.Lesson, error) {
	var lesson models.Lesson
	err := s.db.Preload("Course").
		Preload("PrerequisiteLesson").
		First(&lesson, "id = ?", lessonID).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, models.ErrLessonNotFound
		}
		return nil, err
	}

	return &lesson, nil
}

// GetWithStatus retrieves a lesson with user-specific status
func (s *LessonService) GetWithStatus(lessonID uuid.UUID, userID uuid.UUID) (*models.LessonWithStatus, error) {
	return models.GetLessonWithStatus(s.db, lessonID, userID)
}

// GetCourseLessons retrieves all lessons for a course ordered by order_index
func (s *LessonService) GetCourseLessons(courseID uuid.UUID) ([]models.Lesson, error) {
	var lessons []models.Lesson
	err := s.db.Where("course_id = ?", courseID).
		Order("order_index ASC").
		Find(&lessons).Error

	if err != nil {
		return nil, err
	}

	return lessons, nil
}

// GetCourseLessonsWithStatus retrieves all lessons for a course with user status
func (s *LessonService) GetCourseLessonsWithStatus(courseID uuid.UUID, userID uuid.UUID) ([]models.LessonWithStatus, error) {
	return models.GetCourseLessonsWithStatus(s.db, courseID, userID)
}

// UpdateLessonRequest contains data for updating a lesson
type UpdateLessonRequest struct {
	Title                *string                 `json:"title,omitempty"`
	ContentType          *string                 `json:"content_type,omitempty" validate:"omitempty,oneof=video text quiz"`
	Content              *map[string]interface{} `json:"content,omitempty"`
	OrderIndex           *int                    `json:"order_index,omitempty" validate:"omitempty,min=0"`
	PrerequisiteLessonID *uuid.UUID              `json:"prerequisite_lesson_id,omitempty"`
	XPReward             *int                    `json:"xp_reward,omitempty" validate:"omitempty,min=0"`
}

// Update updates a lesson
func (s *LessonService) Update(lessonID uuid.UUID, req *UpdateLessonRequest) (*models.Lesson, error) {
	lesson, err := s.GetByID(lessonID)
	if err != nil {
		return nil, err
	}

	// Validate prerequisite if being updated
	if req.PrerequisiteLessonID != nil {
		var prereqLesson models.Lesson
		if err := s.db.Where("id = ? AND course_id = ?", *req.PrerequisiteLessonID, lesson.CourseID).
			First(&prereqLesson).Error; err != nil {
			return nil, models.ErrInvalidPrerequisite
		}
	}

	// Update fields if provided
	if req.Title != nil {
		lesson.Title = *req.Title
	}
	if req.ContentType != nil {
		lesson.ContentType = models.LessonContentType(*req.ContentType)
	}
	if req.Content != nil {
		lesson.Content = models.JSONB(*req.Content)
	}
	if req.OrderIndex != nil {
		lesson.OrderIndex = *req.OrderIndex
	}
	if req.PrerequisiteLessonID != nil {
		lesson.PrerequisiteLessonID = req.PrerequisiteLessonID
	}
	if req.XPReward != nil {
		lesson.XPReward = *req.XPReward
	}

	if err := s.db.Save(lesson).Error; err != nil {
		return nil, err
	}

	return lesson, nil
}

// Delete deletes a lesson
func (s *LessonService) Delete(lessonID uuid.UUID) error {
	// Check if any lessons depend on this as prerequisite
	var count int64
	if err := s.db.Model(&models.Lesson{}).
		Where("prerequisite_lesson_id = ?", lessonID).
		Count(&count).Error; err != nil {
		return err
	}

	if count > 0 {
		return errors.New("cannot delete lesson that is a prerequisite for other lessons")
	}

	return s.db.Delete(&models.Lesson{}, lessonID).Error
}

// ValidatePrerequisite checks if a user has completed the prerequisite lesson
func (s *LessonService) ValidatePrerequisite(lessonID uuid.UUID, userID uuid.UUID) error {
	lesson, err := s.GetByID(lessonID)
	if err != nil {
		return err
	}

	// If no prerequisite, lesson is accessible
	if lesson.PrerequisiteLessonID == nil {
		return nil
	}

	// Check if prerequisite is completed
	var count int64
	err = s.db.Model(&models.LessonCompletion{}).
		Where("user_id = ? AND lesson_id = ?", userID, *lesson.PrerequisiteLessonID).
		Count(&count).Error

	if err != nil {
		return err
	}

	if count == 0 {
		return models.ErrPrerequisiteNotMet
	}

	return nil
}

// CompleteLessonRequest contains data for completing a lesson
type CompleteLessonRequest struct {
	UserID   uuid.UUID `json:\"user_id\" validate:\"required\"`
	LessonID uuid.UUID `json:\"lesson_id\" validate:\"required\"`
	Grade    *float64  `json:\"grade,omitempty\" validate:\"omitempty,min=0,max=100\"`
}

// Complete marks a lesson as completed for a user
func (s *LessonService) Complete(req *CompleteLessonRequest) (*models.LessonCompletion, error) {
	ctx := context.Background()

	// Validate lesson exists
	lesson, err := s.GetByID(req.LessonID)
	if err != nil {
		return nil, err
	}

	// Validate prerequisite
	if err := s.ValidatePrerequisite(req.LessonID, req.UserID); err != nil {
		return nil, err
	}

	// Check if already completed
	var existing models.LessonCompletion
	err = s.db.Where("user_id = ? AND lesson_id = ?", req.UserID, req.LessonID).
		First(&existing).Error

	if err == nil {
		// Already completed, update if grade provided
		if req.Grade != nil {
			existing.Grade = req.Grade
			if err := s.db.Save(&existing).Error; err != nil {
				return nil, err
			}
		}
		return &existing, nil
	}

	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	// Create completion record
	completion := &models.LessonCompletion{
		UserID:   req.UserID,
		LessonID: req.LessonID,
		Grade:    req.Grade,
	}

	if err := s.db.Create(completion).Error; err != nil {
		return nil, err
	}

	// Award XP to user
	if lesson.XPReward > 0 {
		if err := s.awardXP(req.UserID, lesson.XPReward); err != nil {
			// Log error but don't fail completion
			log.Warnf("Failed to award XP: user_id=%s, lesson_id=%d, xp=%d, error=%v",
				req.UserID, req.LessonID, lesson.XPReward, err)
		} else {
			// Log successful XP award
			log.Infof("XP awarded: user_id=%s, lesson_id=%d, course_id=%d, xp=%d",
				req.UserID, req.LessonID, lesson.CourseID, lesson.XPReward)

			// Track achievement progress for lesson completion
			if err := s.achievementService.TrackLessonCompletion(ctx, req.UserID); err != nil {
				log.Warnf("Failed to track lesson achievement: user_id=%s, error=%v", req.UserID, err)
			}

			// Get user's current XP and check thresholds
			var user models.User
			if err := s.db.First(&user, "id = ?", req.UserID).Error; err == nil {
				if err := s.achievementService.TrackXPThreshold(ctx, req.UserID, user.XP); err != nil {
					log.Warnf("Failed to track XP threshold: user_id=%s, error=%v", req.UserID, err)
				}
			}
		}
	}

	// Update enrollment progress
	var enrollment models.Enrollment
	err = s.db.Where("user_id = ? AND course_id = ?", req.UserID, lesson.CourseID).
		First(&enrollment).Error

	if err == nil {
		if err := enrollment.UpdateProgress(s.db); err != nil {
			// Log error but don't fail completion
			log.Warnf("Failed to update enrollment progress: user_id=%s, course_id=%d, error=%v",
				req.UserID, lesson.CourseID, err)
		} else {
			log.Infof("Enrollment progress updated: user_id=%s, course_id=%d, completion=%.2f%%",
				req.UserID, lesson.CourseID, enrollment.CompletionPercentage)
		}

		// Check if certificate should be issued
		if err := enrollment.CheckAndIssueCertificate(s.db); err != nil {
			// Log error but don't fail completion
			// TODO: Add proper logging
		}
	}

	return completion, nil
}

// awardXP awards XP to a user
func (s *LessonService) awardXP(userID uuid.UUID, xp int) error {
	// TODO: Integrate with XP system/leaderboard service
	// For now, just update user's total XP
	return s.db.Model(&models.User{}).
		Where("id = ?", userID).
		UpdateColumn("xp", gorm.Expr("xp + ?", xp)).Error
}

// ReorderLessons reorders lessons in a course
func (s *LessonService) ReorderLessons(courseID uuid.UUID, lessonIDs []uuid.UUID) error {
	// Validate all lessons belong to the course
	var count int64
	s.db.Model(&models.Lesson{}).
		Where("course_id = ? AND id IN ?", courseID, lessonIDs).
		Count(&count)

	if int(count) != len(lessonIDs) {
		return errors.New("some lessons do not belong to this course")
	}

	// Update order_index for each lesson
	for i, lessonID := range lessonIDs {
		if err := s.db.Model(&models.Lesson{}).
			Where("id = ?", lessonID).
			Update("order_index", i).Error; err != nil {
			return err
		}
	}

	return nil
}

// GetLessonProgress retrieves progress statistics for a lesson
func (s *LessonService) GetLessonProgress(lessonID uuid.UUID) (map[string]interface{}, error) {
	var stats struct {
		TotalCompletions int64   `json:"total_completions"`
		AverageGrade     float64 `json:"average_grade"`
	}

	// Total completions
	s.db.Model(&models.LessonCompletion{}).
		Where("lesson_id = ?", lessonID).
		Count(&stats.TotalCompletions)

	// Average grade
	s.db.Model(&models.LessonCompletion{}).
		Where("lesson_id = ? AND grade IS NOT NULL", lessonID).
		Select("COALESCE(AVG(grade), 0)").
		Scan(&stats.AverageGrade)

	return map[string]interface{}{
		"total_completions": stats.TotalCompletions,
		"average_grade":     stats.AverageGrade,
	}, nil
}
