package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/yourusername/quester/internal/models"

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

	return &course, err
}

// Create creates a new course
func (r *CourseRepository) Create(ctx context.Context, course *models.Course) error {
	return r.db.WithContext(ctx).Create(course).Error
}

// Update updates a course
func (r *CourseRepository) Update(ctx context.Context, course *models.Course, updates map[string]interface{}) error {
	return r.db.WithContext(ctx).Model(course).Updates(updates).Error
}

// Delete soft deletes a course
func (r *CourseRepository) Delete(ctx context.Context, course *models.Course) error {
	return r.db.WithContext(ctx).Delete(course).Error
}
