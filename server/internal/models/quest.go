package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// QuestType represents the type of quest
type QuestType string

const (
	QuestTypeDaily     QuestType = "daily"
	QuestTypeWeekly    QuestType = "weekly"
	QuestTypeMonthly   QuestType = "monthly"
	QuestTypeOneTime   QuestType = "one_time"
	QuestTypeChallenge QuestType = "challenge"
)

// QuestStatus represents the status of a quest
type QuestStatus string

const (
	QuestStatusActive   QuestStatus = "active"
	QuestStatusInactive QuestStatus = "inactive"
	QuestStatusArchived QuestStatus = "archived"
)

// Quest represents a gamification quest/challenge
type Quest struct {
	ID       uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID uuid.UUID `gorm:"type:uuid;not null;index:idx_quests_tenant" json:"tenant_id"`

	Title       string      `gorm:"type:varchar(255);not null" json:"title"`
	Description string      `gorm:"type:text" json:"description"`
	Type        QuestType   `gorm:"type:varchar(50);not null" json:"type"`
	Status      QuestStatus `gorm:"type:varchar(50);not null;default:'active'" json:"status"`
	Points      int         `gorm:"not null;default:0" json:"points"`
	BadgeID     *uuid.UUID  `gorm:"type:uuid;index:idx_quests_badge" json:"badge_id,omitempty"`
	Badge       *Badge      `gorm:"foreignKey:BadgeID" json:"badge,omitempty"`

	// Requirements
	Requirements datatypes.JSON `gorm:"type:jsonb" json:"requirements"` // JSON with quest requirements

	// Timestamps
	StartDate time.Time      `gorm:"not null" json:"start_date"`
	EndDate   *time.Time     `json:"end_date,omitempty"`
	CreatedAt time.Time      `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt time.Time      `gorm:"not null;default:CURRENT_TIMESTAMP" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
}

// TableName specifies the table name for Quest
func (Quest) TableName() string {
	return "quests"
}

// GetID implements repository.TenantModel interface
func (q *Quest) GetID() uuid.UUID {
	return q.ID
}

// GetTenantID implements repository.TenantModel interface
func (q *Quest) GetTenantID() uuid.UUID {
	return q.TenantID
}

// SetTenantID implements repository.TenantModel interface
func (q *Quest) SetTenantID(id uuid.UUID) {
	q.TenantID = id
}
