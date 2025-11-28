package utils

import (
	"errors"
	"fmt"

	"gorm.io/gorm"
)

// Common repository and service errors
var (
	// ErrNotFound is returned when an entity is not found
	ErrNotFound = errors.New("entity not found")

	// ErrAccessDenied is returned when tenant access is denied
	ErrAccessDenied = errors.New("access denied")

	// ErrInvalidInput is returned for invalid input data
	ErrInvalidInput = errors.New("invalid input")

	// Service-level errors
	ErrAlreadyExists     = errors.New("resource already exists")
	ErrUnauthorized      = errors.New("unauthorized access")
	ErrForbidden         = errors.New("forbidden action")
	ErrOperationFailed   = errors.New("operation failed")
	ErrExternalService   = errors.New("external service error")
	ErrRateLimitExceeded = errors.New("rate limit exceeded")
)

// WrapDBError wraps a database error with contextual information
// This standardizes error handling across all repositories
//
// Usage:
//
//	if err := db.Create(&entity).Error; err != nil {
//	    return WrapDBError(err, "create", "user", userID.String())
//	}
func WrapDBError(err error, operation, entityType, entityID string) error {
	if err == nil {
		return nil
	}

	// Handle GORM specific errors
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return fmt.Errorf("%s not found: %s", entityType, entityID)
	}

	// Wrap with operation context
	return fmt.Errorf("failed to %s %s: %w", operation, entityType, err)
}

// WrapNotFoundError creates a standardized "not found" error
func WrapNotFoundError(entityType, entityID string) error {
	return fmt.Errorf("%s not found: %s", entityType, entityID)
}

// WrapCreateError wraps an error from a Create operation
func WrapCreateError(err error, entityType string) error {
	if err == nil {
		return nil
	}
	return fmt.Errorf("failed to create %s: %w", entityType, err)
}

// WrapFindError wraps an error from a Find operation
// Automatically converts GORM ErrRecordNotFound to a formatted error
func WrapFindError(err error, entityType, entityID string) error {
	if err == nil {
		return nil
	}
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return WrapNotFoundError(entityType, entityID)
	}
	return fmt.Errorf("failed to find %s: %w", entityType, err)
}

// WrapUpdateError wraps an error from an Update operation
func WrapUpdateError(err error, entityType string) error {
	if err == nil {
		return nil
	}
	return fmt.Errorf("failed to update %s: %w", entityType, err)
}

// WrapDeleteError wraps an error from a Delete operation
func WrapDeleteError(err error, entityType string) error {
	if err == nil {
		return nil
	}
	return fmt.Errorf("failed to delete %s: %w", entityType, err)
}

// WrapListError wraps an error from a List operation
func WrapListError(err error, entityType string) error {
	if err == nil {
		return nil
	}
	return fmt.Errorf("failed to list %s: %w", entityType, err)
}

// WrapCountError wraps an error from a Count operation
func WrapCountError(err error, entityType string) error {
	if err == nil {
		return nil
	}
	return fmt.Errorf("failed to count %s: %w", entityType, err)
}

// CheckRowsAffected checks if any rows were affected by an operation
// Returns a "not found" error if no rows were affected
func CheckRowsAffected(result *gorm.DB, entityType, entityID string) error {
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return WrapNotFoundError(entityType, entityID)
	}
	return nil
}

// Service-level error handling functions

// WrapServiceError wraps a generic service error with context
func WrapServiceError(operation string, err error) error {
	if err == nil {
		return nil
	}
	return fmt.Errorf("service error during %s: %w", operation, err)
}

// WrapNotFoundErrorWithID creates a "not found" error with flexible identifier
func WrapNotFoundErrorWithID(entityType string, identifier interface{}) error {
	return fmt.Errorf("%s not found: %v", entityType, identifier)
}

// WrapAlreadyExistsError creates an error indicating a resource already exists
func WrapAlreadyExistsError(entityType string, identifier interface{}) error {
	return fmt.Errorf("%s already exists: %v", entityType, identifier)
}

// WrapExternalServiceError wraps an external service call error
func WrapExternalServiceError(serviceName string, err error) error {
	if err == nil {
		return nil
	}
	return fmt.Errorf("external service error (%s): %w", serviceName, err)
}

// WrapValidationError wraps a validation error with details
func WrapValidationError(field string, message string) error {
	return fmt.Errorf("validation failed for %s: %s", field, message)
}

// IsNotFoundError checks if the error is a "not found" error
func IsNotFoundError(err error) bool {
	return errors.Is(err, ErrNotFound) || errors.Is(err, gorm.ErrRecordNotFound)
}

// IsValidationError checks if the error is a validation error
func IsValidationError(err error) bool {
	return errors.Is(err, ErrInvalidInput)
}

// IsAuthorizationError checks if the error is an authorization error
func IsAuthorizationError(err error) bool {
	return errors.Is(err, ErrAccessDenied) || errors.Is(err, ErrUnauthorized) || errors.Is(err, ErrForbidden)
}
