// Package controller provides controller helper functions for request handling.
// CONSTITUTION: Security First (NON-NEGOTIABLE) - Input validation on all endpoints.
package controller

import (
	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
)

// validate is the shared validator instance
var validate = validator.New()

// ParseAndValidate parses JSON request body into T and validates using go-playground/validator.
// Returns error if parsing fails or validation fails.
//
// CONSTITUTION: Security First - All user input MUST be validated.
//
// Example:
//
//	var req CreateBadgeRequest
//	if err := controller.ParseAndValidate(c, &req); err != nil {
//	    return err // Error response already sent
//	}
//	// Use validated req
func ParseAndValidate[T any](c *fiber.Ctx, out *T) error {
	// Check for empty body
	if len(c.Body()) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success":    false,
			"error":      "missing request body",
			"code":       fiber.StatusBadRequest,
			"request_id": getRequestID(c),
		})
	}

	// Parse JSON body
	if err := c.BodyParser(out); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success":    false,
			"error":      "invalid JSON in request body",
			"code":       fiber.StatusBadRequest,
			"request_id": getRequestID(c),
		})
	}

	// Validate struct
	if err := validate.Struct(out); err != nil {
		// Format validation errors
		validationErrors := formatValidationErrors(err)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success":    false,
			"error":      "validation failed",
			"code":       fiber.StatusBadRequest,
			"details":    validationErrors,
			"request_id": getRequestID(c),
		})
	}

	return nil
}

// ParseBody parses JSON request body without validation.
// Use when validation is handled separately or not needed.
func ParseBody[T any](c *fiber.Ctx, out *T) error {
	if len(c.Body()) == 0 {
		return ErrMissingRequestBody
	}

	if err := c.BodyParser(out); err != nil {
		return ErrInvalidJSON
	}

	return nil
}

// ValidateStruct validates a struct using go-playground/validator.
// Use when struct was parsed elsewhere and only validation is needed.
func ValidateStruct(s interface{}) error {
	return validate.Struct(s)
}

// formatValidationErrors converts validator errors to a user-friendly format
func formatValidationErrors(err error) []map[string]string {
	var errors []map[string]string

	if validationErrors, ok := err.(validator.ValidationErrors); ok {
		for _, e := range validationErrors {
			errors = append(errors, map[string]string{
				"field":   e.Field(),
				"message": formatValidationMessage(e),
			})
		}
	} else {
		errors = append(errors, map[string]string{
			"field":   "unknown",
			"message": err.Error(),
		})
	}

	return errors
}

// formatValidationMessage creates a human-readable validation error message
func formatValidationMessage(e validator.FieldError) string {
	switch e.Tag() {
	case "required":
		return e.Field() + " is required"
	case "email":
		return e.Field() + " must be a valid email address"
	case "min":
		return e.Field() + " must be at least " + e.Param() + " characters"
	case "max":
		return e.Field() + " must be at most " + e.Param() + " characters"
	case "uuid":
		return e.Field() + " must be a valid UUID"
	case "oneof":
		return e.Field() + " must be one of: " + e.Param()
	case "gt":
		return e.Field() + " must be greater than " + e.Param()
	case "gte":
		return e.Field() + " must be greater than or equal to " + e.Param()
	case "lt":
		return e.Field() + " must be less than " + e.Param()
	case "lte":
		return e.Field() + " must be less than or equal to " + e.Param()
	default:
		return e.Field() + " failed " + e.Tag() + " validation"
	}
}

// getRequestID extracts request ID from Fiber context
func getRequestID(c *fiber.Ctx) string {
	// Try X-Request-ID header first (set by RequestID middleware)
	if rid := c.GetRespHeader("X-Request-ID"); rid != "" {
		return rid
	}
	// Try from request header
	if rid := c.Get("X-Request-ID"); rid != "" {
		return rid
	}
	return ""
}

// GetValidator returns the shared validator instance.
// Use this to add custom validators.
func GetValidator() *validator.Validate {
	return validate
}

// SetValidator replaces the shared validator instance.
// Use during initialization to configure custom validators.
func SetValidator(v *validator.Validate) {
	validate = v
}
