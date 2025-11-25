package models

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Lesson-related errors
var (
	ErrInvalidContentType  = errors.New("invalid lesson content type")
	ErrMissingLessonTitle  = errors.New("lesson title is required")
	ErrInvalidPrerequisite = errors.New("prerequisite lesson not found or invalid")
	ErrInvalidOrderIndex   = errors.New("order index must be non-negative")
	ErrLessonNotFound      = errors.New("lesson not found")
	ErrPrerequisiteNotMet  = errors.New("prerequisite lesson not completed")
)

// LessonContentType represents the type of content in a lesson
type LessonContentType string

const (
	ContentTypeVideo LessonContentType = "video"
	ContentTypeText  LessonContentType = "text"
	ContentTypeQuiz  LessonContentType = "quiz"
)

// JSONB is a custom type for storing JSON data in PostgreSQL
type JSONB map[string]interface{}

// Value implements the driver.Valuer interface for JSONB
func (j JSONB) Value() (driver.Value, error) {
	if j == nil {
		return nil, nil
	}
	return json.Marshal(j)
}

// Scan implements the sql.Scanner interface for JSONB
func (j *JSONB) Scan(value interface{}) error {
	if value == nil {
		*j = make(JSONB)
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("failed to unmarshal JSONB value")
	}

	return json.Unmarshal(bytes, j)
}

// Lesson represents a single learning unit within a course
type Lesson struct {
	ID                   uuid.UUID         `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	CourseID             uuid.UUID         `gorm:"type:uuid;not null;index:idx_lessons_course" json:"course_id"`
	Title                string            `gorm:"type:varchar(255);not null" json:"title"`
	ContentType          LessonContentType `gorm:"type:varchar(20);not null" json:"content_type"`
	Content              JSONB             `gorm:"type:jsonb;not null" json:"content"`
	OrderIndex           int               `gorm:"not null;index:idx_lessons_order" json:"order_index"`
	PrerequisiteLessonID *uuid.UUID        `gorm:"type:uuid;index:idx_lessons_prerequisite" json:"prerequisite_lesson_id,omitempty"`
	XPReward             int               `gorm:"not null;default:0" json:"xp_reward"`
	CreatedAt            time.Time         `json:"created_at"`
	UpdatedAt            time.Time         `json:"updated_at"`
	DeletedAt            gorm.DeletedAt    `gorm:"index" json:"deleted_at,omitempty"`

	// Relationships
	Course             Course             `gorm:"foreignKey:CourseID;constraint:OnDelete:CASCADE" json:"course,omitempty"`
	PrerequisiteLesson *Lesson            `gorm:"foreignKey:PrerequisiteLessonID" json:"prerequisite_lesson,omitempty"`
	Completions        []LessonCompletion `gorm:"foreignKey:LessonID;constraint:OnDelete:CASCADE" json:"completions,omitempty"`
}

// TableName specifies the table name for the Lesson model
func (Lesson) TableName() string {
	return "lessons"
}

// BeforeCreate hook to validate lesson before creation
func (l *Lesson) BeforeCreate(tx *gorm.DB) error {
	// Validate title
	if l.Title == "" {
		return ErrMissingLessonTitle
	}

	// Validate content type
	if err := l.ValidateContentType(); err != nil {
		return err
	}

	// Validate order index
	if l.OrderIndex < 0 {
		return ErrInvalidOrderIndex
	}

	// Validate prerequisite lesson exists
	if l.PrerequisiteLessonID != nil {
		var count int64
		tx.Model(&Lesson{}).Where("id = ? AND course_id = ?", *l.PrerequisiteLessonID, l.CourseID).Count(&count)
		if count == 0 {
			return ErrInvalidPrerequisite
		}
	}

	return nil
}

// BeforeUpdate hook to validate lesson before update
func (l *Lesson) BeforeUpdate(tx *gorm.DB) error {
	// Validate title
	if l.Title == "" {
		return ErrMissingLessonTitle
	}

	// Validate content type
	if err := l.ValidateContentType(); err != nil {
		return err
	}

	// Validate order index
	if l.OrderIndex < 0 {
		return ErrInvalidOrderIndex
	}

	// Validate prerequisite lesson exists and is in same course
	if l.PrerequisiteLessonID != nil {
		var count int64
		tx.Model(&Lesson{}).Where("id = ? AND course_id = ?", *l.PrerequisiteLessonID, l.CourseID).Count(&count)
		if count == 0 {
			return ErrInvalidPrerequisite
		}
	}

	return nil
}

// ValidateContentType validates the lesson content type
func (l *Lesson) ValidateContentType() error {
	switch l.ContentType {
	case ContentTypeVideo, ContentTypeText, ContentTypeQuiz:
		return nil
	default:
		return ErrInvalidContentType
	}
}

// IsLocked checks if the lesson is locked for a given user
func (l *Lesson) IsLocked(db *gorm.DB, userID uuid.UUID) (bool, error) {
	// If no prerequisite, lesson is unlocked
	if l.PrerequisiteLessonID == nil {
		return false, nil
	}

	// Check if prerequisite is completed
	var count int64
	err := db.Model(&LessonCompletion{}).
		Where("user_id = ? AND lesson_id = ?", userID, *l.PrerequisiteLessonID).
		Count(&count).Error

	if err != nil {
		return true, err
	}

	// Locked if prerequisite not completed
	return count == 0, nil
}

// IsCompleted checks if the lesson is completed by a given user
func (l *Lesson) IsCompleted(db *gorm.DB, userID uuid.UUID) (bool, error) {
	var count int64
	err := db.Model(&LessonCompletion{}).
		Where("user_id = ? AND lesson_id = ?", userID, l.ID).
		Count(&count).Error

	if err != nil {
		return false, err
	}

	return count > 0, nil
}

// GetCompletion retrieves the completion record for a user
func (l *Lesson) GetCompletion(db *gorm.DB, userID uuid.UUID) (*LessonCompletion, error) {
	var completion LessonCompletion
	err := db.Where("user_id = ? AND lesson_id = ?", userID, l.ID).First(&completion).Error
	if err != nil {
		return nil, err
	}
	return &completion, nil
}

// LessonWithStatus includes lesson data with user-specific status
type LessonWithStatus struct {
	Lesson
	IsLocked    bool     `json:"is_locked"`
	IsCompleted bool     `json:"is_completed"`
	Grade       *float64 `json:"grade,omitempty"`
}

// GetLessonWithStatus retrieves lesson with user-specific status
func GetLessonWithStatus(db *gorm.DB, lessonID uuid.UUID, userID uuid.UUID) (*LessonWithStatus, error) {
	var lesson Lesson
	if err := db.Preload("PrerequisiteLesson").First(&lesson, "id = ?", lessonID).Error; err != nil {
		return nil, err
	}

	isLocked, err := lesson.IsLocked(db, userID)
	if err != nil {
		return nil, err
	}

	isCompleted, err := lesson.IsCompleted(db, userID)
	if err != nil {
		return nil, err
	}

	var grade *float64
	if isCompleted {
		completion, err := lesson.GetCompletion(db, userID)
		if err == nil && completion.Grade != nil {
			grade = completion.Grade
		}
	}

	return &LessonWithStatus{
		Lesson:      lesson,
		IsLocked:    isLocked,
		IsCompleted: isCompleted,
		Grade:       grade,
	}, nil
}

// GetCourseLessonsWithStatus retrieves all lessons for a course with user-specific status
func GetCourseLessonsWithStatus(db *gorm.DB, courseID uuid.UUID, userID uuid.UUID) ([]LessonWithStatus, error) {
	var lessons []Lesson
	if err := db.Where("course_id = ?", courseID).Order("order_index ASC").Find(&lessons).Error; err != nil {
		return nil, err
	}

	result := make([]LessonWithStatus, len(lessons))
	for i, lesson := range lessons {
		isLocked, err := lesson.IsLocked(db, userID)
		if err != nil {
			return nil, err
		}

		isCompleted, err := lesson.IsCompleted(db, userID)
		if err != nil {
			return nil, err
		}

		var grade *float64
		if isCompleted {
			completion, err := lesson.GetCompletion(db, userID)
			if err == nil && completion.Grade != nil {
				grade = completion.Grade
			}
		}

		result[i] = LessonWithStatus{
			Lesson:      lesson,
			IsLocked:    isLocked,
			IsCompleted: isCompleted,
			Grade:       grade,
		}
	}

	return result, nil
}

// LessonCompletion tracks user progress on lessons
type LessonCompletion struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	UserID      uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_lesson_completion_user_lesson" json:"user_id"`
	LessonID    uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_lesson_completion_user_lesson;index:idx_lesson_completion_lesson" json:"lesson_id"`
	Grade       *float64  `gorm:"type:decimal(5,2)" json:"grade,omitempty"`
	CompletedAt time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"completed_at"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	// Relationships
	User   User   `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"user,omitempty"`
	Lesson Lesson `gorm:"foreignKey:LessonID;constraint:OnDelete:CASCADE" json:"lesson,omitempty"`
}

// TableName specifies the table name for the LessonCompletion model
func (LessonCompletion) TableName() string {
	return "lesson_completions"
}
