package services

import (
	"context"
	"errors"
	"math"
	"time"

	"gorm.io/gorm"
)

// GamificationService handles XP, levels, badges, and achievements
// CONSTITUTION: Gamification-First - XP/Points integration required
type GamificationService struct {
	db *gorm.DB
}

// NewGamificationService creates a new gamification service instance
func NewGamificationService(db *gorm.DB) *GamificationService {
	return &GamificationService{db: db}
}

// XPEvent represents an event that awards XP
type XPEvent struct {
	UserID      uint
	TenantID    string
	EventType   string
	BaseXP      int
	Multiplier  float64
	Description string
}

// LevelInfo represents a user's level and progress
type LevelInfo struct {
	CurrentLevel   int
	CurrentXP      int
	XPForNextLevel int
	XPProgress     float64 // Percentage to next level (0-100)
	TotalXP        int
}

// BadgeType represents different badge categories
type BadgeType string

const (
	BadgeTypeBronze   BadgeType = "bronze"
	BadgeTypeSilver   BadgeType = "silver"
	BadgeTypeGold     BadgeType = "gold"
	BadgeTypePlatinum BadgeType = "platinum"
	BadgeTypeDiamond  BadgeType = "diamond"
)

// XP multipliers by event type
// CONSTITUTION: Gamification-First - Dynamic XP calculation
var xpMultipliers = map[string]float64{
	"quest_complete":       1.0,
	"video_watch":          0.5,
	"comment_post":         0.3,
	"like_content":         0.1,
	"share_content":        0.5,
	"follow_user":          0.2,
	"marketplace_purchase": 1.0,
	"marketplace_sale":     1.5,
	"review_post":          0.4,
	"property_list":        0.8,
	"message_send":         0.1,
	"streak_day":           0.5, // Daily login streak
	"referral":             2.0, // Referring a new user
}

// Base XP values by event type
var baseXPValues = map[string]int{
	"quest_complete":       100,
	"video_watch":          20,
	"comment_post":         10,
	"like_content":         5,
	"share_content":        15,
	"follow_user":          5,
	"marketplace_purchase": 50,
	"marketplace_sale":     75,
	"review_post":          15,
	"property_list":        30,
	"message_send":         2,
	"streak_day":           10,
	"referral":             200,
}

// AwardXP awards XP to a user for a specific event
func (s *GamificationService) AwardXP(ctx context.Context, event XPEvent) (int, error) {
	// Get base XP if not provided
	if event.BaseXP == 0 {
		if baseXP, ok := baseXPValues[event.EventType]; ok {
			event.BaseXP = baseXP
		} else {
			return 0, errors.New("unknown event type")
		}
	}

	// Get multiplier if not provided
	if event.Multiplier == 0 {
		if multiplier, ok := xpMultipliers[event.EventType]; ok {
			event.Multiplier = multiplier
		} else {
			event.Multiplier = 1.0
		}
	}

	// Calculate final XP (rounded to nearest integer)
	finalXP := int(math.Round(float64(event.BaseXP) * event.Multiplier))

	// Record XP award in database
	xpRecord := map[string]interface{}{
		"user_id":     event.UserID,
		"tenant_id":   event.TenantID,
		"event_type":  event.EventType,
		"xp_amount":   finalXP,
		"description": event.Description,
		"created_at":  time.Now(),
	}

	if err := s.db.WithContext(ctx).Table("xp_transactions").Create(xpRecord).Error; err != nil {
		return 0, err
	}

	// Update user's total XP
	if err := s.db.WithContext(ctx).
		Table("users").
		Where("id = ? AND tenant_id = ?", event.UserID, event.TenantID).
		UpdateColumn("total_xp", gorm.Expr("total_xp + ?", finalXP)).
		Error; err != nil {
		return 0, err
	}

	// Check for level up
	s.checkLevelUp(ctx, event.UserID, event.TenantID)

	return finalXP, nil
}

// GetLevelInfo retrieves a user's current level and progress
func (s *GamificationService) GetLevelInfo(ctx context.Context, userID uint, tenantID string) (*LevelInfo, error) {
	var user struct {
		TotalXP int `gorm:"column:total_xp"`
	}

	err := s.db.WithContext(ctx).
		Table("users").
		Select("total_xp").
		Where("id = ? AND tenant_id = ?", userID, tenantID).
		First(&user).Error

	if err != nil {
		return nil, err
	}

	currentLevel := calculateLevel(user.TotalXP)
	xpForCurrentLevel := xpRequiredForLevel(currentLevel)
	xpForNextLevel := xpRequiredForLevel(currentLevel + 1)
	xpInCurrentLevel := user.TotalXP - xpForCurrentLevel
	xpNeededForNext := xpForNextLevel - xpForCurrentLevel

	progress := 0.0
	if xpNeededForNext > 0 {
		progress = (float64(xpInCurrentLevel) / float64(xpNeededForNext)) * 100
	}

	return &LevelInfo{
		CurrentLevel:   currentLevel,
		CurrentXP:      xpInCurrentLevel,
		XPForNextLevel: xpNeededForNext,
		XPProgress:     progress,
		TotalXP:        user.TotalXP,
	}, nil
}

// checkLevelUp checks if user leveled up and awards badge if applicable
func (s *GamificationService) checkLevelUp(ctx context.Context, userID uint, tenantID string) {
	levelInfo, err := s.GetLevelInfo(ctx, userID, tenantID)
	if err != nil {
		return
	}

	// Update user's current level
	s.db.WithContext(ctx).
		Table("users").
		Where("id = ? AND tenant_id = ?", userID, tenantID).
		UpdateColumn("level", levelInfo.CurrentLevel)

	// Award milestone badges
	s.checkMilestoneBadges(ctx, userID, tenantID, levelInfo.CurrentLevel)
}

// checkMilestoneBadges awards badges at milestone levels
func (s *GamificationService) checkMilestoneBadges(ctx context.Context, userID uint, tenantID string, level int) {
	milestones := map[int]BadgeType{
		10:  BadgeTypeBronze,
		25:  BadgeTypeSilver,
		50:  BadgeTypeGold,
		75:  BadgeTypePlatinum,
		100: BadgeTypeDiamond,
	}

	if badgeType, exists := milestones[level]; exists {
		badge := map[string]interface{}{
			"user_id":    userID,
			"tenant_id":  tenantID,
			"badge_type": badgeType,
			"badge_name": string(badgeType) + "_level_" + string(rune(level)),
			"awarded_at": time.Now(),
		}
		s.db.WithContext(ctx).Table("user_badges").Create(badge)
	}
}

// calculateLevel determines level based on total XP
// Formula: Level = floor(sqrt(totalXP / 100))
func calculateLevel(totalXP int) int {
	if totalXP < 0 {
		return 1
	}
	level := int(math.Floor(math.Sqrt(float64(totalXP) / 100)))
	if level < 1 {
		return 1
	}
	return level
}

// xpRequiredForLevel calculates total XP needed to reach a specific level
// Formula: XP = level^2 * 100
func xpRequiredForLevel(level int) int {
	if level < 1 {
		return 0
	}
	return level * level * 100
}

// GetLeaderboard retrieves top users by XP for a tenant
func (s *GamificationService) GetLeaderboard(ctx context.Context, tenantID string, limit int) ([]map[string]interface{}, error) {
	if limit <= 0 {
		limit = 100
	}

	var leaderboard []map[string]interface{}
	err := s.db.WithContext(ctx).
		Table("users").
		Select("id, username, total_xp, level").
		Where("tenant_id = ?", tenantID).
		Order("total_xp DESC").
		Limit(limit).
		Find(&leaderboard).Error

	return leaderboard, err
}

// GetUserRank retrieves a user's rank in the leaderboard
func (s *GamificationService) GetUserRank(ctx context.Context, userID uint, tenantID string) (int, error) {
	var rank int64
	err := s.db.WithContext(ctx).
		Table("users").
		Where("tenant_id = ? AND total_xp > (SELECT total_xp FROM users WHERE id = ? AND tenant_id = ?)",
			tenantID, userID, tenantID).
		Count(&rank).Error

	if err != nil {
		return 0, err
	}

	return int(rank) + 1, nil // Rank is count + 1 (1-indexed)
}

// GetXPHistory retrieves a user's XP transaction history
func (s *GamificationService) GetXPHistory(ctx context.Context, userID uint, tenantID string, limit int) ([]map[string]interface{}, error) {
	if limit <= 0 {
		limit = 50
	}

	var history []map[string]interface{}
	err := s.db.WithContext(ctx).
		Table("xp_transactions").
		Where("user_id = ? AND tenant_id = ?", userID, tenantID).
		Order("created_at DESC").
		Limit(limit).
		Find(&history).Error

	return history, err
}
