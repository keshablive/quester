package models

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Certificate-related errors
var (
	ErrCertificateNotFound      = errors.New("certificate not found")
	ErrInvalidVerificationCode  = errors.New("invalid verification code")
	ErrCertificateAlreadyIssued = errors.New("certificate already issued for this enrollment")
)

// Certificate represents a course completion certificate
type Certificate struct {
	ID               uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID           uuid.UUID `gorm:"type:uuid;not null;index:idx_certificates_user" json:"user_id"`
	CourseID         uuid.UUID `gorm:"type:uuid;not null;index:idx_certificates_course" json:"course_id"`
	VerificationCode string    `gorm:"type:varchar(100);not null;uniqueIndex:idx_certificates_code" json:"verification_code"`
	CertificateURL   string    `gorm:"type:varchar(500)" json:"certificate_url,omitempty"`
	IssuedAt         time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"issued_at"`

	// Enrollment metadata (denormalized for certificate display)
	AverageGrade     *float64   `gorm:"type:decimal(5,2)" json:"average_grade,omitempty"`
	CompletedAt      *time.Time `gorm:"type:timestamp" json:"completed_at,omitempty"`
	InstructorID     *uuid.UUID `gorm:"type:uuid;index:idx_certificates_instructor" json:"instructor_id,omitempty"`
	CourseDifficulty *string    `gorm:"type:varchar(20)" json:"course_difficulty,omitempty"`
	CourseTitle      *string    `gorm:"type:varchar(255)" json:"course_title,omitempty"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// Relationships
	User       User   `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"user,omitempty"`
	Course     Course `gorm:"foreignKey:CourseID;constraint:OnDelete:CASCADE" json:"course,omitempty"`
	Instructor *User  `gorm:"foreignKey:InstructorID;constraint:OnDelete:SET NULL" json:"instructor,omitempty"`
}

// TableName specifies the table name for the Certificate model
func (Certificate) TableName() string {
	return "certificates"
}

// BeforeCreate hook to generate verification code if not set
func (c *Certificate) BeforeCreate(tx *gorm.DB) error {
	if c.VerificationCode == "" {
		c.VerificationCode = GenerateVerificationCode()
	}
	return nil
}

// GenerateVerificationCode generates a unique verification code for certificates
func GenerateVerificationCode() string {
	// Generate a random UUID-like code
	// Format: CERT-YYYYMMDD-XXXXXXXX
	dateStr := time.Now().Format("20060102")

	// Generate 8 random hex characters
	bytes := make([]byte, 4)
	rand.Read(bytes)
	randomStr := hex.EncodeToString(bytes)

	return fmt.Sprintf("CERT-%s-%s", dateStr, randomStr)
}

// GetCertificateURL returns the full URL to the certificate PDF
func (c *Certificate) GetCertificateURL() string {
	if c.CertificateURL != "" {
		return c.CertificateURL
	}
	// TODO: Return default URL or generate on-the-fly
	return ""
}

// IsValid checks if the certificate is valid (basic check)
func (c *Certificate) IsValid() bool {
	return c.VerificationCode != "" && !c.IssuedAt.IsZero()
}

// GetCertificateByCode retrieves a certificate by verification code
func GetCertificateByCode(db *gorm.DB, verificationCode string) (*Certificate, error) {
	var certificate Certificate
	err := db.Preload("User").
		Preload("Course").
		Where("verification_code = ?", verificationCode).
		First(&certificate).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrCertificateNotFound
		}
		return nil, err
	}

	return &certificate, nil
}

// GetUserCertificates retrieves all certificates for a user
func GetUserCertificates(db *gorm.DB, userID uuid.UUID) ([]Certificate, error) {
	var certificates []Certificate
	err := db.Preload("Course").
		Where("user_id = ?", userID).
		Order("issued_at DESC").
		Find(&certificates).Error

	if err != nil {
		return nil, err
	}

	return certificates, nil
}

// GetCourseCertificate retrieves a certificate for a user's completed course
func GetCourseCertificate(db *gorm.DB, userID uuid.UUID, courseID uuid.UUID) (*Certificate, error) {
	var certificate Certificate
	err := db.Preload("Course").
		Where("user_id = ? AND course_id = ?", userID, courseID).
		First(&certificate).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrCertificateNotFound
		}
		return nil, err
	}

	return &certificate, nil
}

// VerifyCertificate verifies if a certificate is authentic
func VerifyCertificate(db *gorm.DB, verificationCode string) (*CertificateVerification, error) {
	certificate, err := GetCertificateByCode(db, verificationCode)
	if err != nil {
		return &CertificateVerification{
			IsValid: false,
			Message: "Certificate not found",
		}, nil
	}

	return &CertificateVerification{
		IsValid:     true,
		Certificate: certificate,
		UserName:    certificate.User.Username,
		CourseTitle: certificate.Course.Title,
		IssuedDate:  certificate.IssuedAt.Format("January 2, 2006"),
		Message:     "Certificate is valid",
	}, nil
}

// CertificateVerification contains verification result details
type CertificateVerification struct {
	IsValid     bool         `json:"is_valid"`
	Certificate *Certificate `json:"certificate,omitempty"`
	UserName    string       `json:"user_name,omitempty"`
	CourseTitle string       `json:"course_title,omitempty"`
	IssuedDate  string       `json:"issued_date,omitempty"`
	Message     string       `json:"message"`
}

// CertificateWithDetails includes certificate with enrollment details
type CertificateWithDetails struct {
	Certificate
	Username             string  `json:"username"`
	UserEmail            string  `json:"user_email"`
	CourseTitle          string  `json:"course_title"`
	CourseDifficulty     string  `json:"course_difficulty"`
	InstructorName       string  `json:"instructor_name"`
	CompletionPercentage float64 `json:"completion_percentage"`
	FinalGrade           float64 `json:"final_grade"`
}

// GetCertificateWithDetails retrieves certificate with full details for PDF generation
func GetCertificateWithDetails(db *gorm.DB, certificateID uuid.UUID) (*CertificateWithDetails, error) {
	var certificate Certificate
	err := db.Preload("User").
		Preload("Course").
		Preload("Course.Instructor").
		First(&certificate, certificateID).Error

	if err != nil {
		return nil, err
	}

	// Get enrollment details
	var enrollment Enrollment
	err = db.Where("user_id = ? AND course_id = ?", certificate.UserID, certificate.CourseID).
		First(&enrollment).Error

	if err != nil {
		return nil, err
	}

	return &CertificateWithDetails{
		Certificate:          certificate,
		Username:             certificate.User.Username,
		UserEmail:            certificate.User.Email,
		CourseTitle:          certificate.Course.Title,
		CourseDifficulty:     string(certificate.Course.Difficulty),
		InstructorName:       certificate.Course.Instructor.Username,
		CompletionPercentage: enrollment.CompletionPercentage,
		FinalGrade:           enrollment.AverageGrade,
	}, nil
}

// CreateCertificate creates a new certificate for a completed course
func CreateCertificate(db *gorm.DB, userID uuid.UUID, courseID uuid.UUID) (*Certificate, error) {
	// Check if certificate already exists
	existing, _ := GetCourseCertificate(db, userID, courseID)
	if existing != nil {
		return nil, ErrCertificateAlreadyIssued
	}

	// Verify enrollment is completed with passing grade
	enrollment, err := GetUserEnrollment(db, userID, courseID)
	if err != nil {
		return nil, err
	}

	if enrollment.CompletionPercentage < 100 {
		return nil, errors.New("course not completed")
	}

	if enrollment.AverageGrade < 70 {
		return nil, errors.New("grade below passing threshold")
	}

	// Get course details for metadata
	var course Course
	if err := db.Preload("Instructor").First(&course, courseID).Error; err != nil {
		return nil, fmt.Errorf("failed to load course: %w", err)
	}

	// Create certificate with enrollment metadata
	difficultyStr := string(course.Difficulty)
	certificate := &Certificate{
		UserID:           userID,
		CourseID:         courseID,
		IssuedAt:         time.Now(),
		AverageGrade:     &enrollment.AverageGrade,
		CompletedAt:      enrollment.CompletedAt,
		InstructorID:     &course.InstructorID,
		CourseDifficulty: &difficultyStr,
		CourseTitle:      &course.Title,
	}

	if err := db.Create(certificate).Error; err != nil {
		return nil, err
	}

	// Update enrollment with certificate ID
	enrollment.CertificateID = &certificate.ID
	if err := db.Save(enrollment).Error; err != nil {
		return nil, err
	}

	return certificate, nil
}

// UpdateCertificateURL updates the certificate URL after PDF generation
func UpdateCertificateURL(db *gorm.DB, certificateID uuid.UUID, url string) error {
	return db.Model(&Certificate{}).
		Where("id = ?", certificateID).
		Update("certificate_url", url).Error
}

// GetCertificateCount returns the total number of certificates issued
func GetCertificateCount(db *gorm.DB) (int64, error) {
	var count int64
	err := db.Model(&Certificate{}).Count(&count).Error
	return count, err
}

// GetUserCertificateCount returns the number of certificates a user has earned
func GetUserCertificateCount(db *gorm.DB, userID uuid.UUID) (int64, error) {
	var count int64
	err := db.Model(&Certificate{}).Where("user_id = ?", userID).Count(&count).Error
	return count, err
}
