// Package pool provides connection pool management, monitoring, and optimization
// Task Reference: 010-connection-pool-tuning T002
package pool

import (
	"errors"
	"fmt"
)

// Pool error types for consistent error handling across the package
var (
	// ErrWarmupTimeout indicates warmup exceeded configured timeout
	ErrWarmupTimeout = errors.New("pool warmup timeout")

	// ErrWarmupPartial indicates partial warmup success (some connections failed)
	ErrWarmupPartial = errors.New("pool warmup partially succeeded")

	// ErrHealthCheckFailed indicates a health check failure
	ErrHealthCheckFailed = errors.New("health check failed")

	// ErrPoolUnhealthy indicates sustained health failures (3+ consecutive)
	ErrPoolUnhealthy = errors.New("pool in unhealthy state")

	// ErrAdaptiveDisabled indicates adaptive sizing operation when disabled
	ErrAdaptiveDisabled = errors.New("adaptive sizing disabled")

	// ErrInvalidConfig indicates configuration validation failure
	ErrInvalidConfig = errors.New("invalid pool configuration")

	// ErrPoolNotInitialized indicates pool operations before initialization
	ErrPoolNotInitialized = errors.New("pool not initialized")

	// ErrMetricsNotRegistered indicates metrics registration failure
	ErrMetricsNotRegistered = errors.New("pool metrics not registered")
)

// ConfigValidationError wraps configuration validation errors with context
type ConfigValidationError struct {
	Field   string
	Value   interface{}
	Message string
}

func (e *ConfigValidationError) Error() string {
	return fmt.Sprintf("invalid pool config: %s=%v - %s", e.Field, e.Value, e.Message)
}

// NewConfigValidationError creates a new ConfigValidationError
func NewConfigValidationError(field string, value interface{}, message string) *ConfigValidationError {
	return &ConfigValidationError{
		Field:   field,
		Value:   value,
		Message: message,
	}
}

// WarmupError wraps warmup failures with context
type WarmupError struct {
	Attempted int
	Succeeded int
	Err       error
}

func (e *WarmupError) Error() string {
	return fmt.Sprintf("warmup failed: %d/%d connections established: %v", e.Succeeded, e.Attempted, e.Err)
}

func (e *WarmupError) Unwrap() error {
	return e.Err
}

// NewWarmupError creates a new WarmupError
func NewWarmupError(attempted, succeeded int, err error) *WarmupError {
	return &WarmupError{
		Attempted: attempted,
		Succeeded: succeeded,
		Err:       err,
	}
}

// HealthCheckError wraps health check failures with context
type HealthCheckError struct {
	ConsecutiveFailures int
	LastError           error
}

func (e *HealthCheckError) Error() string {
	return fmt.Sprintf("health check failed: %d consecutive failures: %v", e.ConsecutiveFailures, e.LastError)
}

func (e *HealthCheckError) Unwrap() error {
	return e.LastError
}

// NewHealthCheckError creates a new HealthCheckError
func NewHealthCheckError(consecutiveFailures int, lastError error) *HealthCheckError {
	return &HealthCheckError{
		ConsecutiveFailures: consecutiveFailures,
		LastError:           lastError,
	}
}

// PoolError is a simple error type for pool operations
type PoolError struct {
	Message string
}

func (e *PoolError) Error() string {
	return e.Message
}

// NewPoolError creates a new PoolError with the given message
func NewPoolError(message string) *PoolError {
	return &PoolError{Message: message}
}
