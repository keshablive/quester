// RefreshToken storage
package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// RefreshToken model for JWT refresh token management (T008)
// Stores hashed refresh tokens with revocation support
type RefreshToken struct {
	// Primary Key
	ID uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`

	// Foreign Key to User
	UserID uuid.UUID `gorm:"type:uuid;not null;index:idx_user_tokens" json:"user_id"`

	// Token Data
	TokenHash string `gorm:"type:varchar(255);not null;uniqueIndex:idx_token_hash" json:"-"` // SHA256 hash, never expose

	// Expiration & Revocation
	ExpiresAt time.Time  `gorm:"type:timestamp;not null" json:"expires_at"`
	RevokedAt *time.Time `gorm:"type:timestamp" json:"revoked_at,omitempty"` // Nullable - null means active

	// Timestamps
	CreatedAt time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`

	// Relationship (optional - can be loaded with Preload)
	User User `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
}

// TableName specifies the table name for RefreshToken model
func (RefreshToken) TableName() string {
	return "refresh_tokens"
}

// BeforeCreate hook to set defaults
func (rt *RefreshToken) BeforeCreate(tx *gorm.DB) error {
	// Ensure ID is set
	if rt.ID == uuid.Nil {
		rt.ID = uuid.New()
	}
	return nil
}

// IsExpired checks if the token has expired
func (rt *RefreshToken) IsExpired() bool {
	return time.Now().UTC().After(rt.ExpiresAt)
}

// IsRevoked checks if the token has been revoked
func (rt *RefreshToken) IsRevoked() bool {
	return rt.RevokedAt != nil
}

// IsValid checks if the token is both not expired and not revoked
func (rt *RefreshToken) IsValid() bool {
	return !rt.IsExpired() && !rt.IsRevoked()
}

// Revoke marks the token as revoked
func (rt *RefreshToken) Revoke(tx *gorm.DB) error {
	now := time.Now().UTC()
	rt.RevokedAt = &now
	return tx.Save(rt).Error
}
