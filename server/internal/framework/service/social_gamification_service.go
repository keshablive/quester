package service

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/models"
	"github.com/keshablive/quester/internal/repositories"
)

// SocialGamificationService handles social XP awards and tracking
// Implements FR-001 through FR-013 for social feed gamification
type SocialGamificationService struct {
	socialXPRepo         *repositories.SocialXPRepository
	dailyChallengeRepo   *repositories.DailyChallengeRepository
	contentMilestoneRepo *repositories.ContentMilestoneRepository
	userRepo             *repositories.UserRepository
	achievementRepo      *repositories.AchievementRepository
	leaderboardService   *LeaderboardService // T055: For social leaderboard updates
	queueService         *QueueService
	notificationService  *NotificationService
}

// NewSocialGamificationService creates a new social gamification service
func NewSocialGamificationService(
	socialXPRepo *repositories.SocialXPRepository,
	dailyChallengeRepo *repositories.DailyChallengeRepository,
	contentMilestoneRepo *repositories.ContentMilestoneRepository,
	userRepo *repositories.UserRepository,
) *SocialGamificationService {
	return &SocialGamificationService{
		socialXPRepo:         socialXPRepo,
		dailyChallengeRepo:   dailyChallengeRepo,
		contentMilestoneRepo: contentMilestoneRepo,
		userRepo:             userRepo,
	}
}

// SetAchievementRepo sets the achievement repository for social achievements
func (s *SocialGamificationService) SetAchievementRepo(ar *repositories.AchievementRepository) {
	s.achievementRepo = ar
}

// SetQueueService sets the queue service for async processing (FR-013)
func (s *SocialGamificationService) SetQueueService(qs *QueueService) {
	s.queueService = qs
}

// SetNotificationService sets the notification service for XP notifications
func (s *SocialGamificationService) SetNotificationService(ns *NotificationService) {
	s.notificationService = ns
}

// SetLeaderboardService sets the leaderboard service for social leaderboard updates (T055)
func (s *SocialGamificationService) SetLeaderboardService(ls *LeaderboardService) {
	s.leaderboardService = ls
}

// XPAwardParams contains parameters for awarding XP
type XPAwardParams struct {
	TenantID    uuid.UUID
	UserID      uuid.UUID
	ActionType  models.SocialActionType
	ContentType string    // "Post", "Comment", etc.
	ContentID   uuid.UUID // ID of the related content
	Description string    // Optional description
}

// XPAwardResult contains the result of an XP award operation
type XPAwardResult struct {
	XPAwarded         int                       `json:"xp_awarded"`
	NewTotalXP        int                       `json:"new_total_xp"`
	IsRateLimited     bool                      `json:"is_rate_limited,omitempty"`
	IsDuplicate       bool                      `json:"is_duplicate,omitempty"`
	RemainingQuota    int                       `json:"remaining_quota,omitempty"`
	ChallengesUpdated []ChallengeProgressUpdate `json:"challenges_updated,omitempty"`
}

// ChallengeProgressUpdate represents progress update on a challenge
type ChallengeProgressUpdate struct {
	ChallengeID   uuid.UUID `json:"challenge_id"`
	Title         string    `json:"title"`
	CurrentCount  int       `json:"current_count"`
	TargetCount   int       `json:"target_count"`
	JustCompleted bool      `json:"just_completed"`
	XPBonus       int       `json:"xp_bonus,omitempty"`
}

// Rate limits per action type (FR-012: max 100 actions per hour)
var actionRateLimits = map[models.SocialActionType]int{
	models.SocialActionPost:    100,
	models.SocialActionLike:    100,
	models.SocialActionComment: 100,
	models.SocialActionFollow:  100,
	models.SocialActionShare:   100,
}

// T064: Content milestone thresholds for creator rewards (US5/FR-009)
// Uses model's MilestoneType constants for threshold and XP values:
//   - MilestoneTrending: 10 likes = +25 XP
//   - MilestoneViral: 50 likes = +100 XP
//   - MilestoneLegendary: 100 likes = +250 XP
// Thresholds are checked in order from highest to lowest
var contentMilestoneOrder = []models.MilestoneType{
	models.MilestoneLegendary, // 100+ likes
	models.MilestoneViral,     // 50+ likes
	models.MilestoneTrending,  // 10+ likes
}

// AwardSocialXP awards XP for a social action
// FR-001: Award XP for social interactions
// FR-002: Prevent duplicate XP for same action
// FR-012: Rate limiting
// FR-013: Async batch processing
func (s *SocialGamificationService) AwardSocialXP(ctx context.Context, params *XPAwardParams) (*XPAwardResult, error) {
	result := &XPAwardResult{}

	// FR-002: Check for duplicate
	isDup, err := s.socialXPRepo.CheckDuplicate(ctx, params.TenantID, params.UserID, params.ActionType, params.ContentType, params.ContentID)
	if err != nil {
		return nil, fmt.Errorf("failed to check duplicate: %w", err)
	}
	if isDup {
		result.IsDuplicate = true
		return result, nil
	}

	// FR-012: Check rate limit
	maxHourly := actionRateLimits[params.ActionType]
	isLimited, remaining, err := s.socialXPRepo.IsRateLimited(ctx, params.TenantID, params.UserID, params.ActionType, maxHourly)
	if err != nil {
		return nil, fmt.Errorf("failed to check rate limit: %w", err)
	}
	if isLimited {
		result.IsRateLimited = true
		result.RemainingQuota = 0
		return result, nil
	}
	result.RemainingQuota = remaining - 1 // After this action

	// Get XP amount for this action
	xpAmount := params.ActionType.XPValue()

	// Create XP transaction
	tx := &models.SocialXPTransaction{
		TenantID:    params.TenantID,
		UserID:      params.UserID,
		ActionType:  params.ActionType,
		ContentType: params.ContentType,
		ContentID:   params.ContentID,
		XPAmount:    xpAmount,
		Description: params.Description,
	}

	// FR-013: Async batch processing - queue for background persistence
	if s.queueService != nil {
		err = s.enqueueXPAward(ctx, tx, params)
		if err != nil {
			// Fall back to synchronous on queue failure
			err = s.persistXPAward(ctx, tx, params)
		}
	} else {
		err = s.persistXPAward(ctx, tx, params)
	}

	if err != nil {
		return nil, err
	}

	// Increment rate limit counter
	_, _ = s.socialXPRepo.IncrementRateLimit(ctx, params.TenantID, params.UserID, params.ActionType, maxHourly)

	result.XPAwarded = xpAmount

	// Update daily challenge progress (FR-005)
	challengeUpdates, err := s.updateChallengeProgress(ctx, params.TenantID, params.UserID, params.ActionType)
	if err == nil {
		result.ChallengesUpdated = challengeUpdates
		// Add any challenge XP bonuses
		for _, cu := range challengeUpdates {
			if cu.JustCompleted {
				result.XPAwarded += cu.XPBonus
			}
		}
	}

	// T048: Check and award social achievements
	unlockedAchievements, _ := s.CheckSocialAchievements(ctx, params.TenantID, params.UserID, params.ActionType)
	if len(unlockedAchievements) > 0 {
		// Add achievement XP to total
		for _, ua := range unlockedAchievements {
			result.XPAwarded += ua.XPReward
		}
	}

	// Get updated total XP
	userStats, _ := s.socialXPRepo.GetUserStats(ctx, params.TenantID, params.UserID)
	if userStats != nil {
		result.NewTotalXP = userStats.TotalSocialXP

		// T055: Update social leaderboard with new XP total
		if s.leaderboardService != nil {
			_ = s.leaderboardService.UpdateSocialLeaderboard(ctx, params.TenantID, params.UserID, userStats.TotalSocialXP)
		}
	}

	return result, nil
}

// persistXPAward persists XP award synchronously
func (s *SocialGamificationService) persistXPAward(ctx context.Context, tx *models.SocialXPTransaction, params *XPAwardParams) error {
	// Create transaction record
	if err := s.socialXPRepo.Create(ctx, tx); err != nil {
		return fmt.Errorf("failed to create XP transaction: %w", err)
	}

	// Update user's social stats
	if err := s.socialXPRepo.UpdateUserStats(ctx, params.TenantID, params.UserID, params.ActionType, tx.XPAmount); err != nil {
		return fmt.Errorf("failed to update user stats: %w", err)
	}

	// FR-014: Update global XP total
	if err := s.userRepo.AddSocialXP(ctx, params.UserID, tx.XPAmount); err != nil {
		// Log but don't fail - social XP is still tracked
		fmt.Printf("warning: failed to update global XP: %v\n", err)
	}

	return nil
}

// enqueueXPAward queues XP award for async processing
func (s *SocialGamificationService) enqueueXPAward(ctx context.Context, tx *models.SocialXPTransaction, params *XPAwardParams) error {
	jobPayload := map[string]interface{}{
		"transaction_id": tx.ID.String(),
		"tenant_id":      params.TenantID.String(),
		"user_id":        params.UserID.String(),
		"action_type":    string(params.ActionType),
		"content_type":   params.ContentType,
		"content_id":     params.ContentID.String(),
		"xp_amount":      tx.XPAmount,
		"description":    params.Description,
	}

	job := &Job{
		Type:     JobTypeSocialXP,
		TenantID: params.TenantID.String(),
		Payload:  jobPayload,
	}

	return s.queueService.EnqueueJob(ctx, job)
}

// ProcessXPJob processes a queued XP award job
func (s *SocialGamificationService) ProcessXPJob(ctx context.Context, jobData string) error {
	var job struct {
		Transaction models.SocialXPTransaction `json:"transaction"`
		Params      XPAwardParams              `json:"params"`
	}

	if err := json.Unmarshal([]byte(jobData), &job); err != nil {
		return fmt.Errorf("failed to unmarshal job: %w", err)
	}

	return s.persistXPAward(ctx, &job.Transaction, &job.Params)
}

// AwardMilestoneXP awards XP for content milestones (FR-009)
func (s *SocialGamificationService) AwardMilestoneXP(ctx context.Context, tenantID, userID uuid.UUID, xpAmount int, description string) error {
	tx := &models.SocialXPTransaction{
		TenantID:    tenantID,
		UserID:      userID,
		ActionType:  models.SocialActionMilestone,
		XPAmount:    xpAmount,
		Description: description,
	}

	params := &XPAwardParams{
		TenantID:   tenantID,
		UserID:     userID,
		ActionType: models.SocialActionMilestone,
	}

	return s.persistXPAward(ctx, tx, params)
}

// updateChallengeProgress updates progress on daily challenges matching this action
// FR-005: Progress daily challenges automatically
func (s *SocialGamificationService) updateChallengeProgress(ctx context.Context, tenantID, userID uuid.UUID, actionType models.SocialActionType) ([]ChallengeProgressUpdate, error) {
	// Map social action to challenge action type
	challengeAction := mapToChallengeAction(actionType)
	if challengeAction == "" {
		return nil, nil // No matching challenge action
	}

	// Increment progress on matching challenges
	completedChallenges, err := s.dailyChallengeRepo.IncrementChallengeProgress(ctx, tenantID, userID, challengeAction)
	if err != nil {
		return nil, err
	}

	var updates []ChallengeProgressUpdate
	for _, ch := range completedChallenges {
		update := ChallengeProgressUpdate{
			ChallengeID:   ch.ID,
			Title:         ch.ChallengeTemplate.Name,
			CurrentCount:  ch.CurrentCount,
			TargetCount:   ch.TargetCount,
			JustCompleted: ch.Completed,
		}

		if ch.Completed {
			update.XPBonus = ch.XPReward
			// Award challenge XP
			_ = s.userRepo.AddSocialXP(ctx, userID, ch.XPReward)
			// Mark XP as awarded
			_ = s.dailyChallengeRepo.MarkChallengeXPAwarded(ctx, ch.ID)
		}

		updates = append(updates, update)
	}

	// Check for Perfect Day bonus (FR-006)
	if len(updates) > 0 {
		s.checkPerfectDayBonus(ctx, tenantID, userID)
	}

	return updates, nil
}

// checkPerfectDayBonus checks if user has completed all daily challenges
// FR-006: Award "Perfect Day" bonus
func (s *SocialGamificationService) checkPerfectDayBonus(ctx context.Context, tenantID, userID uuid.UUID) {
	// Check if already received today
	existing, _ := s.dailyChallengeRepo.CheckPerfectDayBonus(ctx, tenantID, userID)
	if existing != nil {
		return // Already awarded
	}

	// Check completion status
	allCompleted, challengesCount, err := s.dailyChallengeRepo.CheckAllChallengesCompleted(ctx, tenantID, userID)
	if err != nil || !allCompleted {
		return
	}

	// All challenges completed! Award perfect day bonus
	bonus := &models.PerfectDayBonus{
		TenantID:            tenantID,
		UserID:              userID,
		ChallengeDate:       time.Now().UTC().Truncate(24 * time.Hour),
		ChallengesCompleted: challengesCount,
		XPBonus:             models.DefaultPerfectDayXPBonus,
	}

	if err := s.dailyChallengeRepo.CreatePerfectDayBonus(ctx, bonus); err == nil {
		// Award the bonus XP
		_ = s.userRepo.AddSocialXP(ctx, userID, bonus.XPBonus)
	}
}

// CheckContentMilestones checks and awards content milestone bonuses (T065/FR-009)
// FR-009: Award bonuses at engagement milestones
func (s *SocialGamificationService) CheckContentMilestones(ctx context.Context, tenantID uuid.UUID, contentType string, contentID, authorID uuid.UUID, currentLikes int) ([]models.ContentMilestone, error) {
	// T066: Check and record milestones in repository (prevents duplicates)
	newMilestones, err := s.contentMilestoneRepo.CheckAndAwardMilestones(ctx, tenantID, contentType, contentID, authorID, currentLikes)
	if err != nil {
		return nil, err
	}

	// T065/T068: For each new milestone, award XP bonus and send notification
	for _, milestone := range newMilestones {
		// Award XP bonus for milestone
		tx := &models.SocialXPTransaction{
			TenantID:    tenantID,
			UserID:      authorID,
			ActionType:  models.SocialActionPost, // Use post action type for milestone bonus
			ContentType: contentType,
			ContentID:   contentID,
			XPAmount:    milestone.XPBonus,
			Description: fmt.Sprintf("Content milestone bonus: %s (%d likes)", milestone.MilestoneType, currentLikes),
		}

		if err := s.socialXPRepo.Create(ctx, tx); err != nil {
			// Log error but continue - milestone is already recorded
			continue
		}

		// Update user's total social XP
		_ = s.socialXPRepo.UpdateUserStats(ctx, tenantID, authorID, models.SocialActionPost, milestone.XPBonus)

		// T068: Send milestone notification to author
		s.sendMilestoneNotification(ctx, tenantID, authorID, milestone.MilestoneType, milestone.XPBonus, currentLikes)
	}

	return newMilestones, nil
}

// GetUserSocialStats retrieves user's social XP statistics
func (s *SocialGamificationService) GetUserSocialStats(ctx context.Context, tenantID, userID uuid.UUID) (*models.UserSocialStats, error) {
	return s.socialXPRepo.GetUserStats(ctx, tenantID, userID)
}

// GetUserXPHistory retrieves recent XP transactions for a user
func (s *SocialGamificationService) GetUserXPHistory(ctx context.Context, tenantID, userID uuid.UUID, limit int) ([]models.SocialXPTransaction, error) {
	return s.socialXPRepo.FindByUser(ctx, tenantID, userID, limit)
}

// GetUserDailyChallenges retrieves user's progress on today's challenges
func (s *SocialGamificationService) GetUserDailyChallenges(ctx context.Context, tenantID, userID uuid.UUID) ([]UserChallengeStatus, error) {
	// Get or create today's challenges for this user
	challenges, err := s.dailyChallengeRepo.GetOrCreateUserDailyChallenges(ctx, tenantID, userID)
	if err != nil {
		return nil, err
	}

	// Mark first viewed to lock the 24h window
	_ = s.dailyChallengeRepo.MarkFirstViewed(ctx, tenantID, userID)

	// Build status list
	var statuses []UserChallengeStatus
	for _, c := range challenges {
		status := UserChallengeStatus{
			ChallengeID:  c.ID,
			Title:        c.ChallengeTemplate.Name,
			Description:  c.ChallengeTemplate.Description,
			ActionType:   c.ChallengeTemplate.ActionType,
			TargetCount:  c.TargetCount,
			CurrentCount: c.CurrentCount,
			XPReward:     c.XPReward,
			Completed:    c.Completed,
			CompletedAt:  c.CompletedAt,
			ExpiresAt:    c.ExpiresAt,
		}
		statuses = append(statuses, status)
	}

	return statuses, nil
}

// UserChallengeStatus represents a user's status on a daily challenge
type UserChallengeStatus struct {
	ChallengeID  uuid.UUID                  `json:"challenge_id"`
	Title        string                     `json:"title"`
	Description  string                     `json:"description"`
	ActionType   models.ChallengeActionType `json:"action_type"`
	TargetCount  int                        `json:"target_count"`
	CurrentCount int                        `json:"current_count"`
	XPReward     int                        `json:"xp_reward"`
	Completed    bool                       `json:"completed"`
	CompletedAt  *time.Time                 `json:"completed_at,omitempty"`
	ExpiresAt    time.Time                  `json:"expires_at"`
}

// mapToChallengeAction maps social action to challenge action type
func mapToChallengeAction(action models.SocialActionType) models.ChallengeActionType {
	switch action {
	case models.SocialActionLike:
		return models.ChallengeActionLike
	case models.SocialActionComment:
		return models.ChallengeActionComment
	case models.SocialActionPost:
		return models.ChallengeActionPost
	case models.SocialActionFollow:
		return models.ChallengeActionFollow
	case models.SocialActionShare:
		return models.ChallengeActionShare
	default:
		return ""
	}
}

// SocialXPSummary provides a summary of social XP for display
type SocialXPSummary struct {
	TotalSocialXP int `json:"total_social_xp"`
	TodayXP       int `json:"today_xp"`
	WeeklyXP      int `json:"weekly_xp"`
	GlobalXPTotal int `json:"global_xp_total"`
	PostsXP       int `json:"posts_xp"`
	LikesXP       int `json:"likes_xp"`
	CommentsXP    int `json:"comments_xp"`
	FollowsXP     int `json:"follows_xp"`
	SharesXP      int `json:"shares_xp"`
	MilestonesXP  int `json:"milestones_xp"`
	ChallengesXP  int `json:"challenges_xp"`
}

// GetXPSummary retrieves a comprehensive XP summary for a user
func (s *SocialGamificationService) GetXPSummary(ctx context.Context, tenantID, userID uuid.UUID) (*SocialXPSummary, error) {
	stats, err := s.socialXPRepo.GetUserStats(ctx, tenantID, userID)
	if err != nil {
		return nil, err
	}

	// Get today's XP
	today := time.Now().UTC().Truncate(24 * time.Hour)
	todayXP, _ := s.socialXPRepo.GetUserXPByPeriod(ctx, tenantID, userID, today)

	// Get weekly XP
	weekAgo := today.AddDate(0, 0, -7)
	weeklyXP, _ := s.socialXPRepo.GetUserXPByPeriod(ctx, tenantID, userID, weekAgo)

	// Get global XP total
	globalXP, _ := s.userRepo.GetUserXP(ctx, userID)

	// Get milestone stats
	milestoneStats, _ := s.contentMilestoneRepo.GetAuthorMilestoneStats(ctx, tenantID, userID)

	summary := &SocialXPSummary{
		TotalSocialXP: stats.TotalSocialXP,
		TodayXP:       todayXP,
		WeeklyXP:      weeklyXP,
		GlobalXPTotal: globalXP,
		PostsXP:       stats.PostsCount * models.SocialActionPost.XPValue(),
		LikesXP:       stats.LikesGivenCount * models.SocialActionLike.XPValue(),
		CommentsXP:    stats.CommentsCount * models.SocialActionComment.XPValue(),
		FollowsXP:     stats.FollowingCount * models.SocialActionFollow.XPValue(),
		SharesXP:      stats.SharesCount * models.SocialActionShare.XPValue(),
	}

	if milestoneStats != nil {
		summary.MilestonesXP = milestoneStats.TotalXPEarned
	}

	return summary, nil
}

// SerializeAwardResult serializes XP award result for optimistic UI response
func SerializeAwardResult(result *XPAwardResult) ([]byte, error) {
	return json.Marshal(result)
}

// === Social Achievements (US3) ===

// SocialAchievementType defines the type of social achievement
type SocialAchievementType string

const (
	AchievementPosts         SocialAchievementType = "posts"
	AchievementLikesGiven    SocialAchievementType = "likes_given"
	AchievementLikesReceived SocialAchievementType = "likes_received"
	AchievementComments      SocialAchievementType = "comments"
	AchievementFollows       SocialAchievementType = "follows"
	AchievementShares        SocialAchievementType = "shares"
)

// socialAchievementThresholds defines thresholds for each achievement type
var socialAchievementThresholds = map[SocialAchievementType][]struct {
	Name      string
	Threshold int
}{
	AchievementPosts: {
		{"First Post", 1},
		{"Content Creator", 10},
		{"Prolific Poster", 50},
		{"Social Influencer", 100},
	},
	AchievementLikesGiven: {
		{"First Like", 1},
		{"Appreciator", 10},
		{"Super Supporter", 50},
		{"Like Machine", 100},
		{"Heart of Gold", 500},
	},
	AchievementComments: {
		{"Conversation Starter", 1},
		{"Active Commenter", 10},
		{"Discussion Leader", 50},
		{"Community Voice", 100},
	},
	AchievementFollows: {
		{"First Connection", 1},
		{"Networker", 5},
		{"Social Butterfly", 25},
		{"Community Builder", 100},
	},
	AchievementLikesReceived: {
		{"Getting Noticed", 10},
		{"Rising Star", 100},
		{"Popular Creator", 500},
		{"Viral Sensation", 1000},
	},
	AchievementShares: {
		{"First Share", 1},
		{"Share Enthusiast", 10},
		{"Content Amplifier", 50},
	},
}

// AchievementUnlockResult represents a newly unlocked achievement
type AchievementUnlockResult struct {
	AchievementID   uuid.UUID `json:"achievement_id"`
	AchievementName string    `json:"achievement_name"`
	Description     string    `json:"description"`
	IconURL         string    `json:"icon_url"`
	XPReward        int       `json:"xp_reward"`
	Difficulty      string    `json:"difficulty"`
}

// CheckSocialAchievements checks and awards achievements based on user stats
// T042-T047: Implement achievement triggers for various social actions
func (s *SocialGamificationService) CheckSocialAchievements(ctx context.Context, tenantID, userID uuid.UUID, actionType models.SocialActionType) ([]AchievementUnlockResult, error) {
	if s.achievementRepo == nil {
		return nil, nil // Achievements not configured
	}

	// Get user's current social stats
	stats, err := s.socialXPRepo.GetUserStats(ctx, tenantID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user stats: %w", err)
	}

	var unlockedAchievements []AchievementUnlockResult

	// Map action type to achievement type(s) to check
	achievementTypesToCheck := mapActionToAchievementTypes(actionType)

	for _, achievementType := range achievementTypesToCheck {
		currentCount := getStatCountForType(stats, achievementType)
		thresholds := socialAchievementThresholds[achievementType]

		for _, threshold := range thresholds {
			if currentCount >= threshold.Threshold {
				// Check if this achievement exists and isn't already completed
				unlocked, err := s.tryUnlockAchievement(ctx, tenantID, userID, threshold.Name, currentCount)
				if err != nil {
					continue // Log and continue with other achievements
				}
				if unlocked != nil {
					unlockedAchievements = append(unlockedAchievements, *unlocked)
				}
			}
		}
	}

	return unlockedAchievements, nil
}

// mapActionToAchievementTypes maps a social action to relevant achievement types
func mapActionToAchievementTypes(actionType models.SocialActionType) []SocialAchievementType {
	switch actionType {
	case models.SocialActionPost:
		return []SocialAchievementType{AchievementPosts}
	case models.SocialActionLike:
		return []SocialAchievementType{AchievementLikesGiven}
	case models.SocialActionComment:
		return []SocialAchievementType{AchievementComments}
	case models.SocialActionFollow:
		return []SocialAchievementType{AchievementFollows}
	case models.SocialActionShare:
		return []SocialAchievementType{AchievementShares}
	default:
		return nil
	}
}

// getStatCountForType retrieves the relevant count from stats
func getStatCountForType(stats *models.UserSocialStats, achievementType SocialAchievementType) int {
	if stats == nil {
		return 0
	}
	switch achievementType {
	case AchievementPosts:
		return stats.PostsCount
	case AchievementLikesGiven:
		return stats.LikesGivenCount
	case AchievementLikesReceived:
		return stats.LikesReceivedCount
	case AchievementComments:
		return stats.CommentsCount
	case AchievementFollows:
		return stats.FollowingCount
	case AchievementShares:
		return stats.SharesCount
	default:
		return 0
	}
}

// tryUnlockAchievement attempts to unlock an achievement by name
func (s *SocialGamificationService) tryUnlockAchievement(ctx context.Context, tenantID, userID uuid.UUID, achievementName string, currentCount int) (*AchievementUnlockResult, error) {
	// Find achievement by name in social category
	achievements, err := s.achievementRepo.FindByCategory(ctx, tenantID, models.AchievementCategorySocial)
	if err != nil {
		return nil, err
	}

	var targetAchievement *models.Achievement
	for i := range achievements {
		if achievements[i].Name == achievementName {
			targetAchievement = &achievements[i]
			break
		}
	}

	if targetAchievement == nil {
		return nil, nil // Achievement not found
	}

	// Find or create user achievement progress
	userAchievement, err := s.achievementRepo.FindOrCreateUserAchievement(ctx, tenantID, userID, targetAchievement.ID)
	if err != nil {
		return nil, err
	}

	// Check if already completed
	if userAchievement.Completed {
		return nil, nil // Already unlocked
	}

	// Update progress
	userAchievement.CurrentCount = currentCount

	// Check if threshold met
	if currentCount >= targetAchievement.TargetCount {
		// Complete the achievement
		if err := s.achievementRepo.CompleteUserAchievement(ctx, userID, targetAchievement.ID); err != nil {
			return nil, err
		}

		// Award XP for achievement
		if targetAchievement.XPReward > 0 {
			awardParams := &XPAwardParams{
				TenantID:    tenantID,
				UserID:      userID,
				ActionType:  models.SocialActionAchievement,
				ContentType: "Achievement",
				ContentID:   targetAchievement.ID,
				Description: fmt.Sprintf("Achievement unlocked: %s", achievementName),
			}
			// Award XP (don't check rate limit for achievements)
			tx := &models.SocialXPTransaction{
				TenantID:    tenantID,
				UserID:      userID,
				ActionType:  models.SocialActionAchievement,
				ContentType: "Achievement",
				ContentID:   targetAchievement.ID,
				XPAmount:    targetAchievement.XPReward,
				Description: awardParams.Description,
			}
			_ = s.persistXPAward(ctx, tx, awardParams)
		}

		// Send notification
		if s.notificationService != nil {
			actionURL := "/profile/achievements"
			_, _ = s.notificationService.CreateNotification(
				ctx,
				tenantID.String(),
				userID.String(),
				"achievement_unlocked",
				"Achievement Unlocked!",
				fmt.Sprintf("You earned the \"%s\" achievement!", achievementName),
				actionURL,
				targetAchievement.IconURL,
				string(models.NotificationPriorityNormal),
				[]string{"in_app"},
				map[string]any{
					"achievement_id":   targetAchievement.ID.String(),
					"achievement_name": achievementName,
					"xp_reward":        targetAchievement.XPReward,
				},
			)
		}

		return &AchievementUnlockResult{
			AchievementID:   targetAchievement.ID,
			AchievementName: achievementName,
			Description:     targetAchievement.Description,
			IconURL:         targetAchievement.IconURL,
			XPReward:        targetAchievement.XPReward,
			Difficulty:      string(targetAchievement.Difficulty),
		}, nil
	}

	// Just update progress
	if err := s.achievementRepo.UpdateUserAchievementProgress(ctx, userAchievement); err != nil {
		return nil, err
	}

	return nil, nil
}

// CheckLikesReceivedAchievements checks achievements for likes received on user's content
// This should be called when someone else likes the content creator's post
func (s *SocialGamificationService) CheckLikesReceivedAchievements(ctx context.Context, tenantID, contentAuthorID uuid.UUID) ([]AchievementUnlockResult, error) {
	if s.achievementRepo == nil {
		return nil, nil
	}

	// Get content author's stats
	stats, err := s.socialXPRepo.GetUserStats(ctx, tenantID, contentAuthorID)
	if err != nil {
		return nil, err
	}

	var unlockedAchievements []AchievementUnlockResult
	currentCount := stats.LikesReceivedCount
	thresholds := socialAchievementThresholds[AchievementLikesReceived]

	for _, threshold := range thresholds {
		if currentCount >= threshold.Threshold {
			unlocked, err := s.tryUnlockAchievement(ctx, tenantID, contentAuthorID, threshold.Name, currentCount)
			if err != nil {
				continue
			}
			if unlocked != nil {
				unlockedAchievements = append(unlockedAchievements, *unlocked)
			}
		}
	}

	return unlockedAchievements, nil
}

// GetUserSocialAchievements retrieves all social achievements for a user
func (s *SocialGamificationService) GetUserSocialAchievements(ctx context.Context, tenantID, userID uuid.UUID) ([]models.UserAchievement, error) {
	if s.achievementRepo == nil {
		return nil, fmt.Errorf("achievement repository not configured")
	}

	// Get all user achievements
	userAchievements, err := s.achievementRepo.FindUserAchievements(ctx, userID, false)
	if err != nil {
		return nil, err
	}

	// Filter to social category
	var socialAchievements []models.UserAchievement
	for _, ua := range userAchievements {
		if ua.Achievement.Category == models.AchievementCategorySocial {
			socialAchievements = append(socialAchievements, ua)
		}
	}

	return socialAchievements, nil
}

// ContentMilestoneResult represents the result of a milestone check
type ContentMilestoneResult struct {
	MilestoneType models.MilestoneType `json:"milestone_type"`
	Threshold     int                  `json:"threshold"`
	XPBonus       int                  `json:"xp_bonus"`
	IsNew         bool                 `json:"is_new"` // True if this milestone was just awarded
}

// sendMilestoneNotification sends a notification when a content milestone is reached (T068)
func (s *SocialGamificationService) sendMilestoneNotification(ctx context.Context, tenantID, authorID uuid.UUID, milestoneType models.MilestoneType, xpBonus, likeCount int) {
	if s.notificationService == nil {
		return
	}

	title := "Content Milestone Reached! 🎉"
	var body string

	switch milestoneType {
	case models.MilestoneTrending:
		body = fmt.Sprintf("Your post is trending! 🔥 It reached %d likes and you earned +%d XP!", likeCount, xpBonus)
	case models.MilestoneViral:
		body = fmt.Sprintf("Your post went viral! 🚀 It reached %d likes and you earned +%d XP!", likeCount, xpBonus)
	case models.MilestoneLegendary:
		body = fmt.Sprintf("LEGENDARY! 👑 Your post reached %d likes and you earned +%d XP!", likeCount, xpBonus)
	default:
		body = fmt.Sprintf("Milestone reached! Your post got %d likes and you earned +%d XP!", likeCount, xpBonus)
	}

	metadata := map[string]any{
		"milestone_type": string(milestoneType),
		"xp_bonus":       xpBonus,
		"like_count":     likeCount,
	}

	_, _ = s.notificationService.CreateNotification(
		ctx,
		tenantID.String(),
		authorID.String(),
		"content_milestone",
		title,
		body,
		"", // actionURL
		"", // iconURL
		"high",
		[]string{"push", "in_app"},
		metadata,
	)
}

// GetContentMilestones retrieves all milestones for a specific content item
func (s *SocialGamificationService) GetContentMilestones(ctx context.Context, tenantID uuid.UUID, contentType string, contentID uuid.UUID) ([]models.ContentMilestone, error) {
	return s.contentMilestoneRepo.FindByContent(ctx, tenantID, contentType, contentID)
}

// GetAuthorMilestones retrieves all milestones earned by a content author
func (s *SocialGamificationService) GetAuthorMilestones(ctx context.Context, tenantID, authorID uuid.UUID) ([]models.ContentMilestone, error) {
	return s.contentMilestoneRepo.FindByAuthor(ctx, tenantID, authorID)
}
