package services

import (
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/models"
	"gorm.io/gorm"
)

// EnrollmentService handles course enrollment business logic
type EnrollmentService struct {
	db *gorm.DB
}

// NewEnrollmentService creates a new enrollment service
func NewEnrollmentService(db *gorm.DB) *EnrollmentService {
	return &EnrollmentService{db: db}
}

// EnrollRequest represents a course enrollment request
type EnrollRequest struct {
	UserID       uuid.UUID
	CourseID     uuid.UUID
	PaymentToken *string // Optional payment token for paid courses
}

// GetEnrollmentRequest represents a request to get enrollment details
type GetEnrollmentRequest struct {
	UserID   uuid.UUID
	CourseID uuid.UUID
}

// ListEnrollmentsRequest represents a request to list user enrollments
type ListEnrollmentsRequest struct {
	UserID uuid.UUID
	Status string // "active", "completed", or "all"
	Page   int
	Limit  int
}

// EnrollmentProgressResponse represents enrollment progress details
type EnrollmentProgressResponse struct {
	EnrollmentID         uuid.UUID  `json:"enrollment_id"`
	CourseID             uuid.UUID  `json:"course_id"`
	CourseTitle          string     `json:"course_title"`
	CourseDifficulty     string     `json:"course_difficulty"`
	CompletionPercentage float64    `json:"completion_percentage"`
	AverageGrade         *float64   `json:"average_grade,omitempty"`
	CompletedLessons     int        `json:"completed_lessons"`
	TotalLessons         int        `json:"total_lessons"`
	EnrolledAt           time.Time  `json:"enrolled_at"`
	CompletedAt          *time.Time `json:"completed_at,omitempty"`
	CertificateID        *uuid.UUID `json:"certificate_id,omitempty"`
	HasCertificate       bool       `json:"has_certificate"`
}

// Enroll enrolls a user in a course
func (s *EnrollmentService) Enroll(req EnrollRequest) (*models.Enrollment, error) {
	// Check if user already enrolled
	isEnrolled, err := models.IsUserEnrolled(s.db, req.UserID, req.CourseID)
	if err != nil {
		return nil, fmt.Errorf("failed to check enrollment status: %w", err)
	}
	if isEnrolled {
		return nil, models.ErrAlreadyEnrolled
	}

	// Get course details
	var course models.Course
	if err := s.db.First(&course, req.CourseID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, models.ErrCourseNotFound
		}
		return nil, fmt.Errorf("failed to fetch course: %w", err)
	}

	// Check if course is published
	if !course.IsPublished() {
		return nil, models.ErrCourseNotPublished
	}

	// Handle payment for paid courses
	if !course.IsFree() {
		if req.PaymentToken == nil || *req.PaymentToken == "" {
			return nil, errors.New("payment token required for paid course")
		}

		// Validate payment token with Razorpay
		if err := s.validatePayment(*req.PaymentToken, course.Price); err != nil {
			return nil, fmt.Errorf("payment validation failed: %w", err)
		}
	}

	// Create enrollment
	enrollment := &models.Enrollment{
		UserID:               req.UserID,
		CourseID:             req.CourseID,
		CompletionPercentage: 0,
		EnrolledAt:           time.Now(),
	}

	if err := s.db.Create(enrollment).Error; err != nil {
		return nil, fmt.Errorf("failed to create enrollment: %w", err)
	}

	return enrollment, nil
}

// validatePayment validates payment with Razorpay
// Note: Mock implementation - actual Razorpay integration via PaymentManager in TransactionService
func (s *EnrollmentService) validatePayment(paymentToken string, amount float64) error {
	// Mock implementation for now
	// In production, verify the payment with Razorpay API
	if paymentToken == "invalid_token" {
		return errors.New("invalid payment token")
	}
	if paymentToken == "failed_payment" {
		return errors.New("payment processing failed")
	}
	// Simulate successful payment for valid tokens
	return nil
}

// GetEnrollment gets enrollment details with progress
func (s *EnrollmentService) GetEnrollment(req GetEnrollmentRequest) (*EnrollmentProgressResponse, error) {
	// Get enrollment first
	enrollment, err := models.GetUserEnrollment(s.db, req.UserID, req.CourseID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, models.ErrEnrollmentNotFound
		}
		return nil, fmt.Errorf("failed to fetch enrollment: %w", err)
	}

	// Get enrollment with statistics using enrollment ID
	statsEnrollment, err := models.GetEnrollmentWithStats(s.db, enrollment.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch enrollment stats: %w", err)
	}

	// Build response
	response := &EnrollmentProgressResponse{
		EnrollmentID:         statsEnrollment.ID,
		CourseID:             statsEnrollment.CourseID,
		CourseTitle:          statsEnrollment.CourseTitle,
		CourseDifficulty:     statsEnrollment.CourseDifficulty,
		CompletionPercentage: statsEnrollment.CompletionPercentage,
		CompletedLessons:     int(statsEnrollment.CompletedLessons),
		TotalLessons:         int(statsEnrollment.TotalLessons),
		EnrolledAt:           statsEnrollment.EnrolledAt,
		CompletedAt:          statsEnrollment.CompletedAt,
		CertificateID:        statsEnrollment.CertificateID,
		HasCertificate:       statsEnrollment.HasCertificate(),
	}

	// Add average grade if available
	if statsEnrollment.AverageGrade > 0 {
		response.AverageGrade = &statsEnrollment.AverageGrade
	}

	return response, nil
}

// ListEnrollments lists user enrollments with optional status filter
func (s *EnrollmentService) ListEnrollments(req ListEnrollmentsRequest) ([]EnrollmentProgressResponse, int64, error) {
	// Set defaults
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.Limit <= 0 {
		req.Limit = 20
	}
	if req.Status == "" {
		req.Status = "all"
	}

	// Get enrollments with status filter
	enrollments, err := models.GetUserEnrollments(s.db, req.UserID, req.Status)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to fetch enrollments: %w", err)
	}

	// Count total
	var total int64
	query := s.db.Model(&models.Enrollment{}).Where("user_id = ?", req.UserID)
	if req.Status == "active" {
		query = query.Where("completed_at IS NULL")
	} else if req.Status == "completed" {
		query = query.Where("completed_at IS NOT NULL")
	}
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count enrollments: %w", err)
	}

	// Convert to response format
	var responses []EnrollmentProgressResponse
	for _, enrollment := range enrollments {
		// Get full statistics for each enrollment using enrollment ID
		statsEnrollment, err := models.GetEnrollmentWithStats(s.db, enrollment.ID)
		if err != nil {
			continue // Skip enrollments with errors
		}

		response := EnrollmentProgressResponse{
			EnrollmentID:         statsEnrollment.ID,
			CourseID:             statsEnrollment.CourseID,
			CourseTitle:          statsEnrollment.CourseTitle,
			CourseDifficulty:     statsEnrollment.CourseDifficulty,
			CompletionPercentage: statsEnrollment.CompletionPercentage,
			CompletedLessons:     int(statsEnrollment.CompletedLessons),
			TotalLessons:         int(statsEnrollment.TotalLessons),
			EnrolledAt:           statsEnrollment.EnrolledAt,
			CompletedAt:          statsEnrollment.CompletedAt,
			CertificateID:        statsEnrollment.CertificateID,
			HasCertificate:       statsEnrollment.HasCertificate(),
		}

		if statsEnrollment.AverageGrade > 0 {
			response.AverageGrade = &statsEnrollment.AverageGrade
		}

		responses = append(responses, response)
	}

	return responses, total, nil
}

// UpdateProgress updates enrollment progress based on completed lessons
func (s *EnrollmentService) UpdateProgress(userID uuid.UUID, courseID uuid.UUID) error {
	// Get enrollment
	enrollment, err := models.GetUserEnrollment(s.db, userID, courseID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return models.ErrEnrollmentNotFound
		}
		return fmt.Errorf("failed to fetch enrollment: %w", err)
	}

	// Update progress
	if err := enrollment.UpdateProgress(s.db); err != nil {
		return fmt.Errorf("failed to update progress: %w", err)
	}

	return nil
}

// UpdateAverageGrade calculates and updates the average grade for an enrollment
func (s *EnrollmentService) UpdateAverageGrade(userID uuid.UUID, courseID uuid.UUID) error {
	// Get enrollment
	enrollment, err := models.GetUserEnrollment(s.db, userID, courseID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return models.ErrEnrollmentNotFound
		}
		return fmt.Errorf("failed to fetch enrollment: %w", err)
	}

	// Update average grade
	if err := enrollment.UpdateAverageGrade(s.db); err != nil {
		return fmt.Errorf("failed to update average grade: %w", err)
	}

	return nil
}

// CheckCompletion checks if an enrollment is complete and issues a certificate if eligible
func (s *EnrollmentService) CheckCompletion(userID uuid.UUID, courseID uuid.UUID) (*models.Certificate, error) {
	// Get enrollment
	enrollment, err := models.GetUserEnrollment(s.db, userID, courseID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, models.ErrEnrollmentNotFound
		}
		return nil, fmt.Errorf("failed to fetch enrollment: %w", err)
	}

	// Check if enrollment is complete
	if !enrollment.IsCompleted() {
		return nil, nil // Not complete yet, no error
	}

	// Check if certificate already issued
	if enrollment.HasCertificate() {
		// Get existing certificate
		var certificate models.Certificate
		if err := s.db.First(&certificate, enrollment.CertificateID).Error; err != nil {
			return nil, fmt.Errorf("failed to fetch existing certificate: %w", err)
		}
		return &certificate, nil
	}

	// Check if eligible for certificate (100% complete + 70%+ average grade)
	if enrollment.AverageGrade < 70 {
		return nil, nil // Not eligible yet, no error
	}

	// Issue certificate
	if err := enrollment.CheckAndIssueCertificate(s.db); err != nil {
		return nil, fmt.Errorf("failed to issue certificate: %w", err)
	}

	// Fetch newly created certificate
	if enrollment.CertificateID != nil {
		var certificate models.Certificate
		if err := s.db.First(&certificate, enrollment.CertificateID).Error; err != nil {
			return nil, fmt.Errorf("failed to fetch new certificate: %w", err)
		}
		return &certificate, nil
	}

	return nil, nil
}

// GetCourseEnrollments retrieves all enrollments for a specific course
func (s *EnrollmentService) GetCourseEnrollments(courseID uuid.UUID) ([]EnrollmentProgressResponse, error) {
	// Get all course enrollments
	enrollments, err := models.GetCourseEnrollments(s.db, courseID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch course enrollments: %w", err)
	}

	// Convert to response format
	var responses []EnrollmentProgressResponse
	for _, enrollment := range enrollments {
		// Get full statistics for each enrollment using enrollment ID
		statsEnrollment, err := models.GetEnrollmentWithStats(s.db, enrollment.ID)
		if err != nil {
			continue // Skip enrollments with errors
		}

		response := EnrollmentProgressResponse{
			EnrollmentID:         statsEnrollment.ID,
			CourseID:             statsEnrollment.CourseID,
			CourseTitle:          statsEnrollment.CourseTitle,
			CourseDifficulty:     statsEnrollment.CourseDifficulty,
			CompletionPercentage: statsEnrollment.CompletionPercentage,
			CompletedLessons:     int(statsEnrollment.CompletedLessons),
			TotalLessons:         int(statsEnrollment.TotalLessons),
			EnrolledAt:           statsEnrollment.EnrolledAt,
			CompletedAt:          statsEnrollment.CompletedAt,
			CertificateID:        statsEnrollment.CertificateID,
			HasCertificate:       statsEnrollment.HasCertificate(),
		}

		if statsEnrollment.AverageGrade > 0 {
			response.AverageGrade = &statsEnrollment.AverageGrade
		}

		responses = append(responses, response)
	}

	return responses, nil
}

// IsUserEnrolled checks if a user is enrolled in a course
func (s *EnrollmentService) IsUserEnrolled(userID uuid.UUID, courseID uuid.UUID) (bool, error) {
	return models.IsUserEnrolled(s.db, userID, courseID)
}
