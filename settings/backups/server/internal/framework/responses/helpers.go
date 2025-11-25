// HTTP response helpers
package responses

import (
	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
)

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

// BadRequest returns a 400 Bad Request response
func BadRequest(c *fiber.Ctx, message string) error {
	return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
		"success": false,
		"error":   message,
	})
}

// Unauthorized returns a 401 Unauthorized response
func Unauthorized(c *fiber.Ctx, message string) error {
	return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
		"success": false,
		"error":   message,
	})
}

// Forbidden returns a 403 Forbidden response
func Forbidden(c *fiber.Ctx, message string) error {
	return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
		"success": false,
		"error":   message,
	})
}

// NotFound returns a 404 Not Found response
func NotFound(c *fiber.Ctx, message string) error {
	return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
		"success": false,
		"error":   message,
	})
}

// InternalError returns a 500 Internal Server Error response
func InternalError(c *fiber.Ctx, message string) error {
	return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
		"success": false,
		"error":   message,
	})
}

// ValidationError returns a 422 Unprocessable Entity response with validation errors
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
		"success": false,
		"error":   "Validation failed",
		"details": errors,
	})
}

// TooManyRequests returns a 429 Too Many Requests response
func TooManyRequests(c *fiber.Ctx, message string) error {
	return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
		"success": false,
		"error":   message,
	})
}

// HandleServiceError handles service layer errors and returns appropriate HTTP responses
func HandleServiceError(c *fiber.Ctx, err error) error {
	// You can add more sophisticated error handling here
	// For now, return a generic internal error
	return InternalError(c, err.Error())
}
