package models

import (
	"time"

	"github.com/google/uuid"
)

// UserAchievementBadge stores mapping between user achievements and unlocked badges (UUID-based)
type UserAchievementBadge struct {
	ID            uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID      uuid.UUID `gorm:"type:uuid;not null;index:idx_uab_tenant" json:"tenant_id"`
	UserID        uuid.UUID `gorm:"type:uuid;not null;index:idx_uab_user" json:"user_id"`
	AchievementID uuid.UUID `gorm:"type:uuid;not null;index:idx_uab_achievement" json:"achievement_id"`
	BadgeID       uuid.UUID `gorm:"type:uuid;not null;index:idx_uab_badge" json:"badge_id"`
	AwardedAt     time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"awarded_at"`
}

// TableName returns SQL table name
func (UserAchievementBadge) TableName() string {
	return "user_achievement_badges"
}
