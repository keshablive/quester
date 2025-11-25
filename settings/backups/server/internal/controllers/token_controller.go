// Token management controllers
package controllers

import (
	"context"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/yourusername/quester/internal/framework/database"
	"github.com/yourusername/quester/internal/repositories"
	"github.com/yourusername/quester/internal/services"
)

// TokenResponse represents a single token in the response
type TokenResponse struct {
	ID        string `json:"id"`
	CreatedAt string `json:"created_at"`
	ExpiresAt string `json:"expires_at"`
}

// ViewActiveTokensResponse represents the response for viewing active tokens
type ViewActiveTokensResponse struct {
	Success bool `json:"success"`
	Data    struct {
		Tokens []TokenResponse `json:"tokens"`
		Total  int64           `json:"total"`
		Limit  int             `json:"limit"`
		Offset int             `json:"offset"`
	} `json:"data"`
}

// ViewActiveTokens handles GET /api/v1/auth/tokens (T086, FR-032)
// Returns user's active (non-expired, non-revoked) refresh tokens
// Requires authentication (user_id in context from AuthMiddleware)
func ViewActiveTokens(c *fiber.Ctx) error {
	// Get user ID from context (set by AuthMiddleware)
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "unauthorized",
			"message": "Authentication required",
		})
	}

	// Parse pagination parameters
	limit, err := strconv.Atoi(c.Query("limit", "50"))
	if err != nil || limit <= 0 {
		limit = 50
	}
	// Cap limit at 50 (per FR-032)
	if limit > 50 {
		limit = 50
	}

	offset, err := strconv.Atoi(c.Query("offset", "0"))
	if err != nil || offset < 0 {
		offset = 0
	}

	// Initialize service
	tokenRepo := repositories.NewRefreshTokenRepository(database.DB)
	userRepo := repositories.NewUserRepository(database.DB)
	tokenService := services.NewRefreshTokenService(tokenRepo, userRepo)

	// Get active tokens
	ctx := context.Background()
	tokens, total, err := tokenService.GetActiveTokens(ctx, userID, limit, offset)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "internal_error",
			"message": "Failed to retrieve tokens",
		})
	}

	// Transform tokens to response format
	tokenResponses := make([]TokenResponse, len(tokens))
	for i, token := range tokens {
		tokenResponses[i] = TokenResponse{
			ID:        token.ID.String(),
			CreatedAt: token.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			ExpiresAt: token.ExpiresAt.Format("2006-01-02T15:04:05Z07:00"),
		}
	}

	// Build response
	response := ViewActiveTokensResponse{
		Success: true,
	}
	response.Data.Tokens = tokenResponses
	response.Data.Total = total
	response.Data.Limit = limit
	response.Data.Offset = offset

	return c.Status(fiber.StatusOK).JSON(response)
}
