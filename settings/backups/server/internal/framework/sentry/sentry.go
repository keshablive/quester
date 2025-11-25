// Package sentry provides error tracking and performance monitoring integration
package sentry

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/getsentry/sentry-go"
	"github.com/gofiber/fiber/v2"
)

// Config holds Sentry configuration
type Config struct {
	DSN              string
	Environment      string
	Release          string
	TracesSampleRate float64
	Debug            bool
}

// Initialize initializes the Sentry SDK
func Initialize(cfg *Config) error {
	if cfg.DSN == "" {
		return fmt.Errorf("sentry DSN is required")
	}

	err := sentry.Init(sentry.ClientOptions{
		Dsn:              cfg.DSN,
		Environment:      cfg.Environment,
		Release:          cfg.Release,
		TracesSampleRate: cfg.TracesSampleRate,
		Debug:            cfg.Debug,
		AttachStacktrace: true,
		BeforeSend: func(event *sentry.Event, hint *sentry.EventHint) *sentry.Event {
			// Filter out sensitive data
			if event.Request != nil {
				// Remove authorization header
				if event.Request.Headers != nil {
					delete(event.Request.Headers, "Authorization")
					delete(event.Request.Headers, "authorization")
				}
				// Remove cookies
				event.Request.Cookies = ""
			}
			return event
		},
	})

	if err != nil {
		return fmt.Errorf("failed to initialize sentry: %w", err)
	}

	return nil
}

// Close flushes any pending events and closes the Sentry client
func Close() {
	sentry.Flush(5 * time.Second)
}

// CaptureError captures an error and sends it to Sentry
func CaptureError(err error) *sentry.EventID {
	return sentry.CaptureException(err)
}

// CaptureMessage captures a message and sends it to Sentry
func CaptureMessage(message string) *sentry.EventID {
	return sentry.CaptureMessage(message)
}

// CaptureErrorWithContext captures an error with additional context
func CaptureErrorWithContext(err error, ctx map[string]interface{}) *sentry.EventID {
	scope := sentry.CurrentHub().PushScope()
	defer sentry.CurrentHub().PopScope()

	for key, value := range ctx {
		// SetContext expects a Context (map[string]interface{})
		if contextMap, ok := value.(map[string]interface{}); ok {
			scope.SetContext(key, contextMap)
		} else {
			// If not a map, convert to a simple context
			scope.SetContext(key, map[string]interface{}{"value": value})
		}
	}

	return sentry.CaptureException(err)
}

// SetUser sets the user context for error tracking
func SetUser(userID, username, email string) {
	sentry.ConfigureScope(func(scope *sentry.Scope) {
		scope.SetUser(sentry.User{
			ID:       userID,
			Username: username,
			Email:    email,
		})
	})
}

// SetTag sets a tag for the current scope
func SetTag(key, value string) {
	sentry.ConfigureScope(func(scope *sentry.Scope) {
		scope.SetTag(key, value)
	})
}

// SetExtra sets extra data for the current scope
func SetExtra(key string, value interface{}) {
	sentry.ConfigureScope(func(scope *sentry.Scope) {
		scope.SetExtra(key, value)
	})
}

// StartTransaction starts a new performance monitoring transaction
func StartTransaction(name, op string) *sentry.Span {
	ctx := context.Background()
	span := sentry.StartSpan(ctx, op, sentry.WithTransactionName(name))
	return span
}

// FinishTransaction finishes a transaction
func FinishTransaction(span *sentry.Span) {
	if span != nil {
		span.Finish()
	}
}

// Middleware returns a Fiber middleware that captures errors and performance metrics
func Middleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Start transaction for performance monitoring
		ctx := c.Context()
		transactionName := fmt.Sprintf("%s %s", c.Method(), c.Route().Path)
		span := sentry.StartSpan(ctx, "http.server", sentry.WithTransactionName(transactionName))
		defer span.Finish()

		// Set request context
		span.SetTag("http.method", c.Method())
		span.SetTag("http.route", c.Route().Path)
		span.SetTag("http.url", c.OriginalURL())

		// Extract user from JWT token if available
		if userID := c.Locals("user_id"); userID != nil {
			span.SetTag("user.id", fmt.Sprintf("%v", userID))
		}
		if tenantID := c.Locals("tenant_id"); tenantID != nil {
			span.SetTag("tenant.id", fmt.Sprintf("%v", tenantID))
		}

		// Execute request
		err := c.Next()

		// Capture errors
		if err != nil {
			// Create Sentry hub for this request
			hub := sentry.CurrentHub().Clone()

			// Convert Fiber request to http.Request for Sentry
			httpReq, _ := http.NewRequest(
				c.Method(),
				c.OriginalURL(),
				nil,
			)
			hub.Scope().SetRequest(httpReq)

			// Set user context if available
			if userID := c.Locals("user_id"); userID != nil {
				hub.Scope().SetUser(sentry.User{
					ID: fmt.Sprintf("%v", userID),
				})
			}

			// Set additional context
			hub.Scope().SetContext("request", map[string]interface{}{
				"method":    c.Method(),
				"path":      c.Path(),
				"route":     c.Route().Path,
				"ip":        c.IP(),
				"user_id":   c.Locals("user_id"),
				"tenant_id": c.Locals("tenant_id"),
			})

			// Capture the error
			hub.CaptureException(err)
		}

		// Set status code tag
		statusCode := c.Response().StatusCode()
		span.SetTag("http.status_code", fmt.Sprintf("%d", statusCode))

		// Mark transaction as error if status code >= 500
		if statusCode >= 500 {
			span.Status = sentry.SpanStatusInternalError
		} else if statusCode >= 400 {
			span.Status = sentry.SpanStatusInvalidArgument
		} else {
			span.Status = sentry.SpanStatusOK
		}

		return err
	}
}

// RecoverMiddleware recovers from panics and sends them to Sentry
func RecoverMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		defer func() {
			if r := recover(); r != nil {
				var err error
				switch x := r.(type) {
				case string:
					err = fmt.Errorf("panic: %s", x)
				case error:
					err = fmt.Errorf("panic: %w", x)
				default:
					err = fmt.Errorf("panic: %v", x)
				}

				// Create Sentry hub
				hub := sentry.CurrentHub().Clone()
				hub.Scope().SetLevel(sentry.LevelFatal)

				// Convert Fiber request to http.Request for Sentry
				httpReq, _ := http.NewRequest(
					c.Method(),
					c.OriginalURL(),
					nil,
				)
				hub.Scope().SetRequest(httpReq)

				// Set user context if available
				if userID := c.Locals("user_id"); userID != nil {
					hub.Scope().SetUser(sentry.User{
						ID: fmt.Sprintf("%v", userID),
					})
				}

				// Capture the panic
				hub.CaptureException(err)
				hub.Flush(2 * time.Second)

				// Return 500 error
				_ = c.Status(500).JSON(fiber.Map{
					"error": "Internal server error",
				})
			}
		}()

		return c.Next()
	}
}

// getHeaders extracts HTTP headers from Fiber context
func getHeaders(c *fiber.Ctx) map[string]string {
	headers := make(map[string]string)
	c.Request().Header.VisitAll(func(key, value []byte) {
		keyStr := string(key)
		// Skip sensitive headers
		if keyStr != "Authorization" && keyStr != "Cookie" {
			headers[keyStr] = string(value)
		}
	})
	return headers
}

// CaptureSlowRequest captures slow requests for performance analysis
func CaptureSlowRequest(c *fiber.Ctx, duration time.Duration, threshold time.Duration) {
	if duration > threshold {
		sentry.WithScope(func(scope *sentry.Scope) {
			scope.SetLevel(sentry.LevelWarning)
			scope.SetTag("performance", "slow_request")
			scope.SetTag("http.method", c.Method())
			scope.SetTag("http.route", c.Route().Path)
			scope.SetExtra("duration_ms", duration.Milliseconds())
			scope.SetExtra("threshold_ms", threshold.Milliseconds())

			if userID := c.Locals("user_id"); userID != nil {
				scope.SetTag("user.id", fmt.Sprintf("%v", userID))
			}

			sentry.CaptureMessage(fmt.Sprintf("Slow request: %s %s (%dms)",
				c.Method(), c.Route().Path, duration.Milliseconds()))
		})
	}
}

// AddBreadcrumb adds a breadcrumb for debugging
func AddBreadcrumb(category, message string, level sentry.Level, data map[string]interface{}) {
	sentry.AddBreadcrumb(&sentry.Breadcrumb{
		Category:  category,
		Message:   message,
		Level:     level,
		Data:      data,
		Timestamp: time.Now(),
	})
}
