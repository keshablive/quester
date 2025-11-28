package routes

import (
	"github.com/gofiber/fiber/v2"
	"github.com/keshablive/quester/internal/controllers"
)

// SetupLMSRoutes sets up LMS routes (Courses, Lessons, Enrollments)
func SetupLMSRoutes(app *fiber.App, courseController *controllers.CourseController, lessonController *controllers.LessonController, enrollmentController *controllers.EnrollmentController) {
	// Initialize Course controller (Core LMS)
	courseController.RegisterRoutes(app) // Registers /api/v1/courses routes

	// Initialize Lesson controller (Core LMS)
	lessonController.RegisterRoutes(app) // Registers /api/v1/lessons routes

	// Initialize Enrollment controller (Core LMS)
	enrollmentController.RegisterRoutes(app) // Registers enrollment routes
}
