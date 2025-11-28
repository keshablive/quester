// Package controller provides controller helper functions for request handling.
// CONSTITUTION: Context Propagation (MANDATORY) - Auth context MUST be extracted consistently.
package controller

import "errors"

// Controller errors
var (
	// ErrUnauthorized is returned when auth claims are missing or invalid.
	ErrUnauthorized = errors.New("unauthorized: missing or invalid claims")

	// ErrInvalidUserID is returned when the user ID in claims is not a valid UUID.
	ErrInvalidUserID = errors.New("invalid user ID in claims")

	// ErrInvalidTenantID is returned when the tenant ID in claims is not a valid UUID.
	ErrInvalidTenantID = errors.New("invalid tenant ID in claims")

	// ErrInvalidRole is returned when the role in claims is not valid.
	ErrInvalidRole = errors.New("invalid role in claims")

	// ErrValidationFailed is returned when request validation fails.
	ErrValidationFailed = errors.New("validation failed")

	// ErrInvalidJSON is returned when request body is not valid JSON.
	ErrInvalidJSON = errors.New("invalid JSON in request body")

	// ErrMissingRequestBody is returned when request body is empty.
	ErrMissingRequestBody = errors.New("missing request body")
)

// IsAuthError returns true if the error is an authentication-related error.
func IsAuthError(err error) bool {
	return errors.Is(err, ErrUnauthorized) ||
		errors.Is(err, ErrInvalidUserID) ||
		errors.Is(err, ErrInvalidTenantID) ||
		errors.Is(err, ErrInvalidRole)
}

// IsValidationError returns true if the error is a validation-related error.
func IsValidationError(err error) bool {
	return errors.Is(err, ErrValidationFailed) ||
		errors.Is(err, ErrInvalidJSON) ||
		errors.Is(err, ErrMissingRequestBody)
}
