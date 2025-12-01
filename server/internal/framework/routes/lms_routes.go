package routes

import (
	"github.com/gofiber/fiber/v2"
	"github.com/keshablive/quester/internal/framework/controller"
)

// SetupLMSRoutes sets up LMS routes (Courses, Lessons, Enrollments)
func SetupLMSRoutes(app *fiber.App, courseController *controller.CourseController, lessonController *controller.LessonController, enrollmentController *controller.EnrollmentController) {
	// Initialize Course controller (Core LMS)
	courseController.RegisterRoutes(app) // Registers /api/v1/courses routes

	// Initialize Lesson controller (Core LMS)
	lessonController.RegisterRoutes(app) // Registers /api/v1/lessons routes

	// Initialize Enrollment controller (Core LMS)
	enrollmentController.RegisterRoutes(app) // Registers enrollment routes
}
