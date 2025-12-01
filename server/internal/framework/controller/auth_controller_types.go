// Package controllers provides auth controller shared types and helpers
// Extracted to resolve duplicate declarations across auth, blacklist, and token controllers
package controller

import (
	"crypto/sha256"
	"encoding/hex"
)

// TokenResponse represents a single token in the response
type TokenResponse struct {
	ID        string `json:"id"`
	CreatedAt string `json:"created_at"`
	ExpiresAt string `json:"expires_at"`
}

// ViewActiveTokensResponse represents the response for viewing active tokens
type ViewActiveTokensResponse struct {
	Success bool `json:"success"`
	Data    struct {
		Tokens []TokenResponse `json:"tokens"`
		Total  int64           `json:"total"`
		Limit  int             `json:"limit"`
		Offset int             `json:"offset"`
	} `json:"data"`
}

// CheckBlacklistResponse represents the response for blacklist check
type CheckBlacklistResponse struct {
	Success bool `json:"success"`
	Data    struct {
		IsBlacklisted bool   `json:"is_blacklisted"`
		TokenHash     string `json:"token_hash,omitempty"`
		CheckedAt     string `json:"checked_at"`
	} `json:"data"`
}

// CleanupBlacklistResponse represents the response for cleanup operation
type CleanupBlacklistResponse struct {
	Success bool `json:"success"`
	Data    struct {
		Message       string `json:"message"`
		TokensCleaned int    `json:"tokens_cleaned"`
		CleanedAt     string `json:"cleaned_at"`
	} `json:"data"`
}

// hashToken creates a SHA256 hash of the token for blacklist storage
// Used by auth_controller, blacklist_controller, and middleware
func hashToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}
