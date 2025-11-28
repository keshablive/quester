package models

// AppError represents a structured application error with code and message
type AppError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// Error implements the error interface
func (e *AppError) Error() string {
	return e.Message
}

// NewAppError creates a new AppError
func NewAppError(code, message string) *AppError {
	return &AppError{
		Code:    code,
		Message: message,
	}
}

// Common application errors
var (
	ErrServiceUnavailable  = &AppError{Code: "SERVICE_UNAVAILABLE", Message: "Required service is not available"}
	ErrBadgeNotFound       = &AppError{Code: "BADGE_NOT_FOUND", Message: "Badge not found"}
	ErrBadgeAlreadyAwarded = &AppError{Code: "BADGE_ALREADY_AWARDED", Message: "User already has this badge"}
	ErrUnauthorized        = &AppError{Code: "UNAUTHORIZED", Message: "Not authorized to perform this action"}
	ErrInvalidRequest      = &AppError{Code: "INVALID_REQUEST", Message: "Invalid request parameters"}
)
