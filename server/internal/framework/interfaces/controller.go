// Controller interface contracts
package interfaces

import (
	"github.com/gofiber/fiber/v2"
)

// Controller defines the interface for HTTP controllers that register routes.
// All controllers should implement this interface to enable consistent route registration.
//
// Example implementation:
//
//	type UserController struct {
//	    userService *service.UserService
//	}
//
//	func (c *UserController) RegisterRoutes(app *fiber.App) {
//	    users := app.Group("/api/v1/users")
//	    users.Get("/", c.ListUsers)
//	    users.Get("/:id", c.GetUser)
//	}
type Controller interface {
	// RegisterRoutes registers all HTTP routes for this controller with the Fiber app.
	// The controller is responsible for defining route groups, middleware, and handlers.
	RegisterRoutes(app *fiber.App)
}

// RouterGroup defines the interface for registering routes on a specific router group.
// Use this when a controller needs to register routes on a pre-configured group
// rather than the root Fiber app.
type RouterGroup interface {
	// RegisterRoutes registers routes on the provided Fiber router.
	// This allows controllers to be mounted on different base paths.
	RegisterRoutes(router fiber.Router)
}

// HealthChecker defines the interface for controllers that provide health check endpoints.
// Implement this for controllers that manage critical resources requiring health monitoring.
type HealthChecker interface {
	// HealthCheck returns the health status of the controller's dependencies.
	// Returns nil if healthy, or an error describing the unhealthy state.
	HealthCheck() error
}

// Shutdownable defines the interface for controllers that require cleanup on shutdown.
// Implement this for controllers that hold resources like connections or goroutines.
type Shutdownable interface {
	// Shutdown gracefully shuts down the controller, releasing any held resources.
	// The controller should complete any in-flight requests before returning.
	Shutdown() error
}
