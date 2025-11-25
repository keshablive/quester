package routes

import (
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"

	"github.com/yourusername/quester/internal/controllers"
	"github.com/yourusername/quester/internal/framework/middleware"
)

// SetupWebSocketRoutes sets up WebSocket routes
func SetupWebSocketRoutes(app *fiber.App, wsController *controllers.WebSocketController) {
	// WebSocket upgrade endpoint (protected by auth)
	app.Use("/ws", func(c *fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			// Extract auth token from query param or header
			token := c.Query("token")
			if token == "" {
				token = c.Get("Authorization")
			}

			// Validate token
			if token == "" {
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
					"error": "Authentication required",
				})
			}

			// Store token in locals for middleware
			c.Locals("auth_token", token)
			return c.Next()
		}
		return c.Status(fiber.StatusUpgradeRequired).JSON(fiber.Map{
			"error": "WebSocket upgrade required",
		})
	})

	// WebSocket connection endpoint
	app.Get("/ws", wsController.HandleConnection())

	// WebSocket management endpoints (REST API)
	ws := app.Group("/api/v1/ws")
	ws.Use(middleware.Auth())

	// Connection stats
	ws.Get("/stats", wsController.GetConnectionStats)

	// User online status
	ws.Get("/users/:userId/status", wsController.CheckUserOnlineStatus)

	// Typing status
	ws.Get("/typing", wsController.GetTypingStatus)

	// Health check
	ws.Get("/health", wsController.HealthCheck)

	// Test notification (for development)
	ws.Post("/test-notification", wsController.SendTestNotification)
}
