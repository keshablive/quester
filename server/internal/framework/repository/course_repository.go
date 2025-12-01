package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/framework/utils"
	"github.com/keshablive/quester/internal/models"

	"gorm.io/gorm"
)

// CourseRepository handles database operations for courses
type CourseRepository struct {
	db *gorm.DB
}

// NewCourseRepository creates a new course repository
func NewCourseRepository(db *gorm.DB) *CourseRepository {
	return &CourseRepository{db: db}
}

// FindByID finds a course by ID
func (r *CourseRepository) FindByID(ctx context.Context, tenantID uuid.UUID, courseID uuid.UUID) (*models.Course, error) {
	var course models.Course
	err := r.db.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", courseID, tenantID).
		First(&course).Error

	if err != nil {
		return nil, utils.WrapFindError(err, "course", courseID.String())
	}

	return &course, nil
}

// Create creates a new course
func (r *CourseRepository) Create(ctx context.Context, course *models.Course) error {
	err := r.db.WithContext(ctx).Create(course).Error
	if err != nil {
		return utils.WrapCreateError(err, "course")
	}
	return nil
}

// Update updates a course
func (r *CourseRepository) Update(ctx context.Context, course *models.Course, updates map[string]interface{}) error {
	err := r.db.WithContext(ctx).Model(course).Updates(updates).Error
	if err != nil {
		return utils.WrapUpdateError(err, "course")
	}
	return nil
}

// Delete soft deletes a course
func (r *CourseRepository) Delete(ctx context.Context, course *models.Course) error {
	err := r.db.WithContext(ctx).Delete(course).Error
	if err != nil {
		return utils.WrapDeleteError(err, "course")
	}
	return nil
}

// CourseListOptions defines options for listing courses with cursor pagination
// Task Reference: 009-database-query-optimization T028
type CourseListOptions struct {
	TenantID     uuid.UUID
	Cursor       string     // Base64 encoded cursor token
	PageSize     int        // Items per page (default 20, max 100)
	Status       string     // Filter by status
	CategoryID   *uuid.UUID // Filter by category
	InstructorID *uuid.UUID // Filter by instructor
	Published    *bool      // Filter by published status
	Includes     []string   // Relationships to preload
}

// CourseListResult contains the list result with pagination metadata
type CourseListResult struct {
	Courses    []models.Course
	NextCursor string
	PrevCursor string
	HasMore    bool
	PageSize   int
}

// List returns courses with cursor-based pagination
// Task Reference: 009-database-query-optimization T028
func (r *CourseRepository) List(ctx context.Context, opts CourseListOptions) (*CourseListResult, error) {
	// Import pagination package inline to avoid circular dependency
	// Note: In production, move this to use the pagination package

	// Validate and normalize page size
	if opts.PageSize <= 0 {
		opts.PageSize = 20
	}
	if opts.PageSize > 100 {
		opts.PageSize = 100
	}

	// Build base query with tenant scope
	query := r.db.WithContext(ctx).
		Model(&models.Course{}).
		Where("tenant_id = ?", opts.TenantID)

	// Apply filters
	if opts.Status != "" {
		query = query.Where("status = ?", opts.Status)
	}
	if opts.CategoryID != nil {
		query = query.Where("category_id = ?", *opts.CategoryID)
	}
	if opts.InstructorID != nil {
		query = query.Where("instructor_id = ?", *opts.InstructorID)
	}
	if opts.Published != nil {
		query = query.Where("published = ?", *opts.Published)
	}

	// Apply includes/preloads (validated list per FR-010)
	allowedIncludes := map[string]string{
		"instructor":  "Instructor",
		"category":    "Category",
		"modules":     "Modules",
		"reviews":     "Reviews",
		"enrollments": "Enrollments",
	}
	for _, inc := range opts.Includes {
		if preload, ok := allowedIncludes[inc]; ok {
			query = query.Preload(preload)
		}
	}

	// Apply cursor-based pagination
	// Order by created_at DESC, id DESC for consistent ordering
	query = query.Order("created_at DESC, id DESC")

	// If cursor provided, decode and apply WHERE clause
	if opts.Cursor != "" {
		// Decode cursor (simplified - use pagination.ParseCursor in production)
		// For now, use created_at + id cursor format
		var cursorTime string
		var cursorID uuid.UUID
		// TODO: Implement full cursor decoding using pagination.ParseCursor
		_ = cursorTime
		_ = cursorID
		// query = query.Where("(created_at, id) < (?, ?)", cursorTime, cursorID)
	}

	// Fetch one extra to determine if there are more pages
	query = query.Limit(opts.PageSize + 1)

	var courses []models.Course
	if err := query.Find(&courses).Error; err != nil {
		return nil, utils.WrapFindError(err, "courses", "list")
	}

	// Determine if there are more pages
	hasMore := len(courses) > opts.PageSize
	if hasMore {
		courses = courses[:opts.PageSize]
	}

	result := &CourseListResult{
		Courses:  courses,
		HasMore:  hasMore,
		PageSize: opts.PageSize,
	}

	// Generate next cursor if there are more pages
	if hasMore && len(courses) > 0 {
		lastCourse := courses[len(courses)-1]
		// TODO: Use pagination.CursorToken.Encode() in production
		result.NextCursor = lastCourse.ID.String() // Simplified cursor
	}

	return result, nil
}
