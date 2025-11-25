package controllers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/yourusername/quester/internal/models"
	"github.com/yourusername/quester/internal/services"
	"gorm.io/gorm"
)

// LessonController handles lesson-related HTTP requests
type LessonController struct {
	lessonService *services.LessonService
	courseService *services.CourseService
}

// NewLessonController creates a new lesson controller
func NewLessonController(db *gorm.DB) *LessonController {
	return &LessonController{
		lessonService: services.NewLessonService(db),
		courseService: services.NewCourseService(db),
	}
}

// RegisterRoutes registers all lesson-related routes
func (ctrl *LessonController) RegisterRoutes(app *fiber.App) {
	lessons := app.Group("/api/v1/lessons")

	// Get lesson with completion status
	lessons.Get("/:id", ctrl.GetLesson)

	// Complete lesson
	lessons.Post("/:id/complete", ctrl.CompleteLesson)

	// Course-specific lesson routes
	courses := app.Group("/api/v1/courses/:id/lessons")
	courses.Post("/", ctrl.CreateLesson)
	courses.Get("/", ctrl.GetCourseLessons)
	courses.Post("/reorder", ctrl.ReorderLessons)

	// Individual lesson operations
	lessons.Put("/:id", ctrl.UpdateLesson)
	lessons.Delete("/:id", ctrl.DeleteLesson)
}

// CreateLesson handles POST /courses/:id/lessons
func (ctrl *LessonController) CreateLesson(c *fiber.Ctx) error {
	// Parse course ID
	courseID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid course ID",
		})
	}

	// Get authenticated user
	userIDStr := c.Locals("user_id").(string)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid user ID",
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
			"error": "You don't have permission to add lessons to this course",
		})
	}

	// Parse request body
	var req services.CreateLessonRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Set course ID from URL parameter
	req.CourseID = courseID

	// Validate required fields
	if req.Title == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Title is required",
		})
	}
	if req.ContentType == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Content type is required",
		})
	}
	if len(req.Content) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Content is required",
		})
	}

	// Create lesson
	lesson, err := ctrl.lessonService.Create(&req)
	if err != nil {
		if err == models.ErrCourseNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Course not found",
			})
		}
		if err.Error() == "invalid content type" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		if err.Error() == "prerequisite lesson not found" || err.Error() == "prerequisite must be in the same course" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create lesson",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "Lesson created successfully",
		"lesson":  lesson,
	})
}

// GetLesson handles GET /lessons/:id
func (ctrl *LessonController) GetLesson(c *fiber.Ctx) error {
	// Parse lesson ID
	lessonID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid lesson ID",
		})
	}

	// Get authenticated user
	userIDStr := c.Locals("user_id").(string)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	// Get lesson with user-specific status
	lesson, err := ctrl.lessonService.GetWithStatus(lessonID, userID)
	if err != nil {
		if err.Error() == "lesson not found" {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Lesson not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch lesson",
		})
	}

	return c.JSON(fiber.Map{
		"lesson": lesson,
	})
}

// GetCourseLessons handles GET /courses/:id/lessons
func (ctrl *LessonController) GetCourseLessons(c *fiber.Ctx) error {
	// Parse course ID
	courseID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid course ID",
		})
	}

	// Get authenticated user
	userIDStr := c.Locals("user_id").(string)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	// Get course lessons with user-specific status
	lessons, err := ctrl.lessonService.GetCourseLessonsWithStatus(courseID, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch lessons",
		})
	}

	return c.JSON(fiber.Map{
		"lessons": lessons,
	})
}

// UpdateLesson handles PUT /lessons/:id
func (ctrl *LessonController) UpdateLesson(c *fiber.Ctx) error {
	// Parse lesson ID
	lessonID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid lesson ID",
		})
	}

	// Get lesson to check course ownership
	lesson, err := ctrl.lessonService.GetByID(lessonID)
	if err != nil {
		if err.Error() == "lesson not found" {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Lesson not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch lesson",
		})
	}

	// Get authenticated user
	userIDStr := c.Locals("user_id").(string)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	// Check if user can edit course
	canEdit, err := ctrl.courseService.CanUserEditCourse(userID, lesson.CourseID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to check permissions",
		})
	}
	if !canEdit {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "You don't have permission to edit this lesson",
		})
	}

	// Parse request body
	var req services.UpdateLessonRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Update lesson
	updatedLesson, err := ctrl.lessonService.Update(lessonID, &req)
	if err != nil {
		if err.Error() == "lesson not found" {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Lesson not found",
			})
		}
		if err.Error() == "invalid content type" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		if err.Error() == "prerequisite lesson not found" || err.Error() == "prerequisite must be in the same course" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update lesson",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Lesson updated successfully",
		"lesson":  updatedLesson,
	})
}

// DeleteLesson handles DELETE /lessons/:id
func (ctrl *LessonController) DeleteLesson(c *fiber.Ctx) error {
	// Parse lesson ID
	lessonID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid lesson ID",
		})
	}

	// Get lesson to check course ownership
	lesson, err := ctrl.lessonService.GetByID(lessonID)
	if err != nil {
		if err.Error() == "lesson not found" {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Lesson not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch lesson",
		})
	}

	// Get authenticated user
	userIDStr := c.Locals("user_id").(string)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	// Check if user can edit course
	canEdit, err := ctrl.courseService.CanUserEditCourse(userID, lesson.CourseID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to check permissions",
		})
	}
	if !canEdit {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "You don't have permission to delete this lesson",
		})
	}

	// Delete lesson
	if err := ctrl.lessonService.Delete(lessonID); err != nil {
		if err.Error() == "lesson not found" {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Lesson not found",
			})
		}
		if err.Error() == "cannot delete lesson: other lessons depend on it" {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete lesson",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Lesson deleted successfully",
	})
}

// CompleteLesson handles POST /lessons/:id/complete
func (ctrl *LessonController) CompleteLesson(c *fiber.Ctx) error {
	// Parse lesson ID
	lessonID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid lesson ID",
		})
	}

	// Get authenticated user
	userIDStr := c.Locals("user_id").(string)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	// Parse request body for optional grade
	var body struct {
		Grade *float64 `json:"grade"`
	}
	if err := c.BodyParser(&body); err != nil {
		// Ignore parse errors for empty body
	}

	// Complete lesson
	req := services.CompleteLessonRequest{
		UserID:   userID,
		LessonID: lessonID,
		Grade:    body.Grade,
	}

	completion, err := ctrl.lessonService.Complete(&req)
	if err != nil {
		if err.Error() == "lesson not found" {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Lesson not found",
			})
		}
		if err.Error() == "prerequisite lesson not completed" {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "You must complete the prerequisite lesson first",
			})
		}
		if err.Error() == "enrollment not found" {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "You must enroll in the course first",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to complete lesson",
		})
	}

	return c.JSON(fiber.Map{
		"message":    "Lesson completed successfully",
		"completion": completion,
	})
}

// ReorderLessons handles POST /courses/:id/lessons/reorder
func (ctrl *LessonController) ReorderLessons(c *fiber.Ctx) error {
	// Parse course ID
	courseID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid course ID",
		})
	}

	// Get authenticated user
	userIDStr := c.Locals("user_id").(string)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid user ID",
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
			"error": "You don't have permission to reorder lessons",
		})
	}

	// Parse request body
	var req struct {
		LessonIDs []uuid.UUID `json:"lesson_ids"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Reorder lessons
	if err := ctrl.lessonService.ReorderLessons(courseID, req.LessonIDs); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to reorder lessons",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Lessons reordered successfully",
	})
}

// GetLessonProgress handles GET /lessons/:id/progress
func (ctrl *LessonController) GetLessonProgress(c *fiber.Ctx) error {
	// Parse lesson ID
	lessonID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid lesson ID",
		})
	}

	// Get lesson to check course ownership
	lesson, err := ctrl.lessonService.GetByID(lessonID)
	if err != nil {
		if err.Error() == "lesson not found" {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Lesson not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch lesson",
		})
	}

	// Get authenticated user
	userIDStr := c.Locals("user_id").(string)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	// Check if user can view course stats (instructor or admin)
	canEdit, err := ctrl.courseService.CanUserEditCourse(userID, lesson.CourseID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to check permissions",
		})
	}
	if !canEdit {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "You don't have permission to view lesson progress",
		})
	}

	// Get lesson progress statistics
	progress, err := ctrl.lessonService.GetLessonProgress(lessonID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch progress statistics",
		})
	}

	return c.JSON(fiber.Map{
		"progress": progress,
	})
}
