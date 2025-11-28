package models

import (
	"github.com/google/uuid"
)

// InstructorBadgeAwardRequest represents a request from an instructor to award a badge
// 006-course-gamification T080
type InstructorBadgeAwardRequest struct {
	StudentID uuid.UUID `json:"student_id" validate:"required"`
	BadgeID   uuid.UUID `json:"badge_id" validate:"required"`
	CourseID  uuid.UUID `json:"course_id" validate:"required"` // Required to verify instructor owns course
	Message   string    `json:"message" validate:"max=500"`    // Optional congratulatory message
}

// Validate checks the request is valid
func (r *InstructorBadgeAwardRequest) Validate() error {
	if r.StudentID == uuid.Nil {
		return &ValidationError{Message: "student_id is required"}
	}
	if r.BadgeID == uuid.Nil {
		return &ValidationError{Message: "badge_id is required"}
	}
	if r.CourseID == uuid.Nil {
		return &ValidationError{Message: "course_id is required"}
	}
	if len(r.Message) > 500 {
		return &ValidationError{Message: "message cannot exceed 500 characters"}
	}
	return nil
}

// InstructorBadgeAwardResponse represents the response after awarding a badge
type InstructorBadgeAwardResponse struct {
	Success     bool      `json:"success"`
	BadgeID     uuid.UUID `json:"badge_id"`
	StudentID   uuid.UUID `json:"student_id"`
	AwardedByID uuid.UUID `json:"awarded_by_id"`
	AwardedAt   string    `json:"awarded_at"`
	BadgeName   string    `json:"badge_name,omitempty"`
	Message     string    `json:"message,omitempty"`
}

// InstructorBadgeInfo represents badge information with instructor attribution
type InstructorBadgeInfo struct {
	BadgeID         uuid.UUID `json:"badge_id"`
	BadgeName       string    `json:"badge_name"`
	BadgeIconURL    string    `json:"badge_icon_url"`
	BadgeTier       string    `json:"badge_tier"`
	AwardedByID     uuid.UUID `json:"awarded_by_id,omitempty"`
	AwardedByName   string    `json:"awarded_by_name,omitempty"`
	AwardedByAvatar string    `json:"awarded_by_avatar,omitempty"`
	AwardMessage    string    `json:"award_message,omitempty"`
	CourseID        uuid.UUID `json:"course_id,omitempty"`
	CourseName      string    `json:"course_name,omitempty"`
	EarnedAt        string    `json:"earned_at"`
}
