package models

import (
	"errors"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Course-related errors
var (
	ErrInvalidDifficulty  = errors.New("invalid course difficulty level")
	ErrInvalidPrice       = errors.New("course price must be non-negative")
	ErrMissingTitle       = errors.New("course title is required")
	ErrCourseNotFound     = errors.New("course not found")
	ErrCourseNotPublished = errors.New("course is not published")
)

// ParseUUID parses a UUID string
func ParseUUID(s string) (uuid.UUID, error) {
	return uuid.Parse(s)
}

// CourseDifficulty represents the difficulty level of a course
type CourseDifficulty string

const (
	DifficultyBeginner     CourseDifficulty = "beginner"
	DifficultyIntermediate CourseDifficulty = "intermediate"
	DifficultyAdvanced     CourseDifficulty = "advanced"
)

// Course represents a learning course created by an instructor
type Course struct {
	ID           uuid.UUID        `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID     uuid.UUID        `gorm:"type:uuid;not null;index:idx_courses_tenant" json:"tenant_id"`
	InstructorID uuid.UUID        `gorm:"type:uuid;not null;index:idx_courses_instructor" json:"instructor_id"`
	Title        string           `gorm:"type:varchar(255);not null" json:"title"`
	Description  string           `gorm:"type:text" json:"description"`
	Difficulty   CourseDifficulty `gorm:"type:varchar(20);not null;index:idx_courses_difficulty" json:"difficulty"`
	Price        float64          `gorm:"type:decimal(10,2);not null;default:0" json:"price"`
	Published    bool             `gorm:"not null;default:false;index:idx_courses_published" json:"published"`
	CreatedAt    time.Time        `json:"created_at"`
	UpdatedAt    time.Time        `json:"updated_at"`
	DeletedAt    gorm.DeletedAt   `gorm:"index" json:"deleted_at,omitempty"`

	// Relationships
	Instructor  User         `gorm:"foreignKey:InstructorID;constraint:OnDelete:CASCADE" json:"instructor,omitempty"`
	Lessons     []Lesson     `gorm:"foreignKey:CourseID;constraint:OnDelete:CASCADE" json:"lessons,omitempty"`
	Enrollments []Enrollment `gorm:"foreignKey:CourseID;constraint:OnDelete:CASCADE" json:"enrollments,omitempty"`
}

// TableName specifies the table name for the Course model
func (Course) TableName() string {
	return "courses"
}

// BeforeCreate hook to validate course before creation
func (c *Course) BeforeCreate(tx *gorm.DB) error {
	// Validate difficulty
	if err := c.ValidateDifficulty(); err != nil {
		return err
	}

	// Validate price (must be non-negative)
	if c.Price < 0 {
		return ErrInvalidPrice
	}

	// Validate title
	if c.Title == "" {
		return ErrMissingTitle
	}

	return nil
}

// BeforeUpdate hook to validate course before update
func (c *Course) BeforeUpdate(tx *gorm.DB) error {
	// Validate difficulty if changed
	if err := c.ValidateDifficulty(); err != nil {
		return err
	}

	// Validate price (must be non-negative)
	if c.Price < 0 {
		return ErrInvalidPrice
	}

	// Validate title
	if c.Title == "" {
		return ErrMissingTitle
	}

	return nil
}

// ValidateDifficulty validates the course difficulty level
func (c *Course) ValidateDifficulty() error {
	switch c.Difficulty {
	case DifficultyBeginner, DifficultyIntermediate, DifficultyAdvanced:
		return nil
	default:
		return ErrInvalidDifficulty
	}
}

// IsFree checks if the course is free
func (c *Course) IsFree() bool {
	return c.Price == 0
}

// IsPublished checks if the course is published
func (c *Course) IsPublished() bool {
	return c.Published
}

// GetEnrollmentCount returns the number of enrollments for this course
func (c *Course) GetEnrollmentCount(db *gorm.DB) (int64, error) {
	var count int64
	err := db.Model(&Enrollment{}).Where("course_id = ?", c.ID).Count(&count).Error
	return count, err
}

// GetCompletionRate returns the average completion rate of all enrollments
func (c *Course) GetCompletionRate(db *gorm.DB) (float64, error) {
	var avgCompletion float64
	err := db.Model(&Enrollment{}).
		Where("course_id = ?", c.ID).
		Select("AVG(completion_percentage)").
		Scan(&avgCompletion).Error
	return avgCompletion, err
}

// GetLessonCount returns the number of lessons in this course
func (c *Course) GetLessonCount(db *gorm.DB) (int64, error) {
	var count int64
	err := db.Model(&Lesson{}).Where("course_id = ?", c.ID).Count(&count).Error
	return count, err
}

// CourseWithStats includes course data with enrollment statistics
type CourseWithStats struct {
	Course
	EnrollmentCount int64   `json:"enrollment_count"`
	CompletionRate  float64 `json:"completion_rate"`
	LessonCount     int64   `json:"lesson_count"`
}

// GetCourseWithStats retrieves course with statistics
func GetCourseWithStats(db *gorm.DB, courseID uuid.UUID) (*CourseWithStats, error) {
	var course Course
	if err := db.First(&course, "id = ?", courseID).Error; err != nil {
		return nil, err
	}

	enrollmentCount, err := course.GetEnrollmentCount(db)
	if err != nil {
		return nil, err
	}

	completionRate, err := course.GetCompletionRate(db)
	if err != nil {
		return nil, err
	}

	lessonCount, err := course.GetLessonCount(db)
	if err != nil {
		return nil, err
	}

	return &CourseWithStats{
		Course:          course,
		EnrollmentCount: enrollmentCount,
		CompletionRate:  completionRate,
		LessonCount:     lessonCount,
	}, nil
}
