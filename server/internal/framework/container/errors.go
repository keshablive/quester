package container

import "fmt"

// ErrServiceNotRegistered is returned when attempting to resolve a service that hasn't been registered
type ErrServiceNotRegistered struct {
	ServiceName string
}

func (e *ErrServiceNotRegistered) Error() string {
	return fmt.Sprintf("service not registered: %s", e.ServiceName)
}

// ErrCircularDependency is returned when a circular dependency is detected during resolution
type ErrCircularDependency struct {
	ServiceName string
	Chain       []string
}

func (e *ErrCircularDependency) Error() string {
	return fmt.Sprintf("circular dependency detected for service '%s': %v", e.ServiceName, e.Chain)
}

// ErrInitializationFailed is returned when a service factory function fails
type ErrInitializationFailed struct {
	ServiceName string
	Cause       error
}

func (e *ErrInitializationFailed) Error() string {
	return fmt.Sprintf("failed to initialize service '%s': %v", e.ServiceName, e.Cause)
}

func (e *ErrInitializationFailed) Unwrap() error {
	return e.Cause
}

// ErrInvalidFactory is returned when a nil factory function is provided during registration
type ErrInvalidFactory struct {
	ServiceName string
}

func (e *ErrInvalidFactory) Error() string {
	return fmt.Sprintf("invalid factory function for service: %s", e.ServiceName)
}

// ErrMissingConfiguration is returned when required configuration is missing for a service (T124)
type ErrMissingConfiguration struct {
	ServiceName string
	ConfigKey   string
	Hint        string
}

func (e *ErrMissingConfiguration) Error() string {
	msg := fmt.Sprintf("missing required configuration for service '%s': %s", e.ServiceName, e.ConfigKey)
	if e.Hint != "" {
		msg += fmt.Sprintf(" (hint: %s)", e.Hint)
	}
	return msg
}

// ErrServiceUnavailable is returned when a service is temporarily unavailable (T124)
type ErrServiceUnavailable struct {
	ServiceName string
	Reason      string
	Retryable   bool
}

func (e *ErrServiceUnavailable) Error() string {
	retry := ""
	if e.Retryable {
		retry = " (retryable)"
	}
	return fmt.Sprintf("service '%s' unavailable: %s%s", e.ServiceName, e.Reason, retry)
}
