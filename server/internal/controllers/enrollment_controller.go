package controllers

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/framework/controller"
	"github.com/keshablive/quester/internal/framework/middleware"
	"github.com/keshablive/quester/internal/models"
	"github.com/keshablive/quester/internal/framework/service"
	"gorm.io/gorm"
)

// EnrollmentController handles enrollment-related HTTP requests
type EnrollmentController struct {
	enrollmentService *service.EnrollmentService
	courseService     *service.CourseService
}

// NewEnrollmentController creates a new enrollment controller
func NewEnrollmentController(db *gorm.DB) *EnrollmentController {
	return &EnrollmentController{
		enrollmentService: service.NewEnrollmentService(db),
		courseService:     service.NewCourseService(db),
	}
}

// RegisterRoutes registers enrollment routes
func (ctrl *EnrollmentController) RegisterRoutes(app *fiber.App) {
	// Course enrollment routes (require authentication)
	app.Post("/api/v1/courses/:id/enroll", middleware.FiberAuthMiddleware(), ctrl.EnrollInCourse)
	app.Get("/api/v1/courses/:id/enrollment", middleware.FiberAuthMiddleware(), ctrl.GetUserEnrollment)
	app.Get("/api/v1/courses/:id/enrollment/check", middleware.FiberAuthMiddleware(), ctrl.CheckEnrollment)
	app.Get("/api/v1/courses/:id/enrollments", middleware.FiberAuthMiddleware(), ctrl.GetCourseEnrollments)

	// User enrollments
	app.Get("/api/v1/enrollments", middleware.FiberAuthMiddleware(), ctrl.GetUserEnrollments)
}

// EnrollInCourse handles POST /courses/:id/enroll
func (ctrl *EnrollmentController) EnrollInCourse(c *fiber.Ctx) error {
	// Parse course ID
	courseID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid course ID",
		})
	}

	// Get authenticated user
	userID, ok := c.Locals(controller.FiberUserIDKey).(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Missing or invalid user ID",
		})
	}

	// Parse request body for optional payment token
	var body struct {
		PaymentToken *string `json:"payment_token"`
	}
	if err := c.BodyParser(&body); err != nil {
		// Ignore parse errors for empty body
	}

	// Create enrollment request
	req := service.EnrollRequest{
		UserID:       userID,
		CourseID:     courseID,
		PaymentToken: body.PaymentToken,
	}

	// Enroll user in course
	enrollment, err := ctrl.enrollmentService.Enroll(req)
	if err != nil {
		if err == models.ErrAlreadyEnrolled {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": "You are already enrolled in this course",
			})
		}
		if err == models.ErrCourseNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Course not found",
			})
		}
		if err == models.ErrCourseNotPublished {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "This course is not published yet",
			})
		}
		if err.Error() == "payment token required for paid course" {
			return c.Status(fiber.StatusPaymentRequired).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		if err.Error() == "payment validation failed: invalid payment token" ||
			err.Error() == "payment validation failed: payment processing failed" {
			return c.Status(fiber.StatusPaymentRequired).JSON(fiber.Map{
				"error": "Payment validation failed",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to enroll in course",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message":    "Successfully enrolled in course",
		"enrollment": enrollment,
	})
}

// GetUserEnrollment handles GET /courses/:id/enrollment
func (ctrl *EnrollmentController) GetUserEnrollment(c *fiber.Ctx) error {
	// Parse course ID
	courseID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid course ID",
		})
	}

	// Get authenticated user
	userID, ok := c.Locals(controller.FiberUserIDKey).(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Missing or invalid user ID",
		})
	}

	// Get enrollment details
	req := service.GetEnrollmentRequest{
		UserID:   userID,
		CourseID: courseID,
	}

	enrollment, err := ctrl.enrollmentService.GetEnrollment(req)
	if err != nil {
		if err == models.ErrEnrollmentNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "You are not enrolled in this course",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch enrollment details",
		})
	}

	return c.JSON(fiber.Map{
		"enrollment": enrollment,
	})
}

// GetUserEnrollments handles GET /enrollments
func (ctrl *EnrollmentController) GetUserEnrollments(c *fiber.Ctx) error {
	// Get authenticated user
	userID, ok := c.Locals(controller.FiberUserIDKey).(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Missing or invalid user ID",
		})
	}

	// Parse query parameters
	status := c.Query("status", "all")
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))

	// Create request
	req := service.ListEnrollmentsRequest{
		UserID: userID,
		Status: status,
		Page:   page,
		Limit:  limit,
	}

	// Get enrollments
	enrollments, total, err := ctrl.enrollmentService.ListEnrollments(req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch enrollments",
		})
	}

	return c.JSON(fiber.Map{
		"enrollments": enrollments,
		"total":       total,
		"page":        page,
		"limit":       limit,
	})
}

// GetCourseEnrollments handles GET /courses/:id/enrollments (instructor view)
func (ctrl *EnrollmentController) GetCourseEnrollments(c *fiber.Ctx) error {
	// Parse course ID
	courseID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid course ID",
		})
	}

	// Get authenticated user
	userID, ok := c.Locals(controller.FiberUserIDKey).(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Missing or invalid user ID",
		})
	}

	// Check if user can view course enrollments (instructor or admin)
	canEdit, err := ctrl.courseService.CanUserEditCourse(userID, courseID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to check permissions",
		})
	}
	if !canEdit {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "You don't have permission to view course enrollments",
		})
	}

	// Get course enrollments
	enrollments, err := ctrl.enrollmentService.GetCourseEnrollments(courseID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch enrollments",
		})
	}

	return c.JSON(fiber.Map{
		"enrollments": enrollments,
	})
}

// CheckEnrollment handles GET /courses/:id/enrollment/check
func (ctrl *EnrollmentController) CheckEnrollment(c *fiber.Ctx) error {
	// Parse course ID
	courseID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid course ID",
		})
	}

	// Get authenticated user
	userID, ok := c.Locals(controller.FiberUserIDKey).(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Missing or invalid user ID",
		})
	}

	// Check enrollment
	isEnrolled, err := ctrl.enrollmentService.IsUserEnrolled(userID, courseID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to check enrollment status",
		})
	}

	return c.JSON(fiber.Map{
		"is_enrolled": isEnrolled,
	})
}
