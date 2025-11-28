// Two-Factor Authentication models
package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// User2FA stores TOTP secrets for two-factor authentication
type User2FA struct {
	// Primary Key
	ID uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`

	// Foreign Key
	UserID uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_user_2fa_user_id" json:"user_id"`

	// TOTP Secret (encrypted in database)
	SecretEncrypted string `gorm:"type:text;not null" json:"-"` // Never expose in JSON (LEGACY - replaced by encrypted_secret_ciphertext)

	// T208: KMS Envelope Encryption Fields (FR-004)
	EncryptedSecretCiphertext string     `gorm:"type:text" json:"-"`                              // AES-256-GCM ciphertext of TOTP secret
	EncryptedSecretDEK        []byte     `gorm:"type:bytea" json:"-"`                             // DEK encrypted by KMS KEK (envelope encryption)
	EncryptionAlgorithm       string     `gorm:"type:varchar(50);default:'AES-256-GCM'" json:"-"` // Encryption algorithm used
	EncryptionKeyVersion      int        `gorm:"type:int;default:1;index" json:"-"`               // DEK version for rotation support
	EncryptedAt               *time.Time `gorm:"type:timestamp;index" json:"-"`                   // When secret was last encrypted/re-encrypted
	DecryptedAt               *time.Time `gorm:"type:timestamp" json:"-"`                         // Last decryption timestamp (audit)

	// Status
	Enabled bool `gorm:"type:boolean;not null;default:false" json:"enabled"`

	// Timestamps
	CreatedAt time.Time      `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt time.Time      `gorm:"not null;default:CURRENT_TIMESTAMP" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"` // Soft delete
}

// IsEncrypted returns true if the secret is encrypted with KMS (T208)
func (u *User2FA) IsEncrypted() bool {
	return u.EncryptedSecretCiphertext != "" && len(u.EncryptedSecretDEK) > 0
}

// NeedsReEncryption returns true if secret uses old DEK version (T208)
// Secrets older than 90 days or using old key version should be re-encrypted
func (u *User2FA) NeedsReEncryption(currentKeyVersion int) bool {
	if !u.IsEncrypted() {
		return true // Legacy plaintext secret needs encryption
	}

	if u.EncryptionKeyVersion < currentKeyVersion {
		return true // Old key version, needs rotation
	}

	// Check if encrypted more than 90 days ago (compliance requirement)
	if u.EncryptedAt != nil && time.Since(*u.EncryptedAt) > 90*24*time.Hour {
		return true
	}

	return false
}

// TableName specifies the table name for User2FA model
func (User2FA) TableName() string {
	return "user_2fa"
}

// BackupCode stores single-use backup codes for account recovery
type BackupCode struct {
	// Primary Key
	ID uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`

	// Foreign Key
	UserID uuid.UUID `gorm:"type:uuid;not null;index:idx_backup_codes_user_id" json:"user_id"`

	// Code (hashed in database)
	CodeHash string `gorm:"type:varchar(255);not null" json:"-"` // Never expose in JSON

	// Status
	Used   bool       `gorm:"type:boolean;not null;default:false" json:"used"`
	UsedAt *time.Time `gorm:"type:timestamp" json:"used_at,omitempty"`

	// Timestamps
	CreatedAt time.Time      `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"` // Soft delete
}

// TableName specifies the table name for BackupCode model
func (BackupCode) TableName() string {
	return "backup_codes"
}

// TrustedDevice stores device trust tokens for 2FA bypass
type TrustedDevice struct {
	// Primary Key
	ID uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`

	// Foreign Key
	UserID uuid.UUID `gorm:"type:uuid;not null;index:idx_trusted_devices_user_id" json:"user_id"`

	// Device Information
	DeviceFingerprint string `gorm:"type:varchar(255);not null" json:"device_fingerprint"`
	DeviceName        string `gorm:"type:varchar(255);not null" json:"name"`
	DeviceType        string `gorm:"type:varchar(50);not null" json:"device_type"` // 'mobile', 'desktop', 'tablet', 'web'

	// Trust Token (secure random string)
	TrustToken string `gorm:"type:varchar(255);not null;uniqueIndex:idx_trusted_devices_token" json:"-"` // Never expose in JSON

	// Expiry
	ExpiresAt time.Time `gorm:"not null" json:"expires_at"`
	LastUsed  time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"last_used"`

	// Timestamps
	CreatedAt time.Time      `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"` // Soft delete
}

// TableName specifies the table name for TrustedDevice model
func (TrustedDevice) TableName() string {
	return "trusted_devices"
}

// IsExpired checks if the device trust has expired
func (td *TrustedDevice) IsExpired() bool {
	return time.Now().After(td.ExpiresAt)
}

// AuthAuditLog stores security events for audit trail
type AuthAuditLog struct {
	// Primary Key
	ID uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`

	// Foreign Key
	UserID uuid.UUID `gorm:"type:uuid;not null;index:idx_auth_audit_log_user_id" json:"user_id"`

	// Event Information
	EventType string `gorm:"type:varchar(100);not null;index:idx_auth_audit_log_event_type" json:"event_type"`
	EventData string `gorm:"type:jsonb" json:"event_data"` // JSON data for additional context

	// Request Information
	IPAddress string `gorm:"type:varchar(45)" json:"ip_address"` // IPv4 or IPv6
	UserAgent string `gorm:"type:text" json:"user_agent"`

	// Timestamp
	CreatedAt time.Time `gorm:"not null;default:CURRENT_TIMESTAMP;index:idx_auth_audit_log_created_at" json:"created_at"`
}

// TableName specifies the table name for AuthAuditLog model
func (AuthAuditLog) TableName() string {
	return "auth_audit_log"
}

// Event types for audit logging
const (
	Event2FAEnabled             = "2fa_enabled"
	Event2FADisabled            = "2fa_disabled"
	Event2FAVerificationSuccess = "2fa_verification_success"
	Event2FAVerificationFailed  = "2fa_verification_failed"
	EventBackupCodeUsed         = "backup_code_used"
	EventDeviceTrusted          = "device_trusted"
	EventDeviceRevoked          = "device_revoked"
	EventLoginSuccess           = "login_success"
	EventLoginFailed            = "login_failed"
	EventPasswordChanged        = "password_changed"
)
