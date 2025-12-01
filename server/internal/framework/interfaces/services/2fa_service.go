// Package services defines service layer interfaces for the Quester platform.
package services

import (
	"context"

	"github.com/google/uuid"
)

// TwoFactorServiceInterface defines the contract for 2FA operations.
// Implementations handle TOTP setup, verification, backup codes, and trusted devices.
type TwoFactorServiceInterface interface {
	// Setup2FA initiates 2FA setup and returns TOTP secret.
	Setup2FA(ctx context.Context, userID uuid.UUID) (*TwoFactorSetup, error)

	// Enable2FA enables 2FA after verifying the setup code.
	Enable2FA(ctx context.Context, userID uuid.UUID, code string) error

	// Disable2FA disables 2FA for a user.
	Disable2FA(ctx context.Context, userID uuid.UUID, code string) error

	// Verify2FA verifies a TOTP code during login.
	Verify2FA(ctx context.Context, userID uuid.UUID, code string) (bool, error)

	// GenerateBackupCodes generates new backup codes.
	GenerateBackupCodes(ctx context.Context, userID uuid.UUID) ([]string, error)

	// VerifyBackupCode verifies and consumes a backup code.
	VerifyBackupCode(ctx context.Context, userID uuid.UUID, code string) (bool, error)

	// GetTrustedDevices retrieves user's trusted devices.
	GetTrustedDevices(ctx context.Context, userID uuid.UUID) ([]*TrustedDevice, error)

	// AddTrustedDevice adds a device to trusted list.
	AddTrustedDevice(ctx context.Context, userID uuid.UUID, device *TrustedDeviceInput) (*TrustedDevice, error)

	// RemoveTrustedDevice removes a device from trusted list.
	RemoveTrustedDevice(ctx context.Context, userID uuid.UUID, deviceID uuid.UUID) error

	// Is2FAEnabled checks if 2FA is enabled for a user.
	Is2FAEnabled(ctx context.Context, userID uuid.UUID) (bool, error)
}

// TwoFactorSetup contains data for 2FA setup.
type TwoFactorSetup struct {
	Secret      string `json:"secret"`
	QRCodeURL   string `json:"qr_code_url"`
	Issuer      string `json:"issuer"`
	AccountName string `json:"account_name"`
}

// TrustedDevice represents a trusted device for 2FA.
type TrustedDevice struct {
	ID          uuid.UUID `json:"id"`
	UserID      uuid.UUID `json:"user_id"`
	Name        string    `json:"name"`
	DeviceType  string    `json:"device_type"`
	LastUsedAt  string    `json:"last_used_at"`
	CreatedAt   string    `json:"created_at"`
	UserAgent   string    `json:"user_agent"`
	IPAddress   string    `json:"ip_address"`
	Fingerprint string    `json:"fingerprint"`
}

// TrustedDeviceInput contains data for adding a trusted device.
type TrustedDeviceInput struct {
	Name        string `json:"name"`
	DeviceType  string `json:"device_type"`
	UserAgent   string `json:"user_agent"`
	IPAddress   string `json:"ip_address"`
	Fingerprint string `json:"fingerprint"`
}
