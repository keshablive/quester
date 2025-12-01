// Password hashing and validation service
package service

import (
	"fmt"

	"golang.org/x/crypto/bcrypt"
)

const (
	// BcryptCost is the cost factor for bcrypt hashing (constitutional requirement)
	// Higher cost = more secure but slower (adds ~250ms to signup/login)
	BcryptCost = 12
)

// HashPassword hashes a plain-text password using bcrypt with cost 12
// Returns the bcrypt hash string or an error
func HashPassword(password string) (string, error) {
	// Validate password is not empty
	if password == "" {
		return "", fmt.Errorf("password cannot be empty")
	}

	// Generate bcrypt hash with cost 12 (constitutional requirement)
	hash, err := bcrypt.GenerateFromPassword([]byte(password), BcryptCost)
	if err != nil {
		return "", fmt.Errorf("failed to hash password: %w", err)
	}

	return string(hash), nil
}

// ComparePassword compares a bcrypt hash with a plain-text password
// Returns nil if the password matches, error otherwise
func ComparePassword(hash, password string) error {
	// Validate inputs
	if password == "" {
		return fmt.Errorf("password cannot be empty")
	}

	if hash == "" {
		return fmt.Errorf("hash cannot be empty")
	}

	// Compare hash and password
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	if err != nil {
		if err == bcrypt.ErrMismatchedHashAndPassword {
			return fmt.Errorf("invalid password")
		}
		return fmt.Errorf("failed to compare password: %w", err)
	}

	return nil
}

// PasswordService handles password operations
type PasswordService struct{}

// NewPasswordService creates a new PasswordService
func NewPasswordService() *PasswordService {
	return &PasswordService{}
}

// VerifyPassword checks if a plain-text password matches a bcrypt hash
func (s *PasswordService) VerifyPassword(password, hash string) bool {
	return ComparePassword(hash, password) == nil
}
