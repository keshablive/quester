package middleware

import (
	"os"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

// JWTConfig holds JWT middleware configuration
type JWTConfig struct {
	SigningKey       []byte
	SigningAlgorithm string
}

// DefaultJWTConfig returns default JWT configuration
func DefaultJWTConfig() JWTConfig {
	return JWTConfig{
		SigningKey:       []byte(os.Getenv("JWT_SECRET")),
		SigningAlgorithm: "RS256",
	}
}

// JWTMiddleware validates JWT tokens and extracts claims
// CONSTITUTION: Security by Design - RS256 JWT authentication required
func JWTMiddleware(config ...JWTConfig) fiber.Handler {
	cfg := DefaultJWTConfig()
	if len(config) > 0 {
		cfg = config[0]
	}

	return func(c *fiber.Ctx) error {
		// Extract Authorization header
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Missing authorization header",
			})
		}

		// Validate Bearer token format
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid authorization header format. Expected: Bearer <token>",
			})
		}

		tokenString := parts[1]

		// Parse and validate JWT token
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			// Validate signing algorithm
			if token.Method.Alg() != cfg.SigningAlgorithm {
				return nil, fiber.NewError(fiber.StatusUnauthorized, "Invalid signing algorithm")
			}
			return cfg.SigningKey, nil
		})

		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error":   "Invalid or expired token",
				"details": err.Error(),
			})
		}

		if !token.Valid {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid token",
			})
		}

		// Store token in context for downstream middleware (TenantMiddleware)
		c.Locals("user", token)

		return c.Next()
	}
}

// OptionalJWT allows routes to work with or without authentication
// Useful for public endpoints that have enhanced features for authenticated users
func OptionalJWT(config ...JWTConfig) fiber.Handler {
	cfg := DefaultJWTConfig()
	if len(config) > 0 {
		cfg = config[0]
	}

	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			// No token provided, continue without user context
			return c.Next()
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			// Invalid format, continue without user context
			return c.Next()
		}

		tokenString := parts[1]
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if token.Method.Alg() != cfg.SigningAlgorithm {
				return nil, fiber.NewError(fiber.StatusUnauthorized, "Invalid signing algorithm")
			}
			return cfg.SigningKey, nil
		})

		if err == nil && token.Valid {
			// Valid token, store in context
			c.Locals("user", token)
		}

		return c.Next()
	}
}
