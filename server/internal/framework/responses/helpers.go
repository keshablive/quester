// HTTP response helpers
// 008-api-response-optimization: Updated with V2 envelope support and field filtering
package responses

import (
	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/keshablive/quester/internal/framework/middleware"
)

// getRequestID extracts request ID from Fiber context
func getRequestID(c *fiber.Ctx) string {
	// Try from context locals first (set by RequestID middleware)
	if rid, ok := c.Locals("requestid").(string); ok && rid != "" {
		return rid
	}
	// Try X-Request-ID header (set by RequestID middleware)
	if rid := c.GetRespHeader("X-Request-ID"); rid != "" {
		return rid
	}
	// Try from request header
	if rid := c.Get("X-Request-ID"); rid != "" {
		return rid
	}
	return ""
}

// Success returns a 200 OK response with data
func Success(c *fiber.Ctx, data interface{}) error {
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"data":    data,
	})
}

// SuccessResponse creates a success response with a custom message
func SuccessResponse(data interface{}, message string) fiber.Map {
	return fiber.Map{
		"success": true,
		"data":    data,
		"message": message,
	}
}

// NoContent returns a 204 No Content response
func NoContent(c *fiber.Ctx) error {
	return c.SendStatus(fiber.StatusNoContent)
}

// Created returns a 201 Created response with data
func Created(c *fiber.Ctx, data interface{}) error {
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"data":    data,
	})
}

// SuccessWithMeta returns a 200 OK response with data and metadata
func SuccessWithMeta(c *fiber.Ctx, data interface{}, meta map[string]interface{}) error {
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"data":    data,
		"meta":    meta,
	})
}

// SuccessWithPagination returns a 200 OK response with paginated data
func SuccessWithPagination(c *fiber.Ctx, data interface{}, total int64, page int, limit int) error {
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"data":    data,
		"pagination": fiber.Map{
			"total":       total,
			"page":        page,
			"limit":       limit,
			"total_pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}

// BadRequest returns a 400 Bad Request response with request_id for tracing.
// CONSTITUTION: Error Handling - All error responses MUST include request_id.
func BadRequest(c *fiber.Ctx, message string) error {
	return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
		"success":    false,
		"error":      message,
		"code":       fiber.StatusBadRequest,
		"request_id": getRequestID(c),
	})
}

// Unauthorized returns a 401 Unauthorized response with request_id for tracing.
// CONSTITUTION: Error Handling - All error responses MUST include request_id.
func Unauthorized(c *fiber.Ctx, message string) error {
	return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
		"success":    false,
		"error":      message,
		"code":       fiber.StatusUnauthorized,
		"request_id": getRequestID(c),
	})
}

// Forbidden returns a 403 Forbidden response with request_id for tracing.
// CONSTITUTION: Error Handling - All error responses MUST include request_id.
func Forbidden(c *fiber.Ctx, message string) error {
	return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
		"success":    false,
		"error":      message,
		"code":       fiber.StatusForbidden,
		"request_id": getRequestID(c),
	})
}

// NotFound returns a 404 Not Found response with request_id for tracing.
// CONSTITUTION: Error Handling - All error responses MUST include request_id.
func NotFound(c *fiber.Ctx, message string) error {
	return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
		"success":    false,
		"error":      message,
		"code":       fiber.StatusNotFound,
		"request_id": getRequestID(c),
	})
}

// InternalError returns a 500 Internal Server Error response with request_id for tracing.
// CONSTITUTION: Error Handling - All error responses MUST include request_id.
func InternalError(c *fiber.Ctx, message string) error {
	return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
		"success":    false,
		"error":      message,
		"code":       fiber.StatusInternalServerError,
		"request_id": getRequestID(c),
	})
}

// ValidationError returns a 422 Unprocessable Entity response with validation errors and request_id.
// CONSTITUTION: Error Handling - All error responses MUST include request_id.
func ValidationError(c *fiber.Ctx, err error) error {
	var errors []string

	if validationErrors, ok := err.(validator.ValidationErrors); ok {
		for _, e := range validationErrors {
			errors = append(errors, e.Error())
		}
	} else {
		errors = append(errors, err.Error())
	}

	return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{
		"success":    false,
		"error":      "Validation failed",
		"details":    errors,
		"code":       fiber.StatusUnprocessableEntity,
		"request_id": getRequestID(c),
	})
}

// TooManyRequests returns a 429 Too Many Requests response with request_id.
// CONSTITUTION: Error Handling - All error responses MUST include request_id.
func TooManyRequests(c *fiber.Ctx, message string) error {
	return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
		"success":    false,
		"error":      message,
		"code":       fiber.StatusTooManyRequests,
		"request_id": getRequestID(c),
	})
}

// Conflict returns a 409 Conflict response with request_id.
// CONSTITUTION: Error Handling - All error responses MUST include request_id.
func Conflict(c *fiber.Ctx, message string) error {
	return c.Status(fiber.StatusConflict).JSON(fiber.Map{
		"success":    false,
		"error":      message,
		"code":       fiber.StatusConflict,
		"request_id": getRequestID(c),
	})
}

// HandleServiceError handles service layer errors and returns appropriate HTTP responses.
// Maps service errors to their appropriate HTTP status codes.
func HandleServiceError(c *fiber.Ctx, err error) error {
	// Check for common service errors and map to appropriate HTTP codes
	errMsg := err.Error()
	switch {
	case errMsg == "not found":
		return NotFound(c, "Resource not found")
	case errMsg == "conflict: resource already exists":
		return Conflict(c, "Resource already exists")
	case errMsg == "permission denied":
		return Forbidden(c, "Permission denied")
	case errMsg == "invalid input":
		return BadRequest(c, "Invalid input")
	default:
		return InternalError(c, errMsg)
	}
}

// =============================================================================
// V2 Response Helpers (008-api-response-optimization)
// =============================================================================

// SuccessV2 returns a 200 OK response with V2 envelope format.
// FR-011: Wrap all successful responses in { "data": ..., "meta": {...} }
// T027: V2 envelope helper
func SuccessV2(c *fiber.Ctx, data interface{}) error {
	envelope := NewEnvelope(data).
		WithRequestID(getRequestID(c)).
		Build()

	return c.Status(fiber.StatusOK).JSON(envelope)
}

// SuccessV2WithPagination returns a 200 OK response with V2 envelope and pagination.
// FR-012: Include pagination metadata for list endpoints
func SuccessV2WithPagination(c *fiber.Ctx, data interface{}, total int64, page, limit int) error {
	envelope := NewEnvelope(data).
		WithRequestID(getRequestID(c)).
		WithPagination(page, limit, total).
		Build()

	return c.Status(fiber.StatusOK).JSON(envelope)
}

// ErrorV2 returns an error response with V2 envelope format.
// FR-013: Wrap all error responses in { "error": { "code": ..., "message": ..., "details": [...] } }
// T028: V2 error envelope helper
func ErrorV2(c *fiber.Ctx, code int, message string) error {
	envelope := NewErrorEnvelope(code, message).
		WithRequestID(getRequestID(c)).
		Build()

	return c.Status(code).JSON(envelope)
}

// ErrorV2WithDetails returns an error response with V2 envelope and error details.
func ErrorV2WithDetails(c *fiber.Ctx, code int, message string, details ...ErrorDetail) error {
	envelope := NewErrorEnvelope(code, message).
		WithRequestID(getRequestID(c)).
		WithErrorDetails(details...).
		Build()

	return c.Status(code).JSON(envelope)
}

// =============================================================================
// Field-Filtered Response Helpers (008-api-response-optimization)
// =============================================================================

// SuccessWithFields returns a response with sparse fieldset filtering.
// FR-001: Support ?fields=field1,field2,field3 query parameter
// FR-003: Ignore invalid/unknown field names silently
// FR-004: Return full response when fields parameter is omitted
// T014: SuccessWithFields helper
func SuccessWithFields(c *fiber.Ctx, data interface{}) error {
	// Get requested fields from context (set by Fields middleware)
	requestedFields := middleware.GetRequestedFields(c)

	// If no field selection, return full response (with sensitive fields removed)
	if requestedFields == nil {
		// Still need to remove sensitive fields
		selector := ParseFields("")
		result := selector.FilterData(data)
		return Success(c, result.Data)
	}

	// Parse and apply field filtering
	selector := ParseFieldsFromSlice(requestedFields)
	result := selector.FilterData(data)

	// Check API version for response format
	if middleware.IsV2Request(c) {
		builder := NewEnvelope(result.Data).
			WithRequestID(getRequestID(c)).
			WithFields(result.ValidFields, result.OmittedFields)

		// Add warning if all fields were invalid
		if result.AllInvalid {
			builder.WithWarnings(result.Warning)
		}

		return c.Status(fiber.StatusOK).JSON(builder.Build())
	}

	// V1 format: include field metadata in response
	response := fiber.Map{
		"success": true,
		"data":    result.Data,
	}

	// Add field metadata if selection was made
	if selector.HasSelection {
		response["meta"] = fiber.Map{
			"fields":  result.ValidFields,
			"omitted": result.OmittedFields,
		}
		if result.AllInvalid {
			response["warning"] = result.Warning
		}
	}

	return c.Status(fiber.StatusOK).JSON(response)
}

// SuccessWithPaginationAndFields returns a paginated response with sparse fieldset filtering.
// FR-005: Apply field filtering to list endpoints
// T015: SuccessWithPaginationAndFields helper
func SuccessWithPaginationAndFields(c *fiber.Ctx, data []interface{}, total int64, page, limit int) error {
	// Get requested fields from context
	requestedFields := middleware.GetRequestedFields(c)

	// Parse and apply field filtering
	var selector *FieldSelector
	if requestedFields == nil {
		selector = ParseFields("")
	} else {
		selector = ParseFieldsFromSlice(requestedFields)
	}

	result := selector.FilterSlice(data)

	// Check API version for response format
	if middleware.IsV2Request(c) {
		builder := NewEnvelope(result.Data).
			WithRequestID(getRequestID(c)).
			WithPagination(page, limit, total)

		if selector.HasSelection {
			builder.WithFields(result.ValidFields, result.OmittedFields)
		}

		if result.AllInvalid {
			builder.WithWarnings(result.Warning)
		}

		return c.Status(fiber.StatusOK).JSON(builder.Build())
	}

	// V1 format
	response := fiber.Map{
		"success": true,
		"data":    result.Data,
		"pagination": fiber.Map{
			"total":       total,
			"page":        page,
			"limit":       limit,
			"total_pages": (total + int64(limit) - 1) / int64(limit),
		},
	}

	// Add field metadata if selection was made
	if selector.HasSelection {
		response["meta"] = fiber.Map{
			"fields":  result.ValidFields,
			"omitted": result.OmittedFields,
		}
		if result.AllInvalid {
			response["warning"] = result.Warning
		}
	}

	return c.Status(fiber.StatusOK).JSON(response)
}

// =============================================================================
// Auto-Format Response Helpers (008-api-response-optimization)
// =============================================================================

// AutoSuccess returns a response in the appropriate format based on Accept header.
// T031: Check API version and use appropriate format
func AutoSuccess(c *fiber.Ctx, data interface{}) error {
	if middleware.IsV2Request(c) {
		return SuccessV2(c, data)
	}
	return Success(c, data)
}

// AutoSuccessWithPagination returns a paginated response in the appropriate format.
func AutoSuccessWithPagination(c *fiber.Ctx, data interface{}, total int64, page, limit int) error {
	if middleware.IsV2Request(c) {
		return SuccessV2WithPagination(c, data, total, page, limit)
	}
	return SuccessWithPagination(c, data, total, page, limit)
}

// AutoError returns an error response in the appropriate format based on Accept header.
func AutoError(c *fiber.Ctx, code int, message string) error {
	if middleware.IsV2Request(c) {
		return ErrorV2(c, code, message)
	}

	// V1 format
	return c.Status(code).JSON(fiber.Map{
		"success":    false,
		"error":      message,
		"code":       code,
		"request_id": getRequestID(c),
	})
}
