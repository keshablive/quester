package models

import (
	"time"

	"github.com/google/uuid"
)

// SocialActionType represents the type of social action that earns XP
type SocialActionType string

const (
	SocialActionPost        SocialActionType = "post"
	SocialActionLike        SocialActionType = "like"
	SocialActionComment     SocialActionType = "comment"
	SocialActionFollow      SocialActionType = "follow"
	SocialActionShare       SocialActionType = "share"
	SocialActionMilestone   SocialActionType = "milestone"
	SocialActionAchievement SocialActionType = "achievement"
	SocialActionChallenge   SocialActionType = "challenge"
)

// IsValid checks if the action type is valid
func (a SocialActionType) IsValid() bool {
	switch a {
	case SocialActionPost, SocialActionLike, SocialActionComment,
		SocialActionFollow, SocialActionShare, SocialActionMilestone,
		SocialActionAchievement, SocialActionChallenge:
		return true
	}
	return false
}

// XPValue returns the base XP value for this action type (FR-001)
func (a SocialActionType) XPValue() int {
	switch a {
	case SocialActionPost:
		return 10
	case SocialActionLike:
		return 2
	case SocialActionComment:
		return 5
	case SocialActionFollow:
		return 3
	case SocialActionShare:
		return 5
	default:
		return 0 // Milestones, achievements, challenges have custom XP
	}
}

// SocialXPTransaction records each XP award from social interactions
// FR-001: Award XP for social actions
// FR-002: Track unique interactions to prevent XP gaming
// FR-004: Track social-specific XP separately for social leaderboard
type SocialXPTransaction struct {
	ID       uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID uuid.UUID `gorm:"type:uuid;not null;index:idx_social_xp_tenant" json:"tenant_id"`
	UserID   uuid.UUID `gorm:"type:uuid;not null;index:idx_social_xp_user" json:"user_id"`

	// Action details
	ActionType SocialActionType `gorm:"type:varchar(50);not null;index:idx_social_xp_action" json:"action_type"`
	XPAmount   int              `gorm:"not null" json:"xp_amount"`

	// Content reference (for duplicate prevention)
	ContentType string    `gorm:"type:varchar(50)" json:"content_type,omitempty"` // 'Post', 'Comment', 'User'
	ContentID   uuid.UUID `gorm:"type:uuid" json:"content_id,omitempty"`

	// Metadata
	Description string `gorm:"type:varchar(255)" json:"description,omitempty"`

	// Async processing (FR-013)
	Processed   bool       `gorm:"not null;default:false;index:idx_social_xp_processed" json:"processed"`
	ProcessedAt *time.Time `gorm:"default:null" json:"processed_at,omitempty"`

	// Timestamps
	CreatedAt time.Time `gorm:"not null;default:CURRENT_TIMESTAMP;index:idx_social_xp_created" json:"created_at"`

	// Relationships
	User User `gorm:"foreignKey:UserID" json:"-"`
}

// TableName overrides the default table name
func (SocialXPTransaction) TableName() string {
	return "social_xp_transactions"
}

// GetID implements repository.TenantModel interface
func (s *SocialXPTransaction) GetID() uuid.UUID {
	return s.ID
}

// GetTenantID implements repository.TenantModel interface
func (s *SocialXPTransaction) GetTenantID() uuid.UUID {
	return s.TenantID
}

// SetTenantID implements repository.TenantModel interface
func (s *SocialXPTransaction) SetTenantID(id uuid.UUID) {
	s.TenantID = id
}

// Validate checks transaction data integrity
func (s *SocialXPTransaction) Validate() error {
	if !s.ActionType.IsValid() {
		return &ValidationError{Message: "invalid action type"}
	}
	if s.XPAmount <= 0 {
		return &ValidationError{Message: "xp_amount must be positive"}
	}
	if s.UserID == uuid.Nil {
		return &ValidationError{Message: "user_id is required"}
	}
	return nil
}

// UserSocialStats aggregates social activity stats per user
// Used for leaderboards and achievement tracking
type UserSocialStats struct {
	ID       uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID uuid.UUID `gorm:"type:uuid;not null;index:idx_user_social_stats_tenant" json:"tenant_id"`
	UserID   uuid.UUID `gorm:"type:uuid;not null" json:"user_id"`

	// XP totals
	TotalSocialXP int `gorm:"not null;default:0;index:idx_user_social_stats_xp" json:"total_social_xp"`

	// Activity counts (for achievement tracking)
	PostsCount         int `gorm:"not null;default:0" json:"posts_count"`
	LikesGivenCount    int `gorm:"not null;default:0" json:"likes_given_count"`
	LikesReceivedCount int `gorm:"not null;default:0" json:"likes_received_count"`
	CommentsCount      int `gorm:"not null;default:0" json:"comments_count"`
	FollowersCount     int `gorm:"not null;default:0" json:"followers_count"`
	FollowingCount     int `gorm:"not null;default:0" json:"following_count"`
	SharesCount        int `gorm:"not null;default:0" json:"shares_count"`

	// Timestamps
	CreatedAt time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"updated_at"`

	// Relationships
	User User `gorm:"foreignKey:UserID" json:"-"`
}

// TableName overrides the default table name
func (UserSocialStats) TableName() string {
	return "user_social_stats"
}

// GetID implements repository.TenantModel interface
func (u *UserSocialStats) GetID() uuid.UUID {
	return u.ID
}

// GetTenantID implements repository.TenantModel interface
func (u *UserSocialStats) GetTenantID() uuid.UUID {
	return u.TenantID
}

// SetTenantID implements repository.TenantModel interface
func (u *UserSocialStats) SetTenantID(id uuid.UUID) {
	u.TenantID = id
}

// SocialXPRateLimit tracks rate limiting for XP actions
// FR-012: Rate-limit XP-earning actions to prevent abuse (max 100 actions per hour)
type SocialXPRateLimit struct {
	ID       uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID uuid.UUID `gorm:"type:uuid;not null" json:"tenant_id"`
	UserID   uuid.UUID `gorm:"type:uuid;not null;index:idx_social_xp_rate_user" json:"user_id"`

	// Rate tracking
	ActionCount int       `gorm:"not null;default:0" json:"action_count"`
	WindowStart time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"window_start"`

	// Relationships
	User User `gorm:"foreignKey:UserID" json:"-"`
}

// TableName overrides the default table name
func (SocialXPRateLimit) TableName() string {
	return "social_xp_rate_limits"
}

// IsRateLimited checks if user has exceeded the rate limit (100 actions/hour)
func (r *SocialXPRateLimit) IsRateLimited() bool {
	// Reset window if more than 1 hour has passed
	if time.Since(r.WindowStart) > time.Hour {
		return false
	}
	return r.ActionCount >= 100
}

// IncrementOrReset increments counter or resets if window expired
func (r *SocialXPRateLimit) IncrementOrReset() {
	if time.Since(r.WindowStart) > time.Hour {
		r.ActionCount = 1
		r.WindowStart = time.Now()
	} else {
		r.ActionCount++
	}
}
