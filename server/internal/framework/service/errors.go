// Package service provides base service patterns and transaction management.
// CONSTITUTION: Error Handling (MANDATORY) - Wrap errors with context.
package service

import "errors"

// Service errors
var (
	// ErrNotFound is returned when a requested entity is not found.
	// Use this error when converting from repository.ErrRecordNotFound.
	ErrNotFound = errors.New("not found")

	// ErrConflict is returned when an operation conflicts with existing data.
	ErrConflict = errors.New("conflict: resource already exists")

	// ErrInvalidInput is returned when service receives invalid input.
	ErrInvalidInput = errors.New("invalid input")

	// ErrOperationFailed is returned when an operation fails for an unspecified reason.
	ErrOperationFailed = errors.New("operation failed")

	// ErrTransactionFailed is returned when a database transaction fails.
	ErrTransactionFailed = errors.New("transaction failed")

	// ErrSavepointFailed is returned when a savepoint operation fails.
	ErrSavepointFailed = errors.New("savepoint operation failed")

	// ErrPermissionDenied is returned when user lacks permission for an operation.
	ErrPermissionDenied = errors.New("permission denied")
)

// IsNotFound returns true if the error is a not found error.
func IsNotFound(err error) bool {
	return errors.Is(err, ErrNotFound)
}

// IsConflict returns true if the error is a conflict error.
func IsConflict(err error) bool {
	return errors.Is(err, ErrConflict)
}

// IsTransactionError returns true if the error is a transaction-related error.
func IsTransactionError(err error) bool {
	return errors.Is(err, ErrTransactionFailed) ||
		errors.Is(err, ErrSavepointFailed)
}

// ConvertGormError converts GORM-specific errors to service layer errors.
// This provides a clean abstraction between the data layer and service layer.
//
// CONSTITUTION: Error Handling - Database errors MUST be converted to domain errors.
//
// Conversion mapping:
//   - gorm.ErrRecordNotFound → ErrNotFound
//   - gorm.ErrDuplicatedKey → ErrConflict
//   - Other errors → wrapped with context
//
// Example:
//
//	result, err := repo.FindByID(ctx, id)
//	if err != nil {
//	    return service.ConvertGormError(err, "failed to fetch user")
//	}
func ConvertGormError(err error, context string) error {
	if err == nil {
		return nil
	}

	// Import gorm errors for comparison
	// These are hardcoded strings to avoid importing gorm in the service package
	// gorm.ErrRecordNotFound.Error() == "record not found"
	// gorm.ErrDuplicatedKey.Error() == "duplicated key not allowed"
	switch err.Error() {
	case "record not found":
		return ErrNotFound
	case "duplicated key not allowed":
		return ErrConflict
	default:
		if context != "" {
			return errors.New(context + ": " + err.Error())
		}
		return err
	}
}

// WrapError wraps an error with additional context while preserving the error chain.
// Use this for adding context to errors without losing the original error type.
//
// Example:
//
//	if err := repo.Create(ctx, entity); err != nil {
//	    return service.WrapError(err, "failed to create entity")
//	}
func WrapError(err error, context string) error {
	if err == nil {
		return nil
	}
	if context == "" {
		return err
	}
	return errors.New(context + ": " + err.Error())
}
