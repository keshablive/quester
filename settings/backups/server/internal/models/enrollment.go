package models

import (
	"errors"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Enrollment-related errors
var (
	ErrAlreadyEnrolled    = errors.New("user is already enrolled in this course")
	ErrEnrollmentNotFound = errors.New("enrollment not found")
	ErrCourseNotAvailable = errors.New("course is not available for enrollment")
	ErrPaymentRequired    = errors.New("payment required for paid course")
)

// Enrollment represents a user's enrollment in a course
type Enrollment struct {
	ID                   uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID               uuid.UUID  `gorm:"type:uuid;not null;uniqueIndex:idx_enrollment_user_course;index:idx_enrollments_user" json:"user_id"`
	CourseID             uuid.UUID  `gorm:"type:uuid;not null;uniqueIndex:idx_enrollment_user_course;index:idx_enrollments_course" json:"course_id"`
	CompletionPercentage float64    `gorm:"type:decimal(5,2);not null;default:0" json:"completion_percentage"`
	AverageGrade         float64    `gorm:"type:decimal(5,2);not null;default:0" json:"average_grade"`
	EnrolledAt           time.Time  `gorm:"not null;default:CURRENT_TIMESTAMP" json:"enrolled_at"`
	CompletedAt          *time.Time `json:"completed_at,omitempty"`
	CertificateID        *uuid.UUID `gorm:"type:uuid;index:idx_enrollments_certificate" json:"certificate_id,omitempty"`
	CreatedAt            time.Time  `json:"created_at"`
	UpdatedAt            time.Time  `json:"updated_at"`

	// Relationships
	User        User         `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"user,omitempty"`
	Course      Course       `gorm:"foreignKey:CourseID;constraint:OnDelete:CASCADE" json:"course,omitempty"`
	Certificate *Certificate `gorm:"foreignKey:CertificateID" json:"certificate,omitempty"`
}

// TableName specifies the table name for the Enrollment model
func (Enrollment) TableName() string {
	return "enrollments"
}

// IsCompleted checks if the enrollment is completed
func (e *Enrollment) IsCompleted() bool {
	return e.CompletionPercentage >= 100
}

// HasCertificate checks if a certificate has been issued
func (e *Enrollment) HasCertificate() bool {
	return e.CertificateID != nil
}

// UpdateProgress updates the completion percentage based on completed lessons
func (e *Enrollment) UpdateProgress(db *gorm.DB) error {
	// Get total number of lessons in the course
	var totalLessons int64
	if err := db.Model(&Lesson{}).Where("course_id = ?", e.CourseID).Count(&totalLessons).Error; err != nil {
		return err
	}

	if totalLessons == 0 {
		e.CompletionPercentage = 0
		return db.Save(e).Error
	}

	// Get number of completed lessons
	var completedLessons int64
	err := db.Model(&LessonCompletion{}).
		Joins("JOIN lessons ON lesson_completions.lesson_id = lessons.id").
		Where("lesson_completions.user_id = ? AND lessons.course_id = ?", e.UserID, e.CourseID).
		Count(&completedLessons).Error
	if err != nil {
		return err
	}

	// Calculate completion percentage
	e.CompletionPercentage = (float64(completedLessons) / float64(totalLessons)) * 100

	return db.Save(e).Error
}

// UpdateAverageGrade updates the average grade based on graded lessons
func (e *Enrollment) UpdateAverageGrade(db *gorm.DB) error {
	// Calculate average grade from lesson completions with grades
	var avgGrade float64
	err := db.Model(&LessonCompletion{}).
		Joins("JOIN lessons ON lesson_completions.lesson_id = lessons.id").
		Where("lesson_completions.user_id = ? AND lessons.course_id = ? AND lesson_completions.grade IS NOT NULL", e.UserID, e.CourseID).
		Select("COALESCE(AVG(lesson_completions.grade), 0)").
		Scan(&avgGrade).Error

	if err != nil {
		return err
	}

	e.AverageGrade = avgGrade
	return db.Save(e).Error
}

// CheckAndIssueCertificate checks if certificate should be issued and issues it
func (e *Enrollment) CheckAndIssueCertificate(db *gorm.DB) error {
	// Certificate is issued when:
	// 1. Course is 100% complete
	// 2. Average grade is >= 70%
	// 3. Certificate hasn't been issued yet

	if !e.IsCompleted() {
		return nil // Not complete yet
	}

	if e.AverageGrade < 70 {
		return nil // Grade too low
	}

	if e.HasCertificate() {
		return nil // Certificate already issued
	}

	// Mark as completed
	if e.CompletedAt == nil {
		now := time.Now()
		e.CompletedAt = &now
	}

	// Issue certificate
	certificate := &Certificate{
		UserID:           e.UserID,
		CourseID:         e.CourseID,
		VerificationCode: GenerateVerificationCode(),
		IssuedAt:         time.Now(),
	}

	if err := db.Create(certificate).Error; err != nil {
		return err
	}

	// Link certificate to enrollment
	e.CertificateID = &certificate.ID
	return db.Save(e).Error
}

// GetEnrollmentWithDetails retrieves enrollment with course and certificate details
func GetEnrollmentWithDetails(db *gorm.DB, enrollmentID uuid.UUID) (*Enrollment, error) {
	var enrollment Enrollment
	err := db.Preload("Course").
		Preload("Certificate").
		First(&enrollment, enrollmentID).Error
	if err != nil {
		return nil, err
	}
	return &enrollment, nil
}

// GetUserEnrollment retrieves a user's enrollment for a specific course
func GetUserEnrollment(db *gorm.DB, userID uuid.UUID, courseID uuid.UUID) (*Enrollment, error) {
	var enrollment Enrollment
	err := db.Where("user_id = ? AND course_id = ?", userID, courseID).First(&enrollment).Error
	if err != nil {
		return nil, err
	}
	return &enrollment, nil
}

// IsUserEnrolled checks if a user is enrolled in a course
func IsUserEnrolled(db *gorm.DB, userID uuid.UUID, courseID uuid.UUID) (bool, error) {
	var count int64
	err := db.Model(&Enrollment{}).
		Where("user_id = ? AND course_id = ?", userID, courseID).
		Count(&count).Error
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// GetUserEnrollments retrieves all enrollments for a user
func GetUserEnrollments(db *gorm.DB, userID uuid.UUID, status string) ([]Enrollment, error) {
	var enrollments []Enrollment
	query := db.Preload("Course").Where("user_id = ?", userID)

	switch status {
	case "active":
		query = query.Where("completed_at IS NULL")
	case "completed":
		query = query.Where("completed_at IS NOT NULL")
		// "all" or empty string returns everything
	}

	err := query.Order("enrolled_at DESC").Find(&enrollments).Error
	if err != nil {
		return nil, err
	}

	return enrollments, nil
}

// GetCourseEnrollments retrieves all enrollments for a course
func GetCourseEnrollments(db *gorm.DB, courseID uuid.UUID) ([]Enrollment, error) {
	var enrollments []Enrollment
	err := db.Preload("User").
		Where("course_id = ?", courseID).
		Order("enrolled_at DESC").
		Find(&enrollments).Error
	if err != nil {
		return nil, err
	}
	return enrollments, nil
}

// EnrollmentWithStats includes enrollment data with additional statistics
type EnrollmentWithStats struct {
	Enrollment
	CompletedLessons int64  `json:"completed_lessons"`
	TotalLessons     int64  `json:"total_lessons"`
	CourseDifficulty string `json:"course_difficulty"`
	CourseTitle      string `json:"course_title"`
}

// GetEnrollmentWithStats retrieves enrollment with statistics
func GetEnrollmentWithStats(db *gorm.DB, enrollmentID uuid.UUID) (*EnrollmentWithStats, error) {
	var enrollment Enrollment
	if err := db.Preload("Course").First(&enrollment, enrollmentID).Error; err != nil {
		return nil, err
	}

	// Get total lessons
	var totalLessons int64
	if err := db.Model(&Lesson{}).Where("course_id = ?", enrollment.CourseID).Count(&totalLessons).Error; err != nil {
		return nil, err
	}

	// Get completed lessons
	var completedLessons int64
	err := db.Model(&LessonCompletion{}).
		Joins("JOIN lessons ON lesson_completions.lesson_id = lessons.id").
		Where("lesson_completions.user_id = ? AND lessons.course_id = ?", enrollment.UserID, enrollment.CourseID).
		Count(&completedLessons).Error
	if err != nil {
		return nil, err
	}

	return &EnrollmentWithStats{
		Enrollment:       enrollment,
		CompletedLessons: completedLessons,
		TotalLessons:     totalLessons,
		CourseDifficulty: string(enrollment.Course.Difficulty),
		CourseTitle:      enrollment.Course.Title,
	}, nil
}

// CreateEnrollment creates a new enrollment for a user in a course
func CreateEnrollment(db *gorm.DB, userID uuid.UUID, courseID uuid.UUID) (*Enrollment, error) {
	// Check if already enrolled
	enrolled, err := IsUserEnrolled(db, userID, courseID)
	if err != nil {
		return nil, err
	}
	if enrolled {
		return nil, ErrAlreadyEnrolled
	}

	// Check if course exists and is published
	var course Course
	if err := db.First(&course, courseID).Error; err != nil {
		return nil, ErrCourseNotAvailable
	}

	if !course.Published {
		return nil, ErrCourseNotAvailable
	}

	// TODO: Check payment for paid courses
	// if !course.IsFree() {
	//     return nil, ErrPaymentRequired
	// }

	// Create enrollment
	enrollment := &Enrollment{
		UserID:   userID,
		CourseID: courseID,
	}

	if err := db.Create(enrollment).Error; err != nil {
		return nil, err
	}

	return enrollment, nil
}
