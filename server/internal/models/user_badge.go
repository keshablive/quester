package models

import (
	"time"

	"github.com/google/uuid"
)

// ApprovalStatus represents the state of a badge award
type ApprovalStatus string

const (
	ApprovalStatusPending  ApprovalStatus = "pending"
	ApprovalStatusApproved ApprovalStatus = "approved"
	ApprovalStatusRejected ApprovalStatus = "rejected"
	ApprovalStatusRevoked  ApprovalStatus = "revoked"
)

// IsValid checks if the approval status is valid
func (s ApprovalStatus) IsValid() bool {
	switch s {
	case ApprovalStatusPending, ApprovalStatusApproved, ApprovalStatusRejected, ApprovalStatusRevoked:
		return true
	}
	return false
}

// UserBadge links users to earned badges with approval tracking
// Business Rules:
// - Auto-awarded badges have ApprovalStatus = 'approved' immediately
// - Manual badges start with ApprovalStatus = 'pending'
// - Revoked badges retain historical record but don't display in profile
// - Unique constraint prevents duplicate badges per user
// - Rejection tracking: 7-day cooldown, 3-strike permanent lock (FR-002.2)
type UserBadge struct {
	ID             uuid.UUID      `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	TenantID       uuid.UUID      `gorm:"type:uuid;not null;index:idx_user_badges_user;uniqueIndex:idx_user_badges_unique" json:"tenant_id"`
	UserID         uuid.UUID      `gorm:"type:uuid;not null;index:idx_user_badges_user;uniqueIndex:idx_user_badges_unique" json:"user_id"`
	BadgeID        uuid.UUID      `gorm:"type:uuid;not null;uniqueIndex:idx_user_badges_unique" json:"badge_id"`
	ApprovalStatus ApprovalStatus `gorm:"type:varchar(20);not null;default:'approved';index:idx_user_badges_status" json:"approval_status"`
	ApprovedBy     *uuid.UUID     `gorm:"type:uuid;null" json:"approved_by,omitempty"`
	ApprovedAt     *time.Time     `gorm:"null" json:"approved_at,omitempty"`
	EarnedAt       time.Time      `gorm:"not null;default:CURRENT_TIMESTAMP" json:"earned_at"`
	EvidenceURL    string         `gorm:"type:varchar(500);null" json:"evidence_url,omitempty"`
	Notes          string         `gorm:"type:text;null" json:"notes,omitempty"`

	// Rejection tracking fields (FR-002.2)
	RejectionCount int        `gorm:"not null;default:0" json:"rejection_count"`                           // Number of times this badge has been rejected
	CooldownUntil  *time.Time `gorm:"null;index:idx_user_badges_cooldown" json:"cooldown_until,omitempty"` // User cannot reapply until this time
	PermanentLock  bool       `gorm:"not null;default:false" json:"permanent_lock"`                        // True after 3 rejections (3-strike rule)

	// Relationships
	Badge          *Badge `gorm:"foreignKey:BadgeID;constraint:OnDelete:CASCADE" json:"badge,omitempty"`
	User           *User  `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"user,omitempty"`
	ApprovedByUser *User  `gorm:"foreignKey:ApprovedBy;constraint:OnDelete:SET NULL" json:"approved_by_user,omitempty"` // T084: User who awarded the badge
}

// TableName overrides the default table name
func (UserBadge) TableName() string {
	return "user_badges"
}

// IsVisible returns true if the badge should be displayed in user profile
func (ub *UserBadge) IsVisible() bool {
	return ub.ApprovalStatus == ApprovalStatusApproved
}

// IsPending returns true if the badge is awaiting admin approval
func (ub *UserBadge) IsPending() bool {
	return ub.ApprovalStatus == ApprovalStatusPending
}

// Approve marks the badge as approved by an admin
func (ub *UserBadge) Approve(adminID uuid.UUID) {
	ub.ApprovalStatus = ApprovalStatusApproved
	ub.ApprovedBy = &adminID
	now := time.Now()
	ub.ApprovedAt = &now
}

// Reject marks the badge as rejected with FR-002.2 rejection tracking
func (ub *UserBadge) Reject(adminID uuid.UUID, reason string) {
	ub.ApprovalStatus = ApprovalStatusRejected
	ub.ApprovedBy = &adminID
	now := time.Now()
	ub.ApprovedAt = &now
	ub.Notes = reason

	// Apply rejection policy: cooldown + 3-strike lock (FR-002.2)
	ub.IncrementRejectionCount()
}

// Revoke removes a previously approved badge
func (ub *UserBadge) Revoke(adminID uuid.UUID, reason string) {
	ub.ApprovalStatus = ApprovalStatusRevoked
	ub.ApprovedBy = &adminID
	now := time.Now()
	ub.ApprovedAt = &now
	ub.Notes = reason
}

// IsInCooldown checks if user is in 7-day cooldown period (FR-002.2)
func (ub *UserBadge) IsInCooldown() bool {
	if ub.CooldownUntil == nil {
		return false
	}
	return time.Now().Before(*ub.CooldownUntil)
}

// IncrementRejectionCount increases rejection counter and applies FR-002.2 policies:
// - First rejection: 7-day cooldown
// - Third rejection: Permanent lock (3-strike rule)
func (ub *UserBadge) IncrementRejectionCount() {
	ub.RejectionCount++

	// Apply 7-day cooldown after each rejection
	cooldown := time.Now().Add(7 * 24 * time.Hour)
	ub.CooldownUntil = &cooldown

	// Apply 3-strike rule: permanent lock after 3 rejections
	if ub.RejectionCount >= 3 {
		ub.PermanentLock = true
	}
}

// CanReapply checks if user can submit this badge for approval (FR-002.2)
// Returns false if: in cooldown period OR permanently locked
func (ub *UserBadge) CanReapply() bool {
	if ub.PermanentLock {
		return false
	}
	if ub.IsInCooldown() {
		return false
	}
	return true
}
