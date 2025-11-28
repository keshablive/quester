package controllers

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/framework/controller"
	"github.com/keshablive/quester/internal/framework/middleware"
	"github.com/keshablive/quester/internal/models"
	"github.com/keshablive/quester/internal/services"
	"gorm.io/gorm"
)

// CourseController handles course-related HTTP requests
type CourseController struct {
	courseService *services.CourseService
}

// NewCourseController creates a new course controller
func NewCourseController(db *gorm.DB) *CourseController {
	return &CourseController{
		courseService: services.NewCourseService(db),
	}
}

// RegisterRoutes registers course routes
func (ctrl *CourseController) RegisterRoutes(app *fiber.App) {
	courses := app.Group("/api/v1/courses")

	// Public routes
	courses.Get("/", ctrl.GetCourses)   // GET /api/v1/courses
	courses.Get("/:id", ctrl.GetCourse) // GET /api/v1/courses/:id

	// Protected routes (require authentication)
	courses.Use(middleware.FiberAuthMiddleware())
	courses.Post("/", ctrl.CreateCourse)                     // POST /api/v1/courses
	courses.Put("/:id", ctrl.UpdateCourse)                   // PUT /api/v1/courses/:id
	courses.Delete("/:id", ctrl.DeleteCourse)                // DELETE /api/v1/courses/:id
	courses.Post("/:id/publish", ctrl.PublishCourse)         // POST /api/v1/courses/:id/publish
	courses.Post("/:id/unpublish", ctrl.UnpublishCourse)     // POST /api/v1/courses/:id/unpublish
	courses.Get("/:id/stats", ctrl.GetCourseEnrollmentStats) // GET /api/v1/courses/:id/stats

	// Instructor routes
	instructors := app.Group("/api/v1/instructors")
	instructors.Get("/:id/courses", ctrl.GetInstructorCourses) // GET /api/v1/instructors/:id/courses
}

// CreateCourse handles POST /api/v1/courses
func (ctrl *CourseController) CreateCourse(c *fiber.Ctx) error {
	// Get authenticated user from context
	userID, ok := c.Locals(controller.FiberUserIDKey).(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Missing or invalid user ID",
		})
	}

	tenantID, ok := c.Locals(controller.FiberTenantIDKey).(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Missing or invalid tenant ID",
		})
	}

	// Parse request body
	var req services.CreateCourseRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Set instructor ID and tenant ID from authenticated user
	req.InstructorID = userID
	req.TenantID = tenantID.String()

	// Validate required fields
	if req.Title == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Title is required",
		})
	}
	if req.Difficulty == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Difficulty is required",
		})
	}

	// Create course (service expects pointer)
	course, err := ctrl.courseService.Create(&req)
	if err != nil {
		if err.Error() == "instructor not found" || err.Error() == "user is not an instructor" {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create course",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "Course created successfully",
		"course":  course,
	})
}

// GetCourses handles GET /api/v1/courses
func (ctrl *CourseController) GetCourses(c *fiber.Ctx) error {
	// Parse query parameters
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	difficulty := c.Query("difficulty")
	published := c.Query("published")
	// Note: instructor_id query param not used - use GET /api/v1/instructors/:id/courses instead

	// Build request
	req := services.ListCoursesRequest{
		Page:       page,
		Limit:      limit,
		Difficulty: difficulty,
	}

	// Parse published filter
	if published == "true" {
		val := true
		req.Published = &val
	} else if published == "false" {
		val := false
		req.Published = &val
	}

	// Note: instructor_id filtering not supported in service.ListCourses
	// Use GET /api/v1/instructors/:id/courses instead

	// Get courses (service expects pointer)
	courses, total, err := ctrl.courseService.ListCourses(&req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch courses",
		})
	}

	return c.JSON(fiber.Map{
		"courses": courses,
		"total":   total,
		"page":    page,
		"limit":   limit,
	})
}

// GetCourse handles GET /api/v1/courses/:id
func (ctrl *CourseController) GetCourse(c *fiber.Ctx) error {
	// Parse course ID
	courseID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid course ID",
		})
	}

	// Get course with lessons and stats
	course, err := ctrl.courseService.GetWithStats(courseID)
	if err != nil {
		if err == models.ErrCourseNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Course not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch course",
		})
	}

	return c.JSON(fiber.Map{
		"course": course,
	})
}

// UpdateCourse handles PUT /api/v1/courses/:id
func (ctrl *CourseController) UpdateCourse(c *fiber.Ctx) error {
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

	// Check if user can edit course
	canEdit, err := ctrl.courseService.CanUserEditCourse(userID, courseID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to check permissions",
		})
	}
	if !canEdit {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "You don't have permission to edit this course",
		})
	}

	// Parse request body
	var req services.UpdateCourseRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Update course (service expects pointer)
	course, err := ctrl.courseService.Update(courseID, &req)
	if err != nil {
		if err == models.ErrCourseNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Course not found",
			})
		}
		if err == models.ErrInvalidDifficulty || err == models.ErrInvalidPrice {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update course",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Course updated successfully",
		"course":  course,
	})
}

// DeleteCourse handles DELETE /api/v1/courses/:id
func (ctrl *CourseController) DeleteCourse(c *fiber.Ctx) error {
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

	// Check if user can edit course
	canEdit, err := ctrl.courseService.CanUserEditCourse(userID, courseID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to check permissions",
		})
	}
	if !canEdit {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "You don't have permission to delete this course",
		})
	}

	// Delete course
	if err := ctrl.courseService.Delete(courseID); err != nil {
		if err == models.ErrCourseNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Course not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete course",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Course deleted successfully",
	})
}

// PublishCourse handles POST /api/v1/courses/:id/publish
func (ctrl *CourseController) PublishCourse(c *fiber.Ctx) error {
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

	// Check if user can edit course
	canEdit, err := ctrl.courseService.CanUserEditCourse(userID, courseID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to check permissions",
		})
	}
	if !canEdit {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "You don't have permission to publish this course",
		})
	}

	// Publish course
	course, err := ctrl.courseService.Publish(courseID)
	if err != nil {
		if err == models.ErrCourseNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Course not found",
			})
		}
		if err.Error() == "course must have at least one lesson to be published" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to publish course",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Course published successfully",
		"course":  course,
	})
}

// UnpublishCourse handles POST /api/v1/courses/:id/unpublish
func (ctrl *CourseController) UnpublishCourse(c *fiber.Ctx) error {
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

	// Check if user can edit course
	canEdit, err := ctrl.courseService.CanUserEditCourse(userID, courseID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to check permissions",
		})
	}
	if !canEdit {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "You don't have permission to unpublish this course",
		})
	}

	// Unpublish course
	course, err := ctrl.courseService.Unpublish(courseID)
	if err != nil {
		if err == models.ErrCourseNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Course not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to unpublish course",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Course unpublished successfully",
		"course":  course,
	})
}

// GetCourseEnrollmentStats handles GET /api/v1/courses/:id/stats
func (ctrl *CourseController) GetCourseEnrollmentStats(c *fiber.Ctx) error {
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

	// Check if user can view course stats (instructor or admin)
	canEdit, err := ctrl.courseService.CanUserEditCourse(userID, courseID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to check permissions",
		})
	}
	if !canEdit {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "You don't have permission to view course statistics",
		})
	}

	// Get enrollment statistics
	stats, err := ctrl.courseService.GetEnrollmentStats(courseID)
	if err != nil {
		if err == models.ErrCourseNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Course not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch statistics",
		})
	}

	return c.JSON(fiber.Map{
		"stats": stats,
	})
}

// GetInstructorCourses handles GET /api/v1/instructors/:id/courses
func (ctrl *CourseController) GetInstructorCourses(c *fiber.Ctx) error {
	// Parse instructor ID (UUID format)
	instructorIDStr := c.Params("id")
	instructorID, err := uuid.Parse(instructorIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid instructor ID format",
		})
	}

	// Get instructor's courses
	courses, err := ctrl.courseService.GetInstructorCourses(instructorID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch courses",
		})
	}

	return c.JSON(fiber.Map{
		"courses": courses,
	})
}
