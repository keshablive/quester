package service

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/models"
	"gorm.io/gorm"
)

// CourseService handles business logic for courses
type CourseService struct {
	db           *gorm.DB
	cacheService *CacheService
}

// NewCourseService creates a new course service
func NewCourseService(db *gorm.DB) *CourseService {
	return &CourseService{db: db}
}

// NewCourseServiceWithCache creates a new course service with caching support (007-api-performance-caching T015)
func NewCourseServiceWithCache(db *gorm.DB, cacheService *CacheService) *CourseService {
	return &CourseService{db: db, cacheService: cacheService}
}

// CreateCourseRequest contains data for creating a course
type CreateCourseRequest struct {
	TenantID     string    `json:"tenant_id"`
	InstructorID uuid.UUID `json:"instructor_id"`
	Title        string    `json:"title" validate:"required"`
	Description  string    `json:"description"`
	Difficulty   string    `json:"difficulty" validate:"required,oneof=beginner intermediate advanced"`
	Price        float64   `json:"price" validate:"min=0"`
}

// Create creates a new course
func (s *CourseService) Create(req *CreateCourseRequest) (*models.Course, error) {
	// Validate instructor exists and has instructor role
	var instructor models.User
	if err := s.db.First(&instructor, "id = ?", req.InstructorID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("instructor not found")
		}
		return nil, err
	}

	if instructor.Role != models.RoleInstructor {
		return nil, errors.New("user is not an instructor")
	}

	// Parse tenant ID
	tenantID, err := models.ParseUUID(req.TenantID)
	if err != nil {
		return nil, errors.New("invalid tenant ID")
	}

	// Create course
	course := &models.Course{
		TenantID:     tenantID,
		InstructorID: req.InstructorID,
		Title:        req.Title,
		Description:  req.Description,
		Difficulty:   models.CourseDifficulty(req.Difficulty),
		Price:        req.Price,
		Published:    false, // Courses start as unpublished
	}

	if err := s.db.Create(course).Error; err != nil {
		return nil, err
	}

	// Invalidate course list cache for this tenant (007-api-performance-caching T016)
	if s.cacheService != nil {
		_ = s.cacheService.InvalidateCourseList(context.Background(), tenantID)
	}

	return course, nil
}

// GetByID retrieves a course by ID with optional caching (007-api-performance-caching T015)
func (s *CourseService) GetByID(courseID uuid.UUID) (*models.Course, error) {
	return s.GetByIDWithTenant(context.Background(), uuid.Nil, courseID)
}

// GetByIDWithTenant retrieves a course by ID with tenant-scoped caching (007-api-performance-caching T015)
func (s *CourseService) GetByIDWithTenant(ctx context.Context, tenantID, courseID uuid.UUID) (*models.Course, error) {
	// Try cache first if available and tenant is specified
	if s.cacheService != nil && tenantID != uuid.Nil {
		if cached, found, err := s.cacheService.GetCourse(ctx, tenantID, courseID); err == nil && found {
			return cached, nil
		}
		// On cache miss or error, fall through to database
	}

	var course models.Course
	err := s.db.Preload("Instructor").
		Preload("Lessons").
		First(&course, "id = ?", courseID).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, models.ErrCourseNotFound
		}
		return nil, err
	}

	// Cache the result if caching is available
	if s.cacheService != nil && course.TenantID != uuid.Nil {
		_ = s.cacheService.SetCourse(ctx, course.TenantID, &course)
	}

	return &course, nil
}

// GetWithLessons retrieves a course with all its lessons ordered
func (s *CourseService) GetWithLessons(courseID uuid.UUID) (*models.Course, error) {
	var course models.Course
	err := s.db.Preload("Instructor").
		Preload("Lessons", func(db *gorm.DB) *gorm.DB {
			return db.Order("order_index ASC")
		}).
		First(&course, "id = ?", courseID).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, models.ErrCourseNotFound
		}
		return nil, err
	}

	return &course, nil
}

// GetWithStats retrieves a course with enrollment and completion statistics
func (s *CourseService) GetWithStats(courseID uuid.UUID) (*models.CourseWithStats, error) {
	return models.GetCourseWithStats(s.db, courseID)
}

// ListCoursesRequest contains filters for listing courses
type ListCoursesRequest struct {
	TenantID   string `json:"tenant_id"`
	Difficulty string `json:"difficulty,omitempty"`
	Published  *bool  `json:"published,omitempty"`
	Page       int    `json:"page"`
	Limit      int    `json:"limit"`
}

// ListCourses retrieves courses with pagination and filters
func (s *CourseService) ListCourses(req *ListCoursesRequest) ([]models.Course, int64, error) {
	query := s.db.Model(&models.Course{}).Preload("Instructor")

	// Apply tenant filter
	if req.TenantID != "" {
		tenantID, err := models.ParseUUID(req.TenantID)
		if err != nil {
			return nil, 0, errors.New("invalid tenant ID")
		}
		query = query.Where("tenant_id = ?", tenantID)
	}

	// Apply difficulty filter
	if req.Difficulty != "" {
		query = query.Where("difficulty = ?", req.Difficulty)
	}

	// Apply published filter
	if req.Published != nil {
		query = query.Where("published = ?", *req.Published)
	}

	// Count total
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Apply pagination
	if req.Page < 1 {
		req.Page = 1
	}
	if req.Limit < 1 || req.Limit > 100 {
		req.Limit = 20
	}
	offset := (req.Page - 1) * req.Limit

	// Fetch courses
	var courses []models.Course
	err := query.Offset(offset).
		Limit(req.Limit).
		Order("created_at DESC").
		Find(&courses).Error

	if err != nil {
		return nil, 0, err
	}

	return courses, total, nil
}

// UpdateCourseRequest contains data for updating a course
type UpdateCourseRequest struct {
	Title       *string  `json:"title,omitempty"`
	Description *string  `json:"description,omitempty"`
	Difficulty  *string  `json:"difficulty,omitempty" validate:"omitempty,oneof=beginner intermediate advanced"`
	Price       *float64 `json:"price,omitempty" validate:"omitempty,min=0"`
	Published   *bool    `json:"published,omitempty"`
}

// Update updates a course
func (s *CourseService) Update(courseID uuid.UUID, req *UpdateCourseRequest) (*models.Course, error) {
	course, err := s.GetByID(courseID)
	if err != nil {
		return nil, err
	}

	// Update fields if provided
	if req.Title != nil {
		course.Title = *req.Title
	}
	if req.Description != nil {
		course.Description = *req.Description
	}
	if req.Difficulty != nil {
		course.Difficulty = models.CourseDifficulty(*req.Difficulty)
	}
	if req.Price != nil {
		course.Price = *req.Price
	}
	if req.Published != nil {
		course.Published = *req.Published
	}

	if err := s.db.Save(course).Error; err != nil {
		return nil, err
	}

	// Invalidate cache for this course and list (007-api-performance-caching T016)
	if s.cacheService != nil && course.TenantID != uuid.Nil {
		_ = s.cacheService.InvalidateCourse(context.Background(), course.TenantID, course.ID)
		_ = s.cacheService.InvalidateCourseList(context.Background(), course.TenantID)
	}

	return course, nil
}

// Publish publishes a course (makes it available for enrollment)
func (s *CourseService) Publish(courseID uuid.UUID) (*models.Course, error) {
	course, err := s.GetByID(courseID)
	if err != nil {
		return nil, err
	}

	// Validate course has at least one lesson
	var lessonCount int64
	if err := s.db.Model(&models.Lesson{}).Where("course_id = ?", courseID).Count(&lessonCount).Error; err != nil {
		return nil, err
	}

	if lessonCount == 0 {
		return nil, errors.New("cannot publish course with no lessons")
	}

	// Publish course
	course.Published = true
	if err := s.db.Save(course).Error; err != nil {
		return nil, err
	}

	return course, nil
}

// Unpublish unpublishes a course
func (s *CourseService) Unpublish(courseID uuid.UUID) (*models.Course, error) {
	course, err := s.GetByID(courseID)
	if err != nil {
		return nil, err
	}

	course.Published = false
	if err := s.db.Save(course).Error; err != nil {
		return nil, err
	}

	return course, nil
}

// Delete soft deletes a course (007-api-performance-caching T016)
func (s *CourseService) Delete(courseID uuid.UUID) error {
	return s.DeleteWithTenant(context.Background(), uuid.Nil, courseID)
}

// DeleteWithTenant soft deletes a course with cache invalidation (007-api-performance-caching T016)
func (s *CourseService) DeleteWithTenant(ctx context.Context, tenantID, courseID uuid.UUID) error {
	// Get course first to retrieve tenantID if not provided
	if tenantID == uuid.Nil {
		var course models.Course
		if err := s.db.First(&course, "id = ?", courseID).Error; err == nil {
			tenantID = course.TenantID
		}
	}

	if err := s.db.Delete(&models.Course{}, courseID).Error; err != nil {
		return err
	}

	// Invalidate cache (007-api-performance-caching T016)
	if s.cacheService != nil && tenantID != uuid.Nil {
		_ = s.cacheService.InvalidateCourse(ctx, tenantID, courseID)
		_ = s.cacheService.InvalidateCourseList(ctx, tenantID)
	}

	return nil
}

// GetInstructorCourses retrieves all courses by an instructor
func (s *CourseService) GetInstructorCourses(instructorID uuid.UUID) ([]models.Course, error) {
	var courses []models.Course
	err := s.db.Where("instructor_id = ?", instructorID).
		Order("created_at DESC").
		Find(&courses).Error

	if err != nil {
		return nil, err
	}

	return courses, nil
}

// CanUserEditCourse checks if a user can edit a course
func (s *CourseService) CanUserEditCourse(userID uuid.UUID, courseID uuid.UUID) (bool, error) {
	var course models.Course
	if err := s.db.First(&course, courseID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, models.ErrCourseNotFound
		}
		return false, err
	}

	// User can edit if they are the instructor
	return course.InstructorID == userID, nil
}

// GetEnrollmentStats retrieves enrollment statistics for a course
func (s *CourseService) GetEnrollmentStats(courseID uuid.UUID) (map[string]interface{}, error) {
	var stats struct {
		TotalEnrollments     int64   `json:"total_enrollments"`
		ActiveEnrollments    int64   `json:"active_enrollments"`
		CompletedEnrollments int64   `json:"completed_enrollments"`
		AverageCompletion    float64 `json:"average_completion"`
		AverageGrade         float64 `json:"average_grade"`
	}

	// Total enrollments
	s.db.Model(&models.Enrollment{}).
		Where("course_id = ?", courseID).
		Count(&stats.TotalEnrollments)

	// Active enrollments
	s.db.Model(&models.Enrollment{}).
		Where("course_id = ? AND completed_at IS NULL", courseID).
		Count(&stats.ActiveEnrollments)

	// Completed enrollments
	s.db.Model(&models.Enrollment{}).
		Where("course_id = ? AND completed_at IS NOT NULL", courseID).
		Count(&stats.CompletedEnrollments)

	// Average completion percentage
	s.db.Model(&models.Enrollment{}).
		Where("course_id = ?", courseID).
		Select("COALESCE(AVG(completion_percentage), 0)").
		Scan(&stats.AverageCompletion)

	// Average grade
	s.db.Model(&models.Enrollment{}).
		Where("course_id = ? AND average_grade > 0", courseID).
		Select("COALESCE(AVG(average_grade), 0)").
		Scan(&stats.AverageGrade)

	return map[string]interface{}{
		"total_enrollments":     stats.TotalEnrollments,
		"active_enrollments":    stats.ActiveEnrollments,
		"completed_enrollments": stats.CompletedEnrollments,
		"average_completion":    stats.AverageCompletion,
		"average_grade":         stats.AverageGrade,
	}, nil
}
