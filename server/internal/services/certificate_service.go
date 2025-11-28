package services

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"os"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/models"
	"gorm.io/gorm"
)

// CertificateService handles certificate generation and management
type CertificateService struct {
	db        *gorm.DB
	generator *CertificateGenerator
	s3Client  *s3.Client
	s3Bucket  string
	s3Path    string
}

// NewCertificateService creates a new certificate service
func NewCertificateService(db *gorm.DB) *CertificateService {
	// Initialize certificate generator
	verificationURL := os.Getenv("CERTIFICATE_VERIFICATION_URL")
	if verificationURL == "" {
		verificationURL = "https://quester.app" // Default
	}

	organizationName := os.Getenv("ORGANIZATION_NAME")
	if organizationName == "" {
		organizationName = "Quester Learning Platform" // Default
	}

	generator := NewCertificateGenerator(db, verificationURL, organizationName)

	// Initialize S3 client
	s3Client := initializeS3Client()
	s3Bucket := os.Getenv("S3_BUCKET")
	if s3Bucket == "" {
		s3Bucket = "quester-video-streams" // Default
	}

	s3Path := os.Getenv("S3_CERTIFICATE_PATH")
	if s3Path == "" {
		s3Path = "certificates/" // Default
	}

	return &CertificateService{
		db:        db,
		generator: generator,
		s3Client:  s3Client,
		s3Bucket:  s3Bucket,
		s3Path:    s3Path,
	}
}

// initializeS3Client creates an S3 client with credentials from environment
func initializeS3Client() *s3.Client {
	s3Endpoint := os.Getenv("S3_ENDPOINT")
	s3Region := os.Getenv("S3_REGION")
	if s3Region == "" {
		s3Region = "us-east-1"
	}

	accessKey := os.Getenv("S3_ACCESS_KEY_ID")
	secretKey := os.Getenv("S3_SECRET_ACCESS_KEY")

	// If credentials are missing, return nil (S3 operations will be skipped)
	if accessKey == "" || secretKey == "" {
		fmt.Println("Warning: S3 credentials not found, S3 upload will be skipped")
		return nil
	}

	// Configure resolver for custom endpoint (LocalStack/MinIO)
	var resolverFunc aws.EndpointResolverWithOptionsFunc
	if s3Endpoint != "" {
		resolverFunc = func(service, region string, options ...interface{}) (aws.Endpoint, error) {
			return aws.Endpoint{
				URL:           s3Endpoint,
				SigningRegion: s3Region,
			}, nil
		}
	}

	// Load AWS config
	cfg, err := config.LoadDefaultConfig(context.Background(),
		config.WithRegion(s3Region),
		config.WithEndpointResolverWithOptions(resolverFunc),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			accessKey,
			secretKey,
			"",
		)),
	)
	if err != nil {
		// Log error but don't crash - service can still work without S3
		fmt.Printf("Warning: Failed to initialize S3 client: %v\n", err)
		return nil
	}

	client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.UsePathStyle = true // Required for LocalStack/MinIO
	})

	return client
}

// IssueCertificateRequest represents a certificate issuance request
type IssueCertificateRequest struct {
	UserID   uuid.UUID
	CourseID uuid.UUID
}

// CertificateDetailsResponse represents certificate details with course and user info
type CertificateDetailsResponse struct {
	ID               uuid.UUID `json:"id"`
	UserID           uuid.UUID `json:"user_id"`
	UserName         string    `json:"user_name"`
	CourseID         uuid.UUID `json:"course_id"`
	CourseTitle      string    `json:"course_title"`
	CourseDifficulty string    `json:"course_difficulty"`
	VerificationCode string    `json:"verification_code"`
	CertificateURL   string    `json:"certificate_url"`
	IssuedAt         time.Time `json:"issued_at"`
	AverageGrade     float64   `json:"average_grade"`
	CompletedAt      time.Time `json:"completed_at"`
}

// VerifyCertificateResponse represents public certificate verification response
type VerifyCertificateResponse struct {
	IsValid          bool      `json:"is_valid"`
	UserName         string    `json:"user_name,omitempty"`
	CourseTitle      string    `json:"course_title,omitempty"`
	IssuedAt         time.Time `json:"issued_at,omitempty"`
	VerificationCode string    `json:"verification_code,omitempty"`
	Message          string    `json:"message,omitempty"`
}

// Issue creates a certificate for a completed course
func (s *CertificateService) Issue(req IssueCertificateRequest) (*models.Certificate, error) {
	// Check if certificate already exists
	existingCert, err := models.GetCourseCertificate(s.db, req.UserID, req.CourseID)
	if err != nil && !errors.Is(err, models.ErrCertificateNotFound) {
		return nil, fmt.Errorf("failed to check existing certificate: %w", err)
	}
	if existingCert != nil {
		return existingCert, nil // Certificate already issued
	}

	// Get enrollment details
	enrollment, err := models.GetUserEnrollment(s.db, req.UserID, req.CourseID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, models.ErrEnrollmentNotFound
		}
		return nil, fmt.Errorf("failed to fetch enrollment: %w", err)
	}

	// Check if enrollment is complete
	if !enrollment.IsCompleted() {
		return nil, errors.New("course not completed")
	}

	// Check if average grade meets requirement (70%+)
	if enrollment.AverageGrade < 70 {
		return nil, errors.New("average grade below 70%, certificate not eligible")
	}

	// Create certificate record
	certificate, err := models.CreateCertificate(s.db, req.UserID, req.CourseID)
	if err != nil {
		return nil, fmt.Errorf("failed to create certificate: %w", err)
	}

	// Generate PDF certificate
	pdfURL, err := s.generatePDF(certificate.ID)
	if err != nil {
		// Log error but don't fail certificate creation
		// PDF can be regenerated later
		fmt.Printf("Warning: Failed to generate PDF for certificate %d: %v\n", certificate.ID, err)
	} else {
		// Update certificate with PDF URL
		if err := models.UpdateCertificateURL(s.db, certificate.ID, pdfURL); err != nil {
			fmt.Printf("Warning: Failed to update certificate URL: %v\n", err)
		}
		certificate.CertificateURL = pdfURL
	}

	return certificate, nil
}

// generatePDF generates a PDF certificate and uploads to S3
func (s *CertificateService) generatePDF(certificateID uuid.UUID) (string, error) {
	// Generate PDF using certificate generator
	pdfBuffer, err := s.generator.GeneratePDF(certificateID)
	if err != nil {
		return "", fmt.Errorf("failed to generate PDF: %w", err)
	}

	// Upload to S3 and return URL
	s3URL, err := s.uploadToS3(certificateID, pdfBuffer)
	if err != nil {
		return "", fmt.Errorf("failed to upload PDF to S3: %w", err)
	}

	return s3URL, nil
}

// uploadToS3 uploads the PDF buffer to S3 and returns the URL
func (s *CertificateService) uploadToS3(certificateID uuid.UUID, pdfBuffer *bytes.Buffer) (string, error) {
	if s.s3Client == nil {
		// S3 not configured, return mock URL for testing
		return fmt.Sprintf("https://s3.amazonaws.com/quester-certificates/%d.pdf", certificateID), nil
	}

	// Generate S3 key (path + filename)
	fileName := fmt.Sprintf("%s%d.pdf", s.s3Path, certificateID)

	// Upload to S3
	ctx := context.Background()
	_, err := s.s3Client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(s.s3Bucket),
		Key:         aws.String(fileName),
		Body:        bytes.NewReader(pdfBuffer.Bytes()),
		ContentType: aws.String("application/pdf"),
	})
	if err != nil {
		return "", fmt.Errorf("failed to upload to S3: %w", err)
	}

	// Generate S3 URL
	// For LocalStack: http://localhost:4566/bucket/path/file
	// For AWS: https://bucket.s3.region.amazonaws.com/path/file
	s3Endpoint := os.Getenv("S3_ENDPOINT")
	if s3Endpoint != "" {
		// LocalStack/MinIO format
		return fmt.Sprintf("%s/%s/%s", s3Endpoint, s.s3Bucket, fileName), nil
	}

	// AWS format
	s3Region := os.Getenv("S3_REGION")
	if s3Region == "" {
		s3Region = "us-east-1"
	}
	return fmt.Sprintf("https://%s.s3.%s.amazonaws.com/%s", s.s3Bucket, s3Region, fileName), nil
} // GetPreSignedURL generates a pre-signed URL for downloading a certificate
// URL is valid for 7 days (604800 seconds)
func (s *CertificateService) GetPreSignedURL(certificateID uuid.UUID) (string, error) {
	if s.s3Client == nil {
		return "", fmt.Errorf("S3 client not initialized")
	}

	// Get certificate to verify it exists
	var cert models.Certificate
	if err := s.db.First(&cert, certificateID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", fmt.Errorf("certificate not found")
		}
		return "", fmt.Errorf("failed to fetch certificate: %w", err)
	}

	// Generate S3 key
	fileName := fmt.Sprintf("%s%d.pdf", s.s3Path, certificateID)

	// Create presign client
	presignClient := s3.NewPresignClient(s.s3Client)

	// Generate pre-signed URL with 7-day expiry
	presignResult, err := presignClient.PresignGetObject(context.Background(), &s3.GetObjectInput{
		Bucket: aws.String(s.s3Bucket),
		Key:    aws.String(fileName),
	}, func(opts *s3.PresignOptions) {
		opts.Expires = 7 * 24 * time.Hour // 7 days = 604800 seconds
	})
	if err != nil {
		return "", fmt.Errorf("failed to generate pre-signed URL: %w", err)
	}

	// Verify certificate URL is set
	if cert.CertificateURL == "" {
		// Update certificate with URL
		if err := models.UpdateCertificateURL(s.db, certificateID, presignResult.URL); err != nil {
			fmt.Printf("Warning: Failed to update certificate URL: %v\n", err)
		}
	}

	return presignResult.URL, nil
}

// GetByID retrieves a certificate by ID with full details
func (s *CertificateService) GetByID(certificateID uuid.UUID) (*CertificateDetailsResponse, error) {
	// Get certificate with details
	cert, err := models.GetCertificateWithDetails(s.db, certificateID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("certificate not found")
		}
		return nil, fmt.Errorf("failed to fetch certificate: %w", err)
	}

	// Build response (using stub values for missing fields)
	// Extract average grade and completed at from embedded Certificate struct
	avgGrade := 0.0
	if cert.AverageGrade != nil {
		avgGrade = *cert.AverageGrade
	}
	completedAt := time.Time{}
	if cert.CompletedAt != nil {
		completedAt = *cert.CompletedAt
	}

	response := &CertificateDetailsResponse{
		ID:               cert.ID,
		UserID:           cert.UserID,
		UserName:         cert.Username,
		CourseID:         cert.CourseID,
		CourseTitle:      cert.CourseTitle,
		CourseDifficulty: cert.CourseDifficulty,
		VerificationCode: cert.VerificationCode,
		CertificateURL:   cert.CertificateURL,
		IssuedAt:         cert.IssuedAt,
		AverageGrade:     avgGrade,
		CompletedAt:      completedAt,
	}

	return response, nil
}

// GetUserCertificates retrieves all certificates for a user
func (s *CertificateService) GetUserCertificates(userID uuid.UUID) ([]CertificateDetailsResponse, error) {
	// Get all user certificates
	certificates, err := models.GetUserCertificates(s.db, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch certificates: %w", err)
	}

	// Convert to response format
	var responses []CertificateDetailsResponse
	for _, cert := range certificates {
		// Get full details for each certificate
		certDetails, err := models.GetCertificateWithDetails(s.db, cert.ID)
		if err != nil {
			continue // Skip certificates with errors
		}

		// Extract average grade and completed at from embedded Certificate struct
		avgGrade := 0.0
		if certDetails.AverageGrade != nil {
			avgGrade = *certDetails.AverageGrade
		}
		completedAt := time.Time{}
		if certDetails.CompletedAt != nil {
			completedAt = *certDetails.CompletedAt
		}

		response := CertificateDetailsResponse{
			ID:               certDetails.ID,
			UserID:           certDetails.UserID,
			UserName:         certDetails.Username,
			CourseID:         certDetails.CourseID,
			CourseTitle:      certDetails.CourseTitle,
			CourseDifficulty: certDetails.CourseDifficulty,
			VerificationCode: certDetails.VerificationCode,
			CertificateURL:   certDetails.CertificateURL,
			IssuedAt:         certDetails.IssuedAt,
			AverageGrade:     avgGrade,
			CompletedAt:      completedAt,
		}

		responses = append(responses, response)
	}

	return responses, nil
}

// Verify verifies a certificate by verification code (public endpoint, no auth)
func (s *CertificateService) Verify(verificationCode string) (*VerifyCertificateResponse, error) {
	// Verify certificate
	verification, err := models.VerifyCertificate(s.db, verificationCode)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return &VerifyCertificateResponse{
				IsValid: false,
				Message: "Certificate not found",
			}, nil
		}
		return nil, fmt.Errorf("failed to verify certificate: %w", err)
	}

	// Build response with all fields from verification
	response := &VerifyCertificateResponse{
		IsValid:     verification.IsValid,
		UserName:    verification.UserName,
		CourseTitle: verification.CourseTitle,
	}

	// Only set certificate details if certificate exists
	if verification.Certificate != nil {
		response.IssuedAt = verification.Certificate.IssuedAt
		response.VerificationCode = verification.Certificate.VerificationCode
	}

	if !verification.IsValid {
		response.Message = "Certificate is invalid"
	} else {
		response.Message = "Certificate is valid"
	}

	return response, nil
}

// GetCourseCertificate retrieves a certificate for a specific user-course combination
func (s *CertificateService) GetCourseCertificate(userID uuid.UUID, courseID uuid.UUID) (*CertificateDetailsResponse, error) {
	// Get certificate
	cert, err := models.GetCourseCertificate(s.db, userID, courseID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("certificate not found for this course")
		}
		return nil, fmt.Errorf("failed to fetch certificate: %w", err)
	}

	// Get full details
	certDetails, err := models.GetCertificateWithDetails(s.db, cert.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch certificate details: %w", err)
	}

	// Build response
	response := &CertificateDetailsResponse{
		ID:               certDetails.ID,
		UserID:           certDetails.UserID,
		UserName:         certDetails.Username,
		CourseID:         certDetails.CourseID,
		CourseTitle:      certDetails.CourseTitle,
		CourseDifficulty: certDetails.CourseDifficulty,
		VerificationCode: certDetails.VerificationCode,
		CertificateURL:   certDetails.CertificateURL,
		IssuedAt:         certDetails.IssuedAt,
		AverageGrade:     0.0,        // Note: Placeholder until AverageGrade is calculated from enrollments
		CompletedAt:      time.Now(), // Note: Using current time; will use enrollment.CompletedAt when available
	}

	return response, nil
}

// RegeneratePDF regenerates the PDF for a certificate
func (s *CertificateService) RegeneratePDF(certificateID uuid.UUID) error {
	// Check if certificate exists
	var certificate models.Certificate
	if err := s.db.First(&certificate, certificateID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("certificate not found")
		}
		return fmt.Errorf("failed to fetch certificate: %w", err)
	}

	// Generate new PDF
	pdfURL, err := s.generatePDF(certificateID)
	if err != nil {
		return fmt.Errorf("failed to generate PDF: %w", err)
	}

	// Update certificate URL
	if err := models.UpdateCertificateURL(s.db, certificateID, pdfURL); err != nil {
		return fmt.Errorf("failed to update certificate URL: %w", err)
	}

	return nil
}

// GetCourseStatistics retrieves certificate statistics for a course
func (s *CertificateService) GetCourseStatistics(courseID uuid.UUID) (map[string]interface{}, error) {
	// Get total certificates issued
	totalCerts, _ := models.GetCertificateCount(s.db)

	// Get total enrollments
	enrollments, err := models.GetCourseEnrollments(s.db, courseID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch enrollments: %w", err)
	}
	totalEnrollments := len(enrollments)

	// Calculate completion rate
	var completionRate float64
	if totalEnrollments > 0 {
		completionRate = float64(totalCerts) / float64(totalEnrollments) * 100
	}

	// Count completed enrollments
	completedEnrollments := 0
	for _, enrollment := range enrollments {
		if enrollment.IsCompleted() {
			completedEnrollments++
		}
	}

	// Calculate certification rate (certificates issued / completed enrollments)
	var certificationRate float64
	if completedEnrollments > 0 {
		certificationRate = float64(totalCerts) / float64(completedEnrollments) * 100
	}

	return map[string]interface{}{
		"total_certificates":    totalCerts,
		"total_enrollments":     totalEnrollments,
		"completed_enrollments": completedEnrollments,
		"completion_rate":       completionRate,
		"certification_rate":    certificationRate,
	}, nil
}

// GeneratePDFBuffer generates a PDF certificate as a byte buffer
// This is used by the PDF generator service
func (s *CertificateService) GeneratePDFBuffer(certificateID uuid.UUID) (*bytes.Buffer, error) {
	// Use the certificate generator to create PDF
	return s.generator.GeneratePDF(certificateID)
}
