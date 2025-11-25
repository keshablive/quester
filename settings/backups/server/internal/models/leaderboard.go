package models

import (
	"time"

	"github.com/google/uuid"
)

// LeaderboardType represents the type of leaderboard
type LeaderboardType string

const (
	LeaderboardTypeGlobal   LeaderboardType = "global"
	LeaderboardTypeCategory LeaderboardType = "category"
)

// IsValid checks if the leaderboard type is valid
func (t LeaderboardType) IsValid() bool {
	switch t {
	case LeaderboardTypeGlobal, LeaderboardTypeCategory:
		return true
	}
	return false
}

// LeaderboardPeriod represents the time period for leaderboard rankings
type LeaderboardPeriod string

const (
	LeaderboardPeriodAllTime LeaderboardPeriod = "alltime"
	LeaderboardPeriodMonthly LeaderboardPeriod = "monthly"
)

// IsValid checks if the leaderboard period is valid
func (p LeaderboardPeriod) IsValid() bool {
	switch p {
	case LeaderboardPeriodAllTime, LeaderboardPeriodMonthly:
		return true
	}
	return false
}

// Leaderboard represents a cached snapshot of leaderboard rankings
// This table stores periodic snapshots for performance and historical tracking.
// Real-time rankings are primarily maintained in Redis sorted sets.
//
// Business Rules:
// - Global leaderboards: Track all users by total XP
// - Category leaderboards: Track users by category-specific metrics (quest completions, course completions, etc.)
// - Monthly leaderboards: Reset on the 1st of each month (period format: YYYY-MM)
// - All-time leaderboards: Never reset (period: "alltime")
// - Redis is the primary data source; database is for persistence and historical queries
type Leaderboard struct {
	ID              int64             `gorm:"primaryKey;autoIncrement" json:"id"`
	TenantID        uuid.UUID         `gorm:"type:uuid;not null;index:idx_leaderboards_tenant" json:"tenant_id"`
	UserID          uuid.UUID         `gorm:"type:uuid;not null;index:idx_leaderboards_user" json:"user_id"`
	LeaderboardType LeaderboardType   `gorm:"type:varchar(20);not null;index:idx_leaderboards_type_period" json:"leaderboard_type"`
	Period          LeaderboardPeriod `gorm:"type:varchar(20);not null;index:idx_leaderboards_type_period" json:"period"`    // "alltime" or "YYYY-MM" for monthly
	PeriodKey       string            `gorm:"type:varchar(50);not null;index:idx_leaderboards_period_key" json:"period_key"` // e.g., "alltime", "2024-10"
	Category        string            `gorm:"type:varchar(50);index:idx_leaderboards_category" json:"category"`              // For category leaderboards (e.g., "quest", "learning")
	Rank            int               `gorm:"not null;index:idx_leaderboards_rank" json:"rank"`                              // 1-based rank (0 if not ranked)
	MetricValue     int               `gorm:"not null;default:0" json:"metric_value"`                                        // XP, quest count, etc.
	CachedAt        time.Time         `gorm:"not null;default:CURRENT_TIMESTAMP;index:idx_leaderboards_cached" json:"cached_at"`
	CreatedAt       time.Time         `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt       time.Time         `gorm:"not null;default:CURRENT_TIMESTAMP" json:"updated_at"`

	// Relations
	User User `gorm:"foreignKey:UserID;references:ID;constraint:OnDelete:CASCADE" json:"user,omitempty"`
}

// TableName specifies the table name for the Leaderboard model
func (Leaderboard) TableName() string {
	return "leaderboards"
}

// Validate checks if the leaderboard entry is valid
func (l *Leaderboard) Validate() error {
	if l.TenantID == uuid.Nil {
		return &ValidationError{Message: "tenant_id must be set"}
	}
	if l.UserID == uuid.Nil {
		return &ValidationError{Message: "user_id must be set"}
	}
	if !l.LeaderboardType.IsValid() {
		return ErrInvalidLeaderboardType
	}
	if !l.Period.IsValid() {
		return ErrInvalidLeaderboardPeriod
	}
	if l.PeriodKey == "" {
		return ErrInvalidPeriodKey
	}
	if l.LeaderboardType == LeaderboardTypeCategory && l.Category == "" {
		return ErrCategoryRequired
	}
	if l.Rank < 0 {
		return ErrInvalidRank
	}
	if l.MetricValue < 0 {
		return ErrInvalidMetricValue
	}
	return nil
}

// LeaderboardEntry is a lightweight response structure for API responses
// Used instead of full Leaderboard model to reduce payload size
type LeaderboardEntry struct {
	Rank        int       `json:"rank"`
	UserID      uuid.UUID `json:"user_id"`
	Username    string    `json:"username"`
	Avatar      string    `json:"avatar,omitempty"`
	MetricValue int       `json:"metric_value"`
	TenantID    uuid.UUID `json:"tenant_id"`
}

// UserLeaderboardPosition represents a user's position in a specific leaderboard
type UserLeaderboardPosition struct {
	UserID          uuid.UUID         `json:"user_id"`
	LeaderboardType LeaderboardType   `json:"leaderboard_type"`
	Period          LeaderboardPeriod `json:"period"`
	PeriodKey       string            `json:"period_key"`
	Category        string            `json:"category,omitempty"`
	Rank            int               `json:"rank"`         // 1-based rank (0 if not ranked)
	MetricValue     int               `json:"metric_value"` // User's XP or score
	TotalUsers      int               `json:"total_users"`  // Total users in this leaderboard
	Percentile      int               `json:"percentile"`   // User's percentile (0-100)
}

// LeaderboardErrors
var (
	ErrInvalidLeaderboardType   = &ValidationError{Message: "leaderboard type must be 'global' or 'category'"}
	ErrInvalidLeaderboardPeriod = &ValidationError{Message: "period must be 'alltime' or 'monthly'"}
	ErrInvalidPeriodKey         = &ValidationError{Message: "period key cannot be empty"}
	ErrCategoryRequired         = &ValidationError{Message: "category is required for category leaderboards"}
	ErrInvalidRank              = &ValidationError{Message: "rank must be non-negative"}
	ErrInvalidMetricValue       = &ValidationError{Message: "metric value must be non-negative"}
)
