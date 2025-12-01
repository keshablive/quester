// Blacklist management controllers - T111, T112
// Implements FR-001: Complete BlacklistService Implementation
package controllers

import (
	"crypto/sha256"
	"encoding/hex"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/keshablive/quester/internal/models"
	"github.com/keshablive/quester/internal/services"
)

// CheckBlacklistResponse represents the response for blacklist check
type CheckBlacklistResponse struct {
	Success bool `json:"success"`
	Data    struct {
		IsBlacklisted bool   `json:"is_blacklisted"`
		TokenHash     string `json:"token_hash,omitempty"`
		CheckedAt     string `json:"checked_at"`
	} `json:"data"`
}

// CleanupBlacklistResponse represents the response for cleanup operation
type CleanupBlacklistResponse struct {
	Success bool `json:"success"`
	Data    struct {
		Message       string `json:"message"`
		TokensCleaned int    `json:"tokens_cleaned"`
		CleanedAt     string `json:"cleaned_at"`
	} `json:"data"`
}

// CheckBlacklistStatus handles GET /api/v1/auth/blacklist/check
// T111: Check if a token is blacklisted
// Requires authentication (user must be logged in)
func CheckBlacklistStatus(c *fiber.Ctx) error {
	// Get token from Authorization header
	authHeader := c.Get("Authorization")
	if authHeader == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "missing_token",
			"message": "Authorization header is required",
		})
	}

	// Extract Bearer token
	token := ""
	if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
		token = authHeader[7:]
	} else {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "invalid_format",
			"message": "Authorization header must be in format: Bearer <token>",
		})
	}

	// Hash the token for blacklist lookup
	tokenHash := hashToken(token)

	// Check blacklist
	blacklistService := services.NewBlacklistService()
	isBlacklisted := blacklistService.IsBlacklisted(tokenHash)

	// Return status
	response := CheckBlacklistResponse{
		Success: true,
	}
	response.Data.IsBlacklisted = isBlacklisted
	response.Data.TokenHash = tokenHash[:16] + "..." // Show first 16 chars for security
	response.Data.CheckedAt = time.Now().UTC().Format(time.RFC3339)

	return c.Status(fiber.StatusOK).JSON(response)
}

// CleanupBlacklist handles DELETE /api/v1/auth/blacklist/cleanup
// T112: Manual cleanup of expired tokens (admin only)
// Note: Redis TTL handles automatic expiration, so this is primarily for monitoring/metrics
func CleanupBlacklist(c *fiber.Ctx) error {
	// Verify admin role
	role, ok := c.Locals("role").(models.Role)
	if !ok || role != models.RoleAdmin {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"success": false,
			"error":   "forbidden",
			"message": "Admin role required for cleanup operations",
		})
	}

	// Perform cleanup
	blacklistService := services.NewBlacklistService()
	count, err := blacklistService.CleanupExpiredTokens()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "cleanup_failed",
			"message": err.Error(),
		})
	}

	// Return cleanup results
	response := CleanupBlacklistResponse{
		Success: true,
	}
	response.Data.Message = "Redis TTL handles automatic expiration. Manual cleanup is not required."
	response.Data.TokensCleaned = count
	response.Data.CleanedAt = time.Now().UTC().Format(time.RFC3339)

	return c.Status(fiber.StatusOK).JSON(response)
}

// hashToken creates a SHA256 hash of the token for blacklist storage
// Helper function shared with auth middleware
func hashToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}
