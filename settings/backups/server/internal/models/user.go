// User model with gamification fields
package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Role represents user authorization levels (T005)
type Role string

const (
	RoleAdmin      Role = "ADMIN"      // Full system access
	RoleModerator  Role = "MODERATOR"  // Content moderation and user management
	RoleInstructor Role = "INSTRUCTOR" // Course/quest creation and management
	RolePlayer     Role = "PLAYER"     // Standard user (default)
	RolePartner    Role = "PARTNER"    // External partner access
)

// IsValid checks if the role is valid
func (r Role) IsValid() bool {
	switch r {
	case RoleAdmin, RoleModerator, RoleInstructor, RolePlayer, RolePartner:
		return true
	}
	return false
}

// Tier represents gamification tiers (T006)
type Tier string

const (
	TierBronze   Tier = "BRONZE"   // Default tier
	TierSilver   Tier = "SILVER"   // Tier 2
	TierGold     Tier = "GOLD"     // Tier 3
	TierPlatinum Tier = "PLATINUM" // Tier 4
	TierDiamond  Tier = "DIAMOND"  // Highest tier
)

// IsValid checks if the tier is valid
func (t Tier) IsValid() bool {
	switch t {
	case TierBronze, TierSilver, TierGold, TierPlatinum, TierDiamond:
		return true
	}
	return false
}

// User model with multi-tenant support and gamification (T007)
type User struct {
	// Primary Key
	ID uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`

	// Multi-Tenant (Constitutional Requirement)
	TenantID uuid.UUID `gorm:"type:uuid;not null;index:idx_tenant_id" json:"tenant_id"`

	// Authentication
	Email        string `gorm:"type:varchar(255);not null;index:idx_tenant_email,unique,composite:tenant_id" json:"email"`
	Username     string `gorm:"type:varchar(100);not null" json:"username"`
	PasswordHash string `gorm:"type:varchar(255);not null" json:"-"` // Never expose in JSON

	// Authorization
	Role Role `gorm:"type:varchar(20);not null;default:'PLAYER'" json:"role"`

	// Profile
	Avatar *string `gorm:"type:varchar(500)" json:"avatar,omitempty"` // S3 URL to avatar image

	// Payment
	PaymentAccountID string `gorm:"type:varchar(255)" json:"payment_account_id,omitempty"` // Razorpay/Stripe connected account ID for payouts

	// Gamification (FR-021, FR-022, FR-023)
	XP          int        `gorm:"type:integer;not null;default:0" json:"xp"`
	Level       int        `gorm:"type:integer;not null;default:1" json:"level"`
	Tier        Tier       `gorm:"type:varchar(20);not null;default:'BRONZE'" json:"tier"`
	LoginStreak int        `gorm:"type:integer;not null;default:0" json:"login_streak"`
	LastLogin   *time.Time `gorm:"type:timestamp" json:"last_login,omitempty"`

	// Timestamps
	CreatedAt time.Time      `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt time.Time      `gorm:"not null;default:CURRENT_TIMESTAMP" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"` // Soft delete
}

// TableName specifies the table name for User model
func (User) TableName() string {
	return "users"
}

// BeforeCreate hook to set defaults
func (u *User) BeforeCreate(tx *gorm.DB) error {
	// Ensure ID is set
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}

	// Set default role if not specified
	if u.Role == "" {
		u.Role = RolePlayer
	}

	// Set default tier if not specified
	if u.Tier == "" {
		u.Tier = TierBronze
	}

	// Validate role
	if !u.Role.IsValid() {
		return gorm.ErrInvalidValue
	}

	// Validate tier
	if !u.Tier.IsValid() {
		return gorm.ErrInvalidValue
	}

	return nil
}

// PublicUser returns a sanitized version without sensitive fields
type PublicUser struct {
	ID          uuid.UUID  `json:"id"`
	TenantID    uuid.UUID  `json:"tenant_id"`
	Email       string     `json:"email"`
	Username    string     `json:"username"`
	Role        Role       `json:"role"`
	XP          int        `json:"xp"`
	Level       int        `json:"level"`
	Tier        Tier       `json:"tier"`
	LoginStreak int        `json:"login_streak"`
	LastLogin   *time.Time `json:"last_login,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

// ToPublic converts User to PublicUser (safe for API responses)
func (u *User) ToPublic() *PublicUser {
	return &PublicUser{
		ID:          u.ID,
		TenantID:    u.TenantID,
		Email:       u.Email,
		Username:    u.Username,
		Role:        u.Role,
		XP:          u.XP,
		Level:       u.Level,
		Tier:        u.Tier,
		LoginStreak: u.LoginStreak,
		LastLogin:   u.LastLogin,
		CreatedAt:   u.CreatedAt,
		UpdatedAt:   u.UpdatedAt,
	}
}
