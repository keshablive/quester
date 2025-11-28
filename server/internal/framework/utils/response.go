package utils

import (
	"github.com/gofiber/fiber/v2"
)

// Standardized API response structures
// CONSTITUTION: API-First Design - Consistent response format

// SuccessResponse represents a successful API response
type SuccessResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Message string      `json:"message,omitempty"`
	Meta    *Meta       `json:"meta,omitempty"`
}

// ErrorResponse represents an error API response
type ErrorResponse struct {
	Success bool         `json:"success"`
	Error   *ErrorDetail `json:"error"`
	Meta    *Meta        `json:"meta,omitempty"`
}

// ErrorDetail contains error information
type ErrorDetail struct {
	Code    string                 `json:"code"`
	Message string                 `json:"message"`
	Details map[string]interface{} `json:"details,omitempty"`
	Field   string                 `json:"field,omitempty"`
}

// Meta contains pagination and metadata
type Meta struct {
	Page       int `json:"page,omitempty"`
	PageSize   int `json:"page_size,omitempty"`
	Total      int `json:"total,omitempty"`
	TotalPages int `json:"total_pages,omitempty"`
}

// Standard error codes
const (
	ErrCodeBadRequest              = "BAD_REQUEST"
	ErrCodeUnauthorized            = "UNAUTHORIZED"
	ErrCodeForbidden               = "FORBIDDEN"
	ErrCodeNotFound                = "NOT_FOUND"
	ErrCodeConflict                = "CONFLICT"
	ErrCodeValidation              = "VALIDATION_ERROR"
	ErrCodeInternal                = "INTERNAL_ERROR"
	ErrCodeRateLimit               = "RATE_LIMIT_EXCEEDED"
	ErrCodeTenantMismatch          = "TENANT_MISMATCH"
	ErrCodeInsufficientPermissions = "INSUFFICIENT_PERMISSIONS"
)

// RespondSuccess sends a successful JSON response
func RespondSuccess(c *fiber.Ctx, data interface{}, message ...string) error {
	response := SuccessResponse{
		Success: true,
		Data:    data,
	}

	if len(message) > 0 {
		response.Message = message[0]
	}

	return c.JSON(response)
}

// RespondCreated sends a 201 Created response
func RespondCreated(c *fiber.Ctx, data interface{}, message ...string) error {
	response := SuccessResponse{
		Success: true,
		Data:    data,
	}

	if len(message) > 0 {
		response.Message = message[0]
	} else {
		response.Message = "Resource created successfully"
	}

	return c.Status(fiber.StatusCreated).JSON(response)
}

// RespondNoContent sends a 204 No Content response
func RespondNoContent(c *fiber.Ctx) error {
	return c.SendStatus(fiber.StatusNoContent)
}

// RespondPaginated sends a paginated response
func RespondPaginated(c *fiber.Ctx, data interface{}, page, pageSize, total int) error {
	totalPages := (total + pageSize - 1) / pageSize

	response := SuccessResponse{
		Success: true,
		Data:    data,
		Meta: &Meta{
			Page:       page,
			PageSize:   pageSize,
			Total:      total,
			TotalPages: totalPages,
		},
	}

	return c.JSON(response)
}

// RespondError sends an error JSON response
func RespondError(c *fiber.Ctx, statusCode int, code, message string, details ...map[string]interface{}) error {
	errorDetail := &ErrorDetail{
		Code:    code,
		Message: message,
	}

	if len(details) > 0 {
		errorDetail.Details = details[0]
	}

	response := ErrorResponse{
		Success: false,
		Error:   errorDetail,
	}

	return c.Status(statusCode).JSON(response)
}

// RespondBadRequest sends a 400 Bad Request response
func RespondBadRequest(c *fiber.Ctx, message string, details ...map[string]interface{}) error {
	return RespondError(c, fiber.StatusBadRequest, ErrCodeBadRequest, message, details...)
}

// RespondUnauthorized sends a 401 Unauthorized response
func RespondUnauthorized(c *fiber.Ctx, message ...string) error {
	msg := "Unauthorized - Authentication required"
	if len(message) > 0 {
		msg = message[0]
	}
	return RespondError(c, fiber.StatusUnauthorized, ErrCodeUnauthorized, msg)
}

// RespondForbidden sends a 403 Forbidden response
func RespondForbidden(c *fiber.Ctx, message ...string) error {
	msg := "Forbidden - Insufficient permissions"
	if len(message) > 0 {
		msg = message[0]
	}
	return RespondError(c, fiber.StatusForbidden, ErrCodeForbidden, msg)
}

// RespondNotFound sends a 404 Not Found response
func RespondNotFound(c *fiber.Ctx, resource ...string) error {
	msg := "Resource not found"
	if len(resource) > 0 {
		msg = resource[0] + " not found"
	}
	return RespondError(c, fiber.StatusNotFound, ErrCodeNotFound, msg)
}

// RespondConflict sends a 409 Conflict response
func RespondConflict(c *fiber.Ctx, message string, details ...map[string]interface{}) error {
	return RespondError(c, fiber.StatusConflict, ErrCodeConflict, message, details...)
}

// RespondValidationError sends a 422 Unprocessable Entity response
func RespondValidationError(c *fiber.Ctx, message string, field ...string) error {
	errorDetail := &ErrorDetail{
		Code:    ErrCodeValidation,
		Message: message,
	}

	if len(field) > 0 {
		errorDetail.Field = field[0]
	}

	response := ErrorResponse{
		Success: false,
		Error:   errorDetail,
	}

	return c.Status(fiber.StatusUnprocessableEntity).JSON(response)
}

// RespondInternalError sends a 500 Internal Server Error response
func RespondInternalError(c *fiber.Ctx, message ...string) error {
	msg := "An internal server error occurred"
	if len(message) > 0 {
		msg = message[0]
	}
	return RespondError(c, fiber.StatusInternalServerError, ErrCodeInternal, msg)
}

// RespondRateLimitExceeded sends a 429 Too Many Requests response
func RespondRateLimitExceeded(c *fiber.Ctx) error {
	return RespondError(c, fiber.StatusTooManyRequests, ErrCodeRateLimit, "Rate limit exceeded. Please try again later.")
}

// RespondTenantMismatch sends a 403 Forbidden response for tenant isolation violation
func RespondTenantMismatch(c *fiber.Ctx) error {
	return RespondError(c, fiber.StatusForbidden, ErrCodeTenantMismatch, "Access denied: Resource belongs to different tenant")
}

// HandleError is a centralized error handler that converts errors to standardized responses
func HandleError(c *fiber.Ctx, err error) error {
	// Check if it's a validation error
	if validationErr, ok := err.(*ValidationError); ok {
		return RespondValidationError(c, validationErr.Message, validationErr.Field)
	}

	// Check if it's a Fiber error
	if fiberErr, ok := err.(*fiber.Error); ok {
		switch fiberErr.Code {
		case fiber.StatusBadRequest:
			return RespondBadRequest(c, fiberErr.Message)
		case fiber.StatusUnauthorized:
			return RespondUnauthorized(c, fiberErr.Message)
		case fiber.StatusForbidden:
			return RespondForbidden(c, fiberErr.Message)
		case fiber.StatusNotFound:
			return RespondNotFound(c, fiberErr.Message)
		case fiber.StatusConflict:
			return RespondConflict(c, fiberErr.Message)
		case fiber.StatusTooManyRequests:
			return RespondRateLimitExceeded(c)
		default:
			return RespondError(c, fiberErr.Code, ErrCodeInternal, fiberErr.Message)
		}
	}

	// Default to internal server error
	return RespondInternalError(c, err.Error())
}
