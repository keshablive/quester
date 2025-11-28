package controllers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"github.com/keshablive/quester/internal/services"
)

// CertificateController handles certificate-related HTTP requests
type CertificateController struct {
	service *services.CertificateService
}

// NewCertificateController creates a new certificate controller
func NewCertificateController(service *services.CertificateService) *CertificateController {
	return &CertificateController{
		service: service,
	}
}

// IssueCertificate handles POST /api/v1/certificates
func (ctrl *CertificateController) IssueCertificate(c *fiber.Ctx) error {
	userID, ok := c.Locals("userId").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req services.IssueCertificateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
	}

	req.UserID = userID
	certificate, err := ctrl.service.Issue(req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"certificate": certificate})
}

// GetCertificate handles GET /api/v1/certificates/:id
func (ctrl *CertificateController) GetCertificate(c *fiber.Ctx) error {
	certificateID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid ID"})
	}

	certificate, err := ctrl.service.GetByID(certificateID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Not found"})
	}

	return c.JSON(fiber.Map{"certificate": certificate})
}

// GetUserCertificates handles GET /api/v1/certificates
func (ctrl *CertificateController) GetUserCertificates(c *fiber.Ctx) error {
	userID, ok := c.Locals("userId").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	certificates, err := ctrl.service.GetUserCertificates(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"certificates": certificates})
}

// GetDownloadURL handles GET /api/v1/certificates/:id/download
func (ctrl *CertificateController) GetDownloadURL(c *fiber.Ctx) error {
	certificateID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid ID"})
	}

	url, err := ctrl.service.GetPreSignedURL(certificateID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"download_url": url})
}

// VerifyCertificate handles GET /api/v1/certificates/verify/:code
func (ctrl *CertificateController) VerifyCertificate(c *fiber.Ctx) error {
	code := c.Params("code")
	if code == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Code required"})
	}

	result, err := ctrl.service.Verify(code)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Invalid code"})
	}

	return c.JSON(fiber.Map{"verified": true, "certificate": result})
}

// GetCourseCertificate handles GET /api/v1/certificates/course/:courseId
func (ctrl *CertificateController) GetCourseCertificate(c *fiber.Ctx) error {
	userID, ok := c.Locals("userId").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	courseID, err := uuid.Parse(c.Params("courseId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid ID"})
	}

	certificate, err := ctrl.service.GetCourseCertificate(userID, courseID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Not found"})
	}

	return c.JSON(fiber.Map{"certificate": certificate})
}

// RegeneratePDF handles POST /api/v1/certificates/:id/regenerate
func (ctrl *CertificateController) RegeneratePDF(c *fiber.Ctx) error {
	certificateID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid ID"})
	}

	if err := ctrl.service.RegeneratePDF(certificateID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "PDF regenerated"})
}

// GetCourseStatistics handles GET /api/v1/certificates/stats/course/:courseId
func (ctrl *CertificateController) GetCourseStatistics(c *fiber.Ctx) error {
	courseID, err := uuid.Parse(c.Params("courseId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid ID"})
	}

	stats, err := ctrl.service.GetCourseStatistics(courseID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"statistics": stats})
}
