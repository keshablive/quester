// Package services defines service layer interfaces for the Quester platform.
package services

import (
	"context"

	"github.com/google/uuid"
)

// CourseServiceInterface defines the contract for course management operations.
// Implementations handle course CRUD, enrollments, and progress tracking.
type CourseServiceInterface interface {
	// GetCourse retrieves a course by ID.
	// Returns course on success, error if not found.
	GetCourse(ctx context.Context, tenantID, courseID uuid.UUID) (*Course, error)

	// GetCourses retrieves courses with optional filtering and pagination.
	// Returns paginated course list.
	GetCourses(ctx context.Context, tenantID uuid.UUID, filters *CourseFilters) (*CourseListResponse, error)

	// CreateCourse creates a new course.
	// Returns created course on success.
	CreateCourse(ctx context.Context, tenantID uuid.UUID, input *CreateCourseInput) (*Course, error)

	// UpdateCourse updates course information.
	// Returns updated course on success.
	UpdateCourse(ctx context.Context, tenantID, courseID uuid.UUID, input *UpdateCourseInput) (*Course, error)

	// DeleteCourse soft-deletes a course.
	// Returns error if course not found or has active enrollments.
	DeleteCourse(ctx context.Context, tenantID, courseID uuid.UUID) error

	// EnrollUser enrolls a user in a course.
	// Returns enrollment record on success.
	EnrollUser(ctx context.Context, tenantID, userID, courseID uuid.UUID) (*Enrollment, error)

	// GetUserEnrollments retrieves courses a user is enrolled in.
	// Returns list of enrollments with course details.
	GetUserEnrollments(ctx context.Context, tenantID, userID uuid.UUID) ([]*Enrollment, error)

	// GetCourseProgress retrieves user's progress in a course.
	// Returns progress details including completed lessons.
	GetCourseProgress(ctx context.Context, tenantID, userID, courseID uuid.UUID) (*CourseProgress, error)

	// UpdateProgress updates user's progress in a course.
	// Called when user completes a lesson or assessment.
	UpdateProgress(ctx context.Context, tenantID, userID, courseID uuid.UUID, input *UpdateProgressInput) (*CourseProgress, error)
}

// Course represents a learning course.
type Course struct {
	ID          uuid.UUID `json:"id"`
	TenantID    uuid.UUID `json:"tenant_id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	ImageURL    string    `json:"image_url"`
	Duration    int       `json:"duration_minutes"`
	Level       string    `json:"level"`
	Category    string    `json:"category"`
	Published   bool      `json:"published"`
	CreatedAt   string    `json:"created_at"`
	UpdatedAt   string    `json:"updated_at"`
}

// CourseFilters contains filtering options for course queries.
type CourseFilters struct {
	Search    string `json:"search"`
	Category  string `json:"category"`
	Level     string `json:"level"`
	Published *bool  `json:"published"`
	Page      int    `json:"page"`
	Limit     int    `json:"limit"`
}

// CourseListResponse contains paginated course results.
type CourseListResponse struct {
	Courses    []*Course `json:"courses"`
	TotalCount int64     `json:"total_count"`
	Page       int       `json:"page"`
	Limit      int       `json:"limit"`
}

// CreateCourseInput contains data for creating a course.
type CreateCourseInput struct {
	Title       string `json:"title" validate:"required"`
	Description string `json:"description"`
	ImageURL    string `json:"image_url"`
	Duration    int    `json:"duration_minutes"`
	Level       string `json:"level"`
	Category    string `json:"category"`
}

// UpdateCourseInput contains fields that can be updated on a course.
type UpdateCourseInput struct {
	Title       *string `json:"title"`
	Description *string `json:"description"`
	ImageURL    *string `json:"image_url"`
	Duration    *int    `json:"duration_minutes"`
	Level       *string `json:"level"`
	Category    *string `json:"category"`
	Published   *bool   `json:"published"`
}

// Enrollment represents a user's enrollment in a course.
type Enrollment struct {
	ID         uuid.UUID `json:"id"`
	TenantID   uuid.UUID `json:"tenant_id"`
	UserID     uuid.UUID `json:"user_id"`
	CourseID   uuid.UUID `json:"course_id"`
	Course     *Course   `json:"course,omitempty"`
	EnrolledAt string    `json:"enrolled_at"`
	Status     string    `json:"status"`
}

// CourseProgress represents user's progress in a course.
type CourseProgress struct {
	EnrollmentID     uuid.UUID `json:"enrollment_id"`
	CourseID         uuid.UUID `json:"course_id"`
	UserID           uuid.UUID `json:"user_id"`
	PercentComplete  int       `json:"percent_complete"`
	LessonsCompleted int       `json:"lessons_completed"`
	TotalLessons     int       `json:"total_lessons"`
	LastAccessedAt   string    `json:"last_accessed_at"`
}

// UpdateProgressInput contains data for updating course progress.
type UpdateProgressInput struct {
	LessonID    uuid.UUID `json:"lesson_id" validate:"required"`
	Completed   bool      `json:"completed"`
	TimeSpentMs int64     `json:"time_spent_ms"`
}
