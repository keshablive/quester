package utils

import (
	"errors"
	"fmt"
	"regexp"
	"strings"
	"unicode"

	"github.com/google/uuid"
)

// Validation utilities for common input validation
// CONSTITUTION: Security by Design - Input validation required

var (
	// Email regex pattern (RFC 5322 simplified)
	emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)

	// Phone regex patterns
	usPhoneRegex       = regexp.MustCompile(`^\+?1?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$`)
	internationalPhone = regexp.MustCompile(`^\+?[1-9]\d{1,14}$`) // E.164 format

	// URL regex pattern
	urlRegex = regexp.MustCompile(`^https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(/.*)?$`)

	// Username pattern (alphanumeric, underscore, hyphen, 3-30 chars)
	usernameRegex = regexp.MustCompile(`^[a-zA-Z0-9_-]{3,30}$`)

	// Strong password requirements
	// At least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
)

// ValidationError represents a validation error
type ValidationError struct {
	Field   string
	Message string
}

func (e *ValidationError) Error() string {
	return e.Field + ": " + e.Message
}

// ValidateEmail validates an email address
func ValidateEmail(email string) error {
	if email == "" {
		return &ValidationError{Field: "email", Message: "email is required"}
	}

	email = strings.TrimSpace(strings.ToLower(email))

	if len(email) > 254 {
		return &ValidationError{Field: "email", Message: "email too long (max 254 characters)"}
	}

	if !emailRegex.MatchString(email) {
		return &ValidationError{Field: "email", Message: "invalid email format"}
	}

	return nil
}

// ValidateUsername validates a username
func ValidateUsername(username string) error {
	if username == "" {
		return &ValidationError{Field: "username", Message: "username is required"}
	}

	username = strings.TrimSpace(username)

	if len(username) < 3 {
		return &ValidationError{Field: "username", Message: "username must be at least 3 characters"}
	}

	if len(username) > 30 {
		return &ValidationError{Field: "username", Message: "username too long (max 30 characters)"}
	}

	if !usernameRegex.MatchString(username) {
		return &ValidationError{Field: "username", Message: "username can only contain letters, numbers, underscores, and hyphens"}
	}

	return nil
}

// ValidatePassword validates password strength
// CONSTITUTION: Security by Design - Strong password requirements
func ValidatePassword(password string) error {
	if password == "" {
		return &ValidationError{Field: "password", Message: "password is required"}
	}

	if len(password) < 8 {
		return &ValidationError{Field: "password", Message: "password must be at least 8 characters"}
	}

	if len(password) > 128 {
		return &ValidationError{Field: "password", Message: "password too long (max 128 characters)"}
	}

	var (
		hasUpper   bool
		hasLower   bool
		hasNumber  bool
		hasSpecial bool
	)

	for _, char := range password {
		switch {
		case unicode.IsUpper(char):
			hasUpper = true
		case unicode.IsLower(char):
			hasLower = true
		case unicode.IsNumber(char):
			hasNumber = true
		case unicode.IsPunct(char) || unicode.IsSymbol(char):
			hasSpecial = true
		}
	}

	if !hasUpper {
		return &ValidationError{Field: "password", Message: "password must contain at least one uppercase letter"}
	}

	if !hasLower {
		return &ValidationError{Field: "password", Message: "password must contain at least one lowercase letter"}
	}

	if !hasNumber {
		return &ValidationError{Field: "password", Message: "password must contain at least one number"}
	}

	if !hasSpecial {
		return &ValidationError{Field: "password", Message: "password must contain at least one special character"}
	}

	return nil
}

// ValidatePhone validates a phone number
func ValidatePhone(phone string) error {
	if phone == "" {
		return &ValidationError{Field: "phone", Message: "phone number is required"}
	}

	phone = strings.TrimSpace(phone)

	// Try US format first
	if usPhoneRegex.MatchString(phone) {
		return nil
	}

	// Try international E.164 format
	if internationalPhone.MatchString(phone) {
		return nil
	}

	return &ValidationError{Field: "phone", Message: "invalid phone number format"}
}

// ValidateURL validates a URL
func ValidateURL(url string) error {
	if url == "" {
		return &ValidationError{Field: "url", Message: "URL is required"}
	}

	url = strings.TrimSpace(url)

	if len(url) > 2048 {
		return &ValidationError{Field: "url", Message: "URL too long (max 2048 characters)"}
	}

	if !urlRegex.MatchString(url) {
		return &ValidationError{Field: "url", Message: "invalid URL format"}
	}

	return nil
}

// ValidateRequired checks if a field is not empty
func ValidateRequired(field, value string) error {
	if strings.TrimSpace(value) == "" {
		return &ValidationError{Field: field, Message: field + " is required"}
	}
	return nil
}

// ValidateMinLength checks minimum length
func ValidateMinLength(field, value string, min int) error {
	if len(strings.TrimSpace(value)) < min {
		return &ValidationError{
			Field:   field,
			Message: field + " must be at least " + string(rune(min)) + " characters",
		}
	}
	return nil
}

// ValidateMaxLength checks maximum length
func ValidateMaxLength(field, value string, max int) error {
	if len(value) > max {
		return &ValidationError{
			Field:   field,
			Message: field + " must be at most " + string(rune(max)) + " characters",
		}
	}
	return nil
}

// ValidateRange checks if a number is within range
func ValidateRange(field string, value, min, max int) error {
	if value < min || value > max {
		return &ValidationError{
			Field:   field,
			Message: field + " must be between " + string(rune(min)) + " and " + string(rune(max)),
		}
	}
	return nil
}

// ValidateEnum checks if value is in allowed list
func ValidateEnum(field, value string, allowed []string) error {
	for _, a := range allowed {
		if value == a {
			return nil
		}
	}
	return &ValidationError{
		Field:   field,
		Message: field + " must be one of: " + strings.Join(allowed, ", "),
	}
}

// ValidateSlug validates a URL-safe slug
func ValidateSlug(slug string) error {
	if slug == "" {
		return &ValidationError{Field: "slug", Message: "slug is required"}
	}

	slug = strings.TrimSpace(slug)
	slugRegex := regexp.MustCompile(`^[a-z0-9-]+$`)

	if !slugRegex.MatchString(slug) {
		return &ValidationError{Field: "slug", Message: "slug can only contain lowercase letters, numbers, and hyphens"}
	}

	return nil
}

// ValidateUUID validates a UUID string
func ValidateUUID(uuid string) error {
	uuidRegex := regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)

	if !uuidRegex.MatchString(uuid) {
		return errors.New("invalid UUID format")
	}

	return nil
}

// ValidateTenantID validates that a string tenant ID is not empty
func ValidateTenantID(tenantID string) error {
	if tenantID == "" {
		return &ValidationError{Field: "tenantID", Message: "tenant ID cannot be empty"}
	}
	return nil
}

// ValidateHexColor validates a hex color code
func ValidateHexColor(color string) error {
	colorRegex := regexp.MustCompile(`^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$`)

	if !colorRegex.MatchString(color) {
		return &ValidationError{Field: "color", Message: "invalid hex color format (e.g., #FFFFFF)"}
	}

	return nil
}

// IsAlphanumeric checks if string contains only alphanumeric characters
func IsAlphanumeric(s string) bool {
	for _, char := range s {
		if !unicode.IsLetter(char) && !unicode.IsNumber(char) {
			return false
		}
	}
	return true
}

// Service-level validation functions

// ValidateRequiredUUID validates that a UUID is not nil
func ValidateRequiredUUID(id uuid.UUID, fieldName string) error {
	if id == uuid.Nil {
		return fmt.Errorf("%s is required", fieldName)
	}
	return nil
}

// ValidateRequiredString validates that a string is not empty
func ValidateRequiredString(value string, fieldName string) error {
	if value == "" {
		return fmt.Errorf("%s is required", fieldName)
	}
	return nil
}

// ValidateRequiredStrings validates multiple required string fields
func ValidateRequiredStrings(fields map[string]string) error {
	for fieldName, value := range fields {
		if err := ValidateRequiredString(value, fieldName); err != nil {
			return err
		}
	}
	return nil
}

// ValidateRequiredUUIDs validates multiple required UUID fields
func ValidateRequiredUUIDs(fields map[string]uuid.UUID) error {
	for fieldName, value := range fields {
		if err := ValidateRequiredUUID(value, fieldName); err != nil {
			return err
		}
	}
	return nil
}

// ValidatePositiveNumber validates that a number is greater than zero
func ValidatePositiveNumber(value float64, fieldName string) error {
	if value <= 0 {
		return fmt.Errorf("%s must be greater than 0", fieldName)
	}
	return nil
}

// ValidatePaginationParamsWithDefaults validates pagination and applies defaults
func ValidatePaginationParamsWithDefaults(page, pageSize int) (int, int, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}
	return page, pageSize, nil
}

// ValidateEmailFormat performs basic email validation
func ValidateEmailFormat(email string) error {
	if email == "" {
		return errors.New("email is required")
	}
	return ValidateEmail(email)
}

// ValidatePrice validates a price and currency
func ValidatePrice(price float64, currency string) error {
	if price <= 0 {
		return errors.New("price must be greater than 0")
	}
	if currency == "" {
		return errors.New("currency is required when price is set")
	}
	return nil
}
