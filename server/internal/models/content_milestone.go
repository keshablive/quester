package models

import (
	"time"

	"github.com/google/uuid"
)

// MilestoneType represents the type of content milestone
type MilestoneType string

const (
	MilestoneTrending  MilestoneType = "trending"  // 10 likes = 25 XP
	MilestoneViral     MilestoneType = "viral"     // 50 likes = 100 XP
	MilestoneLegendary MilestoneType = "legendary" // 100 likes = 250 XP
)

// IsValid checks if the milestone type is valid
func (m MilestoneType) IsValid() bool {
	switch m {
	case MilestoneTrending, MilestoneViral, MilestoneLegendary:
		return true
	}
	return false
}

// Threshold returns the like count required for this milestone
func (m MilestoneType) Threshold() int {
	switch m {
	case MilestoneTrending:
		return 10
	case MilestoneViral:
		return 50
	case MilestoneLegendary:
		return 100
	default:
		return 0
	}
}

// XPBonus returns the XP awarded for this milestone (FR-009)
func (m MilestoneType) XPBonus() int {
	switch m {
	case MilestoneTrending:
		return 25
	case MilestoneViral:
		return 100
	case MilestoneLegendary:
		return 250
	default:
		return 0
	}
}

// ContentMilestone tracks engagement milestones awarded to content creators
// FR-009: Award content creator bonuses at engagement milestones (10, 50, 100+ likes)
type ContentMilestone struct {
	ID       uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID uuid.UUID `gorm:"type:uuid;not null;index:idx_milestone_tenant" json:"tenant_id"`

	// Content reference
	ContentType string    `gorm:"type:varchar(50);not null" json:"content_type"` // 'Post'
	ContentID   uuid.UUID `gorm:"type:uuid;not null;index:idx_milestone_content" json:"content_id"`
	AuthorID    uuid.UUID `gorm:"type:uuid;not null;index:idx_milestone_author" json:"author_id"`

	// Milestone details
	MilestoneType MilestoneType `gorm:"type:varchar(50);not null" json:"milestone_type"`
	Threshold     int           `gorm:"not null" json:"threshold"`
	XPBonus       int           `gorm:"not null" json:"xp_bonus"`

	// Timestamps
	CreatedAt time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`

	// Relationships
	Author User `gorm:"foreignKey:AuthorID" json:"-"`
}

// TableName overrides the default table name
func (ContentMilestone) TableName() string {
	return "content_milestones"
}

// GetID implements repository.TenantModel interface
func (c *ContentMilestone) GetID() uuid.UUID {
	return c.ID
}

// GetTenantID implements repository.TenantModel interface
func (c *ContentMilestone) GetTenantID() uuid.UUID {
	return c.TenantID
}

// SetTenantID implements repository.TenantModel interface
func (c *ContentMilestone) SetTenantID(id uuid.UUID) {
	c.TenantID = id
}

// Validate checks milestone data integrity
func (c *ContentMilestone) Validate() error {
	if c.ContentType != "Post" {
		return &ValidationError{Message: "content_type must be 'Post'"}
	}
	if !c.MilestoneType.IsValid() {
		return &ValidationError{Message: "invalid milestone type"}
	}
	if c.AuthorID == uuid.Nil {
		return &ValidationError{Message: "author_id is required"}
	}
	return nil
}

// GetNextMilestone returns the next milestone type based on current like count
// Returns nil if no more milestones available
func GetNextMilestone(currentLikes int, awardedMilestones []MilestoneType) *MilestoneType {
	milestones := []MilestoneType{MilestoneTrending, MilestoneViral, MilestoneLegendary}

	for _, m := range milestones {
		// Skip if already awarded
		awarded := false
		for _, a := range awardedMilestones {
			if a == m {
				awarded = true
				break
			}
		}
		if awarded {
			continue
		}

		// Check if threshold is met
		if currentLikes >= m.Threshold() {
			return &m
		}
	}

	return nil
}
