// Package repository provides generic repository patterns with multi-tenant support.
// CONSTITUTION: Multi-Tenancy (NON-NEGOTIABLE) - All queries MUST filter by TenantID.
package repository

import "errors"

// Repository errors
var (
	// ErrRecordNotFound is returned when a record is not found in the database.
	ErrRecordNotFound = errors.New("record not found")

	// ErrTenantIDMissing is returned when TenantID is not present in context.
	ErrTenantIDMissing = errors.New("tenant ID missing from context")

	// ErrTenantIDMismatch is returned when entity TenantID doesn't match context TenantID.
	ErrTenantIDMismatch = errors.New("tenant ID mismatch: entity belongs to different tenant")

	// ErrInvalidTenantID is returned when TenantID is not a valid UUID.
	ErrInvalidTenantID = errors.New("invalid tenant ID")

	// ErrDuplicateKey is returned when a unique constraint is violated.
	ErrDuplicateKey = errors.New("duplicate key violation")

	// ErrForeignKeyViolation is returned when a foreign key constraint is violated.
	ErrForeignKeyViolation = errors.New("foreign key violation")

	// ErrDatabaseError is returned for general database errors.
	ErrDatabaseError = errors.New("database error")

	// ErrModelNotTenantScoped is returned when a model doesn't implement TenantModel interface.
	ErrModelNotTenantScoped = errors.New("model must implement TenantModel interface")
)

// IsNotFound returns true if the error is a record not found error.
func IsNotFound(err error) bool {
	return errors.Is(err, ErrRecordNotFound)
}

// IsTenantError returns true if the error is a tenant-related error.
func IsTenantError(err error) bool {
	return errors.Is(err, ErrTenantIDMissing) ||
		errors.Is(err, ErrTenantIDMismatch) ||
		errors.Is(err, ErrInvalidTenantID)
}
