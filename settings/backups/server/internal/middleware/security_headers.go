package middleware

import (
	"github.com/gofiber/fiber/v2"
)

// SecurityHeaders adds OWASP-recommended security headers
// CONSTITUTION: Security by Design - Comprehensive security headers required
func SecurityHeaders() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Prevent MIME type sniffing
		c.Set("X-Content-Type-Options", "nosniff")

		// Enable XSS protection
		c.Set("X-XSS-Protection", "1; mode=block")

		// Prevent clickjacking
		c.Set("X-Frame-Options", "DENY")

		// Content Security Policy
		c.Set("Content-Security-Policy",
			"default-src 'self'; "+
				"script-src 'self' 'unsafe-inline' 'unsafe-eval'; "+
				"style-src 'self' 'unsafe-inline'; "+
				"img-src 'self' data: https:; "+
				"font-src 'self' data:; "+
				"connect-src 'self' https://api.quester.com wss://ws.quester.com; "+
				"media-src 'self' https://cdn.quester.com; "+
				"object-src 'none'; "+
				"base-uri 'self'; "+
				"form-action 'self'; "+
				"frame-ancestors 'none'; "+
				"upgrade-insecure-requests",
		)

		// Strict Transport Security (HSTS)
		// Only enable in production with HTTPS
		if c.Protocol() == "https" {
			c.Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
		}

		// Referrer Policy
		c.Set("Referrer-Policy", "strict-origin-when-cross-origin")

		// Permissions Policy (formerly Feature Policy)
		c.Set("Permissions-Policy",
			"geolocation=(self), "+
				"microphone=(), "+
				"camera=(), "+
				"payment=(), "+
				"usb=(), "+
				"magnetometer=(), "+
				"gyroscope=(), "+
				"accelerometer=()",
		)

		// Remove server header for security through obscurity
		c.Set("Server", "")

		return c.Next()
	}
}

// CORS configuration for API-first design
// CONSTITUTION: API-First Design - Proper CORS for mobile/web clients
func CORSConfig() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Allow mobile and web clients
		allowedOrigins := []string{
			"https://app.quester.com",
			"https://web.quester.com",
			"http://localhost:3000",  // Development
			"http://localhost:19006", // Expo dev
		}

		origin := c.Get("Origin")
		for _, allowed := range allowedOrigins {
			if origin == allowed {
				c.Set("Access-Control-Allow-Origin", origin)
				break
			}
		}

		c.Set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
		c.Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
		c.Set("Access-Control-Allow-Credentials", "true")
		c.Set("Access-Control-Max-Age", "86400") // 24 hours

		// Handle preflight requests
		if c.Method() == "OPTIONS" {
			return c.SendStatus(fiber.StatusNoContent)
		}

		return c.Next()
	}
}
