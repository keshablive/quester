// T206: EncryptionKey model
// Package: server/internal/models
// Purpose: Represents a Data Encryption Key (DEK) encrypted by a KMS Key Encryption Key (KEK)
//
// This model supports envelope encryption:
// 1. KMS generates a random DEK (plaintext + encrypted)
// 2. We use plaintext DEK to encrypt 2FA secrets (AES-256-GCM)
// 3. We store encrypted DEK in this table
// 4. Plaintext DEK is cached in memory (1-hour TTL) and never persisted
// 5. On rotation, new DEK is generated, old DEK becomes "rotated" status
// 6. Old secrets remain decryptable with old DEK for 90 days

package models

import (
	"time"

	"github.com/google/uuid"
)

// EncryptionKey represents a Data Encryption Key (DEK) for envelope encryption
type EncryptionKey struct {
	ID           uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	KeyID        string     `gorm:"type:varchar(255);uniqueIndex;not null" json:"key_id"`
	Version      int        `gorm:"type:int;not null;default:1;index" json:"version"`
	EncryptedDEK []byte     `gorm:"type:bytea;not null" json:"-"` // Never expose in JSON
	Algorithm    string     `gorm:"type:varchar(50);not null;default:'AES-256-GCM'" json:"algorithm"`
	KMSProvider  string     `gorm:"type:varchar(50);not null;default:'aws'" json:"kms_provider"`
	KMSKeyARN    string     `gorm:"type:text;not null" json:"kms_key_arn"`
	Status       string     `gorm:"type:varchar(20);not null;default:'active';index" json:"status"`
	CreatedAt    time.Time  `gorm:"not null;default:now();index" json:"created_at"`
	RotatedAt    *time.Time `gorm:"index" json:"rotated_at,omitempty"`
	ExpiresAt    *time.Time `json:"expires_at,omitempty"`
	TenantID     *uuid.UUID `gorm:"type:uuid;index" json:"tenant_id,omitempty"`
}

// TableName specifies the database table name
func (EncryptionKey) TableName() string {
	return "encryption_keys"
}

// Key status constants
const (
	KeyStatusActive  = "active"  // Current key in use
	KeyStatusRotated = "rotated" // Old key still valid for decryption
	KeyStatusExpired = "expired" // Key expired, cannot be used
	KeyStatusRevoked = "revoked" // Key revoked due to compromise
)

// KMS provider constants
const (
	KMSProviderAWS   = "aws"
	KMSProviderGCP   = "gcp"
	KMSProviderVault = "vault"
	KMSProviderMock  = "mock" // For testing
)

// Algorithm constants
const (
	AlgorithmAES256GCM = "AES-256-GCM"
	AlgorithmAES128GCM = "AES-128-GCM"
)

// IsActive returns true if key is currently active
func (k *EncryptionKey) IsActive() bool {
	return k.Status == KeyStatusActive
}

// IsRotated returns true if key has been rotated but still valid
func (k *EncryptionKey) IsRotated() bool {
	return k.Status == KeyStatusRotated
}

// IsExpired returns true if key has expired
func (k *EncryptionKey) IsExpired() bool {
	return k.Status == KeyStatusExpired || (k.ExpiresAt != nil && time.Now().After(*k.ExpiresAt))
}

// IsRevoked returns true if key has been revoked
func (k *EncryptionKey) IsRevoked() bool {
	return k.Status == KeyStatusRevoked
}

// CanDecrypt returns true if key can be used for decryption
// Active and rotated keys can decrypt, but expired/revoked cannot
func (k *EncryptionKey) CanDecrypt() bool {
	return k.Status == KeyStatusActive || k.Status == KeyStatusRotated
}

// CanEncrypt returns true if key can be used for encryption
// Only active keys can encrypt new data
func (k *EncryptionKey) CanEncrypt() bool {
	return k.Status == KeyStatusActive
}

// MarkRotated marks the key as rotated and sets rotation timestamp
func (k *EncryptionKey) MarkRotated() {
	now := time.Now()
	k.Status = KeyStatusRotated
	k.RotatedAt = &now

	// Set expiration to 90 days after rotation (compliance requirement)
	expiresAt := now.AddDate(0, 0, 90)
	k.ExpiresAt = &expiresAt
}

// MarkExpired marks the key as expired
func (k *EncryptionKey) MarkExpired() {
	k.Status = KeyStatusExpired
}

// MarkRevoked marks the key as revoked (e.g., due to compromise)
func (k *EncryptionKey) MarkRevoked() {
	k.Status = KeyStatusRevoked
}

// Validate validates the EncryptionKey model
func (k *EncryptionKey) Validate() error {
	if k.KeyID == "" {
		return &ValidationError{Message: "key_id: Key ID is required"}
	}

	if k.Version < 1 {
		return &ValidationError{Message: "version: Version must be >= 1"}
	}

	if len(k.EncryptedDEK) == 0 {
		return &ValidationError{Message: "encrypted_dek: Encrypted DEK is required"}
	}

	if k.Algorithm != AlgorithmAES256GCM && k.Algorithm != AlgorithmAES128GCM {
		return &ValidationError{Message: "algorithm: Algorithm must be AES-256-GCM or AES-128-GCM"}
	}

	if k.KMSProvider != KMSProviderAWS && k.KMSProvider != KMSProviderGCP &&
		k.KMSProvider != KMSProviderVault && k.KMSProvider != KMSProviderMock {
		return &ValidationError{Message: "kms_provider: Invalid KMS provider"}
	}

	if k.KMSKeyARN == "" {
		return &ValidationError{Message: "kms_key_arn: KMS Key ARN is required"}
	}

	if k.Status != KeyStatusActive && k.Status != KeyStatusRotated &&
		k.Status != KeyStatusExpired && k.Status != KeyStatusRevoked {
		return &ValidationError{Message: "status: Invalid key status"}
	}

	return nil
} // EncryptionKeyRepository defines methods for interacting with EncryptionKey records
type EncryptionKeyRepository interface {
	GetActiveKey() (*EncryptionKey, error)
	GetKeyByVersion(version int) (*EncryptionKey, error)
	GetKeyByID(keyID string) (*EncryptionKey, error)
	CreateKey(key *EncryptionKey) error
	UpdateKey(key *EncryptionKey) error
	ListKeys(limit, offset int) ([]*EncryptionKey, error)
	RotateKey(oldKey *EncryptionKey, newKey *EncryptionKey) error
}
