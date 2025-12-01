package routes

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/keshablive/quester/internal/framework/controller"
	"github.com/keshablive/quester/internal/framework/middleware"
	"github.com/keshablive/quester/internal/models"
)

// SetupAuthRoutes sets up authentication routes
func SetupAuthRoutes(router fiber.Router, authController *controller.AuthController, twoFactorController *controller.TwoFactorController) {
	// Auth routes - T111, T112 (FR-001: BlacklistService Integration)
	auth := router.Group("/auth")

	// Core Auth Routes
	auth.Post("/signup",
		middleware.FiberRateLimitByIP(5, 1*time.Hour),
		authController.Signup,
	)
	auth.Post("/login",
		middleware.FiberRateLimitByIP(10, 1*time.Hour),
		authController.Login,
	)
	auth.Post("/refresh",
		authController.RefreshToken,
	)
	auth.Post("/logout",
		middleware.FiberAuthMiddleware(),
		authController.Logout,
	)
	auth.Post("/logout-all",
		middleware.FiberAuthMiddleware(),
		authController.LogoutAll,
	)
	auth.Get("/tokens",
		middleware.FiberAuthMiddleware(),
		authController.ViewActiveTokens,
	)

	// GET /api/v1/auth/blacklist/check - Check if current token is blacklisted
	// T111: Requires authentication (user must be logged in)
	auth.Get("/blacklist/check",
		middleware.FiberAuthMiddleware(),
		middleware.FiberRateLimitByIP(100, 1*time.Minute),
		authController.CheckBlacklistStatus,
	)

	// DELETE /api/v1/auth/blacklist/cleanup - Manual cleanup of expired tokens
	// T112: Admin only, though Redis TTL handles automatic expiration
	auth.Delete("/blacklist/cleanup",
		middleware.FiberAuthMiddleware(),
		middleware.FiberRoleMiddlewareString(string(models.RoleAdmin)),
		middleware.FiberRateLimitByIP(10, 1*time.Hour),
		authController.CleanupBlacklist,
	)

	// 2FA Routes
	auth2fa := auth.Group("/2fa")
	auth2fa.Use(middleware.FiberAuthMiddleware())

	auth2fa.Post("/enable", twoFactorController.Enable2FA)
	auth2fa.Post("/verify", twoFactorController.Verify2FA)
	auth2fa.Post("/disable", twoFactorController.Disable2FA)
	auth2fa.Post("/validate", twoFactorController.Validate2FACode)
	auth2fa.Get("/devices", twoFactorController.GetTrustedDevices)
	auth2fa.Delete("/devices/:deviceId", twoFactorController.RevokeTrustedDevice)
}
