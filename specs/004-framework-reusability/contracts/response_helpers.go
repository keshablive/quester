// Package responses provides enhanced response helpers with request_id.
// This is the CONTRACT file - actual implementation will enhance server/internal/framework/responses/
package contracts

import (
	"github.com/gofiber/fiber/v2"
)

// ErrorResponse is the standard error response format for all API endpoints.
// CONSTITUTION: Error Handling (MANDATORY) - Consistent error responses required.
//
// All error response helpers (BadRequest, Unauthorized, etc.) MUST return this format.
type ErrorResponse struct {
	// Success is always false for error responses
	Success bool `json:"success"`

	// Error is the human-readable error message
	Error string `json:"error"`

	// Code is the HTTP status code
	Code int `json:"code"`

	// RequestID is the unique request identifier for tracing
	// Correlates with X-Request-ID header and structured logs
	RequestID string `json:"request_id"`
}

// SuccessResponse is the standard success response format.
type SuccessResponse struct {
	// Success is always true for success responses
	Success bool `json:"success"`

	// Data contains the response payload
	Data interface{} `json:"data"`

	// Message is an optional human-readable message
	Message string `json:"message,omitempty"`
}

// PaginatedResponse extends SuccessResponse with pagination metadata.
type PaginatedResponse struct {
	// Success is always true
	Success bool `json:"success"`

	// Data contains the paginated items
	Data interface{} `json:"data"`

	// Pagination contains pagination metadata
	Pagination PaginationMeta `json:"pagination"`
}

// PaginationMeta contains pagination metadata.
type PaginationMeta struct {
	// Total is the total number of items across all pages
	Total int64 `json:"total"`

	// Page is the current page number (1-based)
	Page int `json:"page"`

	// Limit is the number of items per page
	Limit int `json:"limit"`

	// TotalPages is the total number of pages
	TotalPages int64 `json:"total_pages"`
}

// ResponseHelpers defines the contract for response utility functions.
// Implementation provides these as standalone functions in the responses package.
type ResponseHelpers interface {
	// Success returns a 200 OK response with data
	Success(c *fiber.Ctx, data interface{}) error

	// Created returns a 201 Created response with data
	Created(c *fiber.Ctx, data interface{}) error

	// NoContent returns a 204 No Content response
	NoContent(c *fiber.Ctx) error

	// SuccessWithPagination returns a 200 OK response with paginated data
	SuccessWithPagination(c *fiber.Ctx, data interface{}, total int64, page int, limit int) error

	// BadRequest returns a 400 Bad Request response with request_id
	// Format: {"success": false, "error": "message", "code": 400, "request_id": "uuid"}
	BadRequest(c *fiber.Ctx, message string) error

	// Unauthorized returns a 401 Unauthorized response with request_id
	Unauthorized(c *fiber.Ctx, message string) error

	// Forbidden returns a 403 Forbidden response with request_id
	Forbidden(c *fiber.Ctx, message string) error

	// NotFound returns a 404 Not Found response with request_id
	NotFound(c *fiber.Ctx, message string) error

	// InternalError returns a 500 Internal Server Error response with request_id
	InternalError(c *fiber.Ctx, message string) error

	// ValidationError returns a 422 Unprocessable Entity response with validation details
	ValidationError(c *fiber.Ctx, err error) error
}

// GetRequestID extracts the request ID from Fiber context.
// Uses the X-Request-ID header set by RequestID middleware.
func GetRequestID(c *fiber.Ctx) string {
	return c.GetRespHeader("X-Request-ID")
}

// NewErrorResponse creates a new ErrorResponse with the given parameters.
func NewErrorResponse(message string, code int, requestID string) ErrorResponse {
	return ErrorResponse{
		Success:   false,
		Error:     message,
		Code:      code,
		RequestID: requestID,
	}
}
