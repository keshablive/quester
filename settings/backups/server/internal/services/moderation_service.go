package services

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/yourusername/quester/internal/models"
)

// ModerationService handles content moderation with AI integration
type ModerationService struct {
	db               *gorm.DB
	moderationClient *ModerationClient
}

// ModerationDecision represents the result of moderation analysis
type ModerationDecision struct {
	Status     string             `json:"status"`     // approved, flagged, rejected, pending
	Confidence float64            `json:"confidence"` // 0-100
	Categories map[string]float64 `json:"categories"` // Category scores
	Reason     string             `json:"reason"`     // Human-readable reason
}

// ModerationStats represents moderation statistics
type ModerationStats struct {
	TotalPending     int64   `json:"total_pending"`
	TotalReviewed    int64   `json:"total_reviewed"`
	ApprovedCount    int64   `json:"approved_count"`
	RemovedCount     int64   `json:"removed_count"`
	WarnedCount      int64   `json:"warned_count"`
	BannedCount      int64   `json:"banned_count"`
	ApprovalRate     float64 `json:"approval_rate"`
	FlagRate         float64 `json:"flag_rate"`
	RejectionRate    float64 `json:"rejection_rate"`
	AvgReviewTimeMin float64 `json:"avg_review_time_minutes"`
}

// DriftAnalysis represents drift detection results
type DriftAnalysis struct {
	DriftPercentage  float64 `json:"drift_percentage"`
	AlertTriggered   bool    `json:"alert_triggered"`
	Recommendation   string  `json:"recommendation"`
	BaselineAccuracy float64 `json:"baseline_accuracy"`
	CurrentAccuracy  float64 `json:"current_accuracy"`
}

// NewModerationService creates a new moderation service instance
func NewModerationService(db *gorm.DB) *ModerationService {
	return &ModerationService{
		db:               db,
		moderationClient: NewModerationClient(),
	}
}

// ModerateContent performs AI moderation on content and returns a decision
func (ms *ModerationService) ModerateContent(content string) (*ModerationDecision, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Call OpenAI Moderation API
	result, err := ms.moderationClient.Moderate(ctx, content)
	if err != nil {
		return nil, fmt.Errorf("AI moderation failed: %w", err)
	}

	// Get confidence score and categories
	confidence := result.GetConfidencePercentage()
	categories := result.GetAllScoresMap()

	// Determine status based on confidence thresholds
	// Default thresholds: >95% = reject, 70-95% = flag, <70% = approve
	decision := &ModerationDecision{
		Confidence: confidence,
		Categories: categories,
	}

	if confidence >= 95.0 {
		decision.Status = string(models.ModerationStatusRejected)
		decision.Reason = fmt.Sprintf("Content automatically rejected due to high confidence violation (%.1f%%)", confidence)
	} else if confidence >= 70.0 {
		decision.Status = string(models.ModerationStatusFlagged)
		decision.Reason = fmt.Sprintf("Content flagged for review due to moderate confidence (%.1f%%)", confidence)
	} else {
		decision.Status = string(models.ModerationStatusApproved)
		decision.Reason = "Content approved - no policy violations detected"
	}

	return decision, nil
}

// ModerateContentWithConfig performs AI moderation using custom thresholds
func (ms *ModerationService) ModerateContentWithConfig(tenantID uuid.UUID, contentType, content string) (*ModerationDecision, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Call OpenAI Moderation API
	result, err := ms.moderationClient.Moderate(ctx, content)
	if err != nil {
		return nil, fmt.Errorf("AI moderation failed: %w", err)
	}

	confidence := result.GetConfidencePercentage()
	categories := result.GetAllScoresMap()

	// Load custom thresholds if exists
	var config models.ModerationConfig
	err = ms.db.Where("tenant_id = ? AND content_type = ?", tenantID, contentType).
		First(&config).Error

	// Use default thresholds if no config found
	autoRemove := 95.0
	review := 70.0
	_ = 70.0 // autoApprove threshold for future use

	if err == nil {
		autoRemove, review, _ = config.GetThresholds()
	}

	// Apply thresholds
	decision := &ModerationDecision{
		Confidence: confidence,
		Categories: categories,
	}

	if confidence >= autoRemove {
		decision.Status = string(models.ModerationStatusRejected)
		decision.Reason = fmt.Sprintf("Content automatically rejected (confidence: %.1f%%, threshold: %.1f%%)", confidence, autoRemove)
	} else if confidence >= review {
		decision.Status = string(models.ModerationStatusFlagged)
		decision.Reason = fmt.Sprintf("Content flagged for review (confidence: %.1f%%, threshold: %.1f%%)", confidence, review)
	} else {
		decision.Status = string(models.ModerationStatusApproved)
		decision.Reason = "Content approved - no policy violations detected"
	}

	return decision, nil
}

// PreFilter performs AI pre-filtering before creating interaction
func (ms *ModerationService) PreFilter(interaction *models.Interaction) (*ModerationDecision, error) {
	// Only moderate content that has text (comments, shares with messages)
	if !interaction.RequiresModeration() {
		return &ModerationDecision{
			Status:     string(models.ModerationStatusApproved),
			Confidence: 0.0,
			Categories: make(map[string]float64),
			Reason:     "Content type does not require moderation",
		}, nil
	}

	// Moderate the content
	decision, err := ms.ModerateContentWithConfig(interaction.TenantID, interaction.TargetType, interaction.Content)
	if err != nil {
		// On error, default to pending for manual review
		return &ModerationDecision{
			Status:     string(models.ModerationStatusPending),
			Confidence: 0.0,
			Categories: make(map[string]float64),
			Reason:     "AI moderation failed, pending manual review",
		}, nil
	}

	return decision, nil
}

// ReviewContent performs manual review of flagged content
func (ms *ModerationService) ReviewContent(queueID uint, moderatorID uint, action models.ModerationAction, notes string) error {
	return ms.db.Transaction(func(tx *gorm.DB) error {
		// Get queue item
		var queueItem models.ModerationQueue
		if err := tx.Preload("Interaction").First(&queueItem, queueID).Error; err != nil {
			return fmt.Errorf("queue item not found: %w", err)
		}

		// Update queue item
		now := time.Now()
		queueItem.ReviewedBy = &moderatorID
		queueItem.ReviewedAt = &now
		queueItem.Action = action
		queueItem.ModeratorNotes = notes

		if err := tx.Save(&queueItem).Error; err != nil {
			return fmt.Errorf("failed to update queue item: %w", err)
		}

		// Update interaction status based on action
		var newStatus models.ModerationStatus
		switch action {
		case models.ModerationActionApproved:
			newStatus = models.ModerationStatusApproved
		case models.ModerationActionRemoved:
			newStatus = models.ModerationStatusRejected
		case models.ModerationActionWarned:
			newStatus = models.ModerationStatusApproved // Approve with warning
		case models.ModerationActionBanned:
			newStatus = models.ModerationStatusRejected
		}

		if err := tx.Model(&models.Interaction{}).
			Where("id = ?", queueItem.InteractionID).
			Update("moderation_status", newStatus).Error; err != nil {
			return fmt.Errorf("failed to update interaction status: %w", err)
		}

		// If action is ban, update user status
		if action == models.ModerationActionBanned {
			if err := tx.Model(&models.User{}).
				Where("id = ?", queueItem.Interaction.UserID).
				Update("is_banned", true).Error; err != nil {
				return fmt.Errorf("failed to ban user: %w", err)
			}
		}

		return nil
	})
}

// ApproveOrRemove is a convenience method for approve/remove actions
func (ms *ModerationService) ApproveOrRemove(queueID uint, moderatorID uint, approve bool, notes string) error {
	action := models.ModerationActionRemoved
	if approve {
		action = models.ModerationActionApproved
	}
	return ms.ReviewContent(queueID, moderatorID, action, notes)
}

// GetModerationStats returns moderation statistics for a tenant
func (ms *ModerationService) GetModerationStats(tenantID uint) (*ModerationStats, error) {
	stats := &ModerationStats{}

	// Count pending items
	ms.db.Model(&models.ModerationQueue{}).
		Where("tenant_id = ? AND reviewed_at IS NULL", tenantID).
		Count(&stats.TotalPending)

	// Count reviewed items
	ms.db.Model(&models.ModerationQueue{}).
		Where("tenant_id = ? AND reviewed_at IS NOT NULL", tenantID).
		Count(&stats.TotalReviewed)

	// Count by action
	ms.db.Model(&models.ModerationQueue{}).
		Where("tenant_id = ? AND action = ?", tenantID, models.ModerationActionApproved).
		Count(&stats.ApprovedCount)

	ms.db.Model(&models.ModerationQueue{}).
		Where("tenant_id = ? AND action = ?", tenantID, models.ModerationActionRemoved).
		Count(&stats.RemovedCount)

	ms.db.Model(&models.ModerationQueue{}).
		Where("tenant_id = ? AND action = ?", tenantID, models.ModerationActionWarned).
		Count(&stats.WarnedCount)

	ms.db.Model(&models.ModerationQueue{}).
		Where("tenant_id = ? AND action = ?", tenantID, models.ModerationActionBanned).
		Count(&stats.BannedCount)

	// Calculate rates
	total := float64(stats.TotalReviewed)
	if total > 0 {
		stats.ApprovalRate = float64(stats.ApprovedCount) / total * 100
		stats.FlagRate = float64(stats.TotalPending) / (total + float64(stats.TotalPending)) * 100
		stats.RejectionRate = float64(stats.RemovedCount) / total * 100
	}

	// Calculate average review time
	var avgMinutes float64
	ms.db.Model(&models.ModerationQueue{}).
		Select("AVG(EXTRACT(EPOCH FROM (reviewed_at - created_at)) / 60) as avg_minutes").
		Where("tenant_id = ? AND reviewed_at IS NOT NULL", tenantID).
		Scan(&avgMinutes)
	stats.AvgReviewTimeMin = avgMinutes

	return stats, nil
}

// DetectDrift analyzes moderation accuracy over time and detects drift
func (ms *ModerationService) DetectDrift(tenantID uint, daysWindow int) (*DriftAnalysis, error) {
	analysis := &DriftAnalysis{}

	// Calculate baseline accuracy (older data)
	_ = time.Now().AddDate(0, 0, -daysWindow*2) // oldCutoff for future baseline calculation
	newCutoff := time.Now().AddDate(0, 0, -daysWindow)

	// Baseline: older data
	var baselineApproved, baselineTotal int64
	ms.db.Model(&models.ModerationQueue{}).
		Where("tenant_id = ? AND reviewed_at IS NOT NULL AND reviewed_at < ?", tenantID, newCutoff).
		Count(&baselineTotal)

	ms.db.Model(&models.ModerationQueue{}).
		Where("tenant_id = ? AND reviewed_at IS NOT NULL AND reviewed_at < ? AND action = ?",
			tenantID, newCutoff, models.ModerationActionApproved).
		Count(&baselineApproved)

	if baselineTotal > 0 {
		analysis.BaselineAccuracy = float64(baselineApproved) / float64(baselineTotal) * 100
	}

	// Current: recent data
	var currentApproved, currentTotal int64
	ms.db.Model(&models.ModerationQueue{}).
		Where("tenant_id = ? AND reviewed_at IS NOT NULL AND reviewed_at >= ?", tenantID, newCutoff).
		Count(&currentTotal)

	ms.db.Model(&models.ModerationQueue{}).
		Where("tenant_id = ? AND reviewed_at IS NOT NULL AND reviewed_at >= ? AND action = ?",
			tenantID, newCutoff, models.ModerationActionApproved).
		Count(&currentApproved)

	if currentTotal > 0 {
		analysis.CurrentAccuracy = float64(currentApproved) / float64(currentTotal) * 100
	}

	// Calculate drift percentage
	if baselineTotal > 0 && currentTotal > 0 {
		analysis.DriftPercentage = analysis.BaselineAccuracy - analysis.CurrentAccuracy

		// Alert if drift > 5%
		if analysis.DriftPercentage > 5.0 || analysis.DriftPercentage < -5.0 {
			analysis.AlertTriggered = true
			if analysis.DriftPercentage > 0 {
				analysis.Recommendation = "Moderation accuracy has decreased. Consider adjusting AI thresholds or providing additional training to moderators."
			} else {
				analysis.Recommendation = "Moderation accuracy has improved. Current thresholds appear effective."
			}
		} else {
			analysis.Recommendation = "Moderation accuracy is stable."
		}
	}

	return analysis, nil
}

// CreateQueueItem creates a moderation queue entry for flagged content
// TODO: Update ModerationQueue model to use UUID before enabling this
func (ms *ModerationService) CreateQueueItem(interaction *models.Interaction, reason string, aiCategories map[string]float64) error {
	// Convert categories map to JSON
	categoriesJSON, err := json.Marshal(aiCategories)
	if err != nil {
		return fmt.Errorf("failed to marshal AI categories: %w", err)
	}

	// TODO: ModerationQueue model still uses uint IDs - needs migration
	_ = categoriesJSON
	_ = interaction
	_ = reason

	return fmt.Errorf("ModerationQueue migration pending - cannot create queue item")

	/* Commented out until ModerationQueue model is migrated to UUID
	queueItem := &models.ModerationQueue{
		TenantID:      interaction.TenantID,
		InteractionID: interaction.ID,
		Reason:        reason,
		AICategories:  categoriesJSON,
	}

	if err := ms.db.Create(queueItem).Error; err != nil {
		return fmt.Errorf("failed to create queue item: %w", err)
	}

	return nil
	*/
}
