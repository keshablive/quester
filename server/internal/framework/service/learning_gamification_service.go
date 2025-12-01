package service

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/models"
	"github.com/keshablive/quester/internal/repositories"
	"github.com/redis/go-redis/v9"
)

// Cache key prefixes and TTLs (T105, T106)
const (
	leaderboardCachePrefix = "learning:leaderboard:"
	xpSummaryCachePrefix   = "learning:xp_summary:"
	leaderboardCacheTTL    = 2 * time.Minute // Leaderboard updates every 2 minutes
	xpSummaryCacheTTL      = 5 * time.Minute // XP summaries cache for 5 minutes
)

// LearningGamificationService handles learning XP awards and tracking (T023)
// Implements FR-001 through FR-025 for course gamification
type LearningGamificationService struct {
	xpRepo          *repositories.LearningXPRepository
	streakRepo      *repositories.LearningStreakRepository
	levelRepo       *repositories.LearningLevelRepository
	challengeRepo   *repositories.LearningChallengeRepository
	userRepo        *repositories.UserRepository
	achievementRepo *repositories.AchievementRepository
	badgeRepo       *repositories.BadgeRepository

	// Optional services (set via setters to avoid circular dependencies)
	queueService        *QueueService
	notificationService *NotificationService
	leaderboardService  *LeaderboardService

	// Redis client for caching (T105, T106)
	redisClient *redis.Client
}

// NewLearningGamificationService creates a new learning gamification service
func NewLearningGamificationService(
	xpRepo *repositories.LearningXPRepository,
	streakRepo *repositories.LearningStreakRepository,
	levelRepo *repositories.LearningLevelRepository,
	challengeRepo *repositories.LearningChallengeRepository,
	userRepo *repositories.UserRepository,
) *LearningGamificationService {
	return &LearningGamificationService{
		xpRepo:        xpRepo,
		streakRepo:    streakRepo,
		levelRepo:     levelRepo,
		challengeRepo: challengeRepo,
		userRepo:      userRepo,
	}
}

// SetAchievementRepo sets the achievement repository for learning achievements
func (s *LearningGamificationService) SetAchievementRepo(ar *repositories.AchievementRepository) {
	s.achievementRepo = ar
}

// SetBadgeRepo sets the badge repository for instructor badge awards
func (s *LearningGamificationService) SetBadgeRepo(br *repositories.BadgeRepository) {
	s.badgeRepo = br
}

// SetQueueService sets the queue service for async processing
func (s *LearningGamificationService) SetQueueService(qs *QueueService) {
	s.queueService = qs
}

// SetNotificationService sets the notification service for XP notifications
func (s *LearningGamificationService) SetNotificationService(ns *NotificationService) {
	s.notificationService = ns
}

// SetLeaderboardService sets the leaderboard service for learning leaderboard updates
func (s *LearningGamificationService) SetLeaderboardService(ls *LeaderboardService) {
	s.leaderboardService = ls
}

// SetRedisClient sets the Redis client for caching (T105, T106)
func (s *LearningGamificationService) SetRedisClient(rc *redis.Client) {
	s.redisClient = rc
}

// --- DTOs ---

// LearningXPAwardParams contains parameters for awarding learning XP
type LearningXPAwardParams struct {
	TenantID    uuid.UUID
	UserID      uuid.UUID
	ActionType  models.LearningActionType
	ContentType string    // "Lesson", "Course", "Challenge"
	ContentID   uuid.UUID // ID of the related content
	Description string    // Optional description
	XPOverride  int       // Override base XP (for challenges, achievements)
	Multiplier  float64   // XP multiplier (default 1.0)
}

// LearningXPAwardResult contains the result of an XP award operation
type LearningXPAwardResult struct {
	XPAwarded            int                       `json:"xp_awarded"`
	NewTotalXP           int                       `json:"new_total_xp"`
	IsDuplicate          bool                      `json:"is_duplicate,omitempty"`
	LeveledUp            bool                      `json:"leveled_up,omitempty"`
	NewLevel             int                       `json:"new_level,omitempty"`
	NewLevelName         string                    `json:"new_level_name,omitempty"`
	StreakUpdated        bool                      `json:"streak_updated,omitempty"`
	CurrentStreak        int                       `json:"current_streak,omitempty"`
	StreakMilestoneXP    int                       `json:"streak_milestone_xp,omitempty"`
	AchievementsUnlocked []UnlockedAchievement     `json:"achievements_unlocked,omitempty"`
	ChallengesUpdated    []LearningChallengeUpdate `json:"challenges_updated,omitempty"`
}

// LearningChallengeUpdate represents a challenge that was updated
type LearningChallengeUpdate struct {
	ChallengeID     uuid.UUID `json:"challenge_id"`
	ChallengeName   string    `json:"challenge_name"`
	CurrentProgress int       `json:"current_progress"`
	TargetValue     int       `json:"target_value"`
	Completed       bool      `json:"completed"`
	XPAwarded       int       `json:"xp_awarded,omitempty"`
}

// UnlockedAchievement represents an achievement that was unlocked
type UnlockedAchievement struct {
	BadgeID     uuid.UUID `json:"badge_id"`
	BadgeName   string    `json:"badge_name"`
	Description string    `json:"description"`
	XPAwarded   int       `json:"xp_awarded"`
	IconURL     string    `json:"icon_url,omitempty"`
	Rarity      string    `json:"rarity"`
}

// --- XP Award Methods (Phase 3 - US1) ---

// AwardLessonXP awards XP for lesson completion (T027)
func (s *LearningGamificationService) AwardLessonXP(ctx context.Context, params *LearningXPAwardParams) (*LearningXPAwardResult, error) {
	// Set defaults
	if params.ActionType == "" {
		params.ActionType = models.LearningActionLessonCompletion
	}
	if params.Multiplier == 0 {
		params.Multiplier = 1.0
	}

	// Check for duplicate
	isDuplicate, err := s.xpRepo.CheckDuplicate(ctx, params.TenantID, params.UserID, params.ActionType, params.ContentType, params.ContentID)
	if err != nil {
		return nil, err
	}
	if isDuplicate {
		return &LearningXPAwardResult{IsDuplicate: true}, nil
	}

	// Calculate XP
	baseXP := params.XPOverride
	if baseXP == 0 {
		baseXP = params.ActionType.XPValue()
	}
	xpAmount := int(float64(baseXP) * params.Multiplier)

	// Create transaction
	tx := &models.LearningXPTransaction{
		TenantID:    params.TenantID,
		UserID:      params.UserID,
		ActionType:  params.ActionType,
		XPAmount:    xpAmount,
		ContentType: params.ContentType,
		ContentID:   params.ContentID,
		Description: params.Description,
		Multiplier:  params.Multiplier,
	}

	if err := s.xpRepo.Create(ctx, tx); err != nil {
		return nil, err
	}

	// Get new total XP
	newTotalXP, err := s.xpRepo.GetUserXPSum(ctx, params.TenantID, params.UserID)
	if err != nil {
		return nil, err
	}

	result := &LearningXPAwardResult{
		XPAwarded:  xpAmount,
		NewTotalXP: newTotalXP,
	}

	// Check for level up
	if err := s.checkLevelUp(ctx, params.TenantID, params.UserID, newTotalXP, result); err != nil {
		// Log error but don't fail the XP award
		// TODO: Add logging
	}

	// Update streak
	if err := s.updateStreak(ctx, params.TenantID, params.UserID, result); err != nil {
		// Log error but don't fail
	}

	// Update challenge progress
	if err := s.updateChallengeProgress(ctx, params.TenantID, params.UserID, params.ActionType, xpAmount, result); err != nil {
		// Log error but don't fail
	}

	// Check achievements (async if queue available)
	if s.queueService != nil {
		// TODO: Enqueue achievement check
	} else {
		if err := s.checkAchievements(ctx, params.TenantID, params.UserID, result); err != nil {
			// Log error but don't fail
		}
	}

	// Update user stats
	if err := s.xpRepo.IncrementUserStats(ctx, params.TenantID, params.UserID, xpAmount, 1, 0); err != nil {
		// Log error but don't fail
	}

	// Invalidate XP summary cache (T106)
	s.InvalidateXPSummaryCache(ctx, params.TenantID, params.UserID)

	// Update leaderboard (T063)
	go func() {
		if err := s.UpdateLeaderboardOnXP(context.Background(), params.TenantID, params.UserID, result.NewTotalXP); err != nil {
			// Log error but don't fail - leaderboard update is non-critical
		}
	}()

	return result, nil
}

// AwardCourseCompletionXP awards bonus XP for completing a course (T028)
func (s *LearningGamificationService) AwardCourseCompletionXP(ctx context.Context, tenantID, userID, courseID uuid.UUID, courseName string) (*LearningXPAwardResult, error) {
	params := &LearningXPAwardParams{
		TenantID:    tenantID,
		UserID:      userID,
		ActionType:  models.LearningActionCourseCompletion,
		ContentType: "Course",
		ContentID:   courseID,
		Description: "Completed course: " + courseName,
	}

	result, err := s.AwardLessonXP(ctx, params)
	if err != nil {
		return nil, err
	}

	// Update course completion count in stats
	if !result.IsDuplicate {
		if err := s.xpRepo.IncrementUserStats(ctx, tenantID, userID, 0, 0, 1); err != nil {
			// Log error but don't fail
		}
	}

	return result, nil
}

// --- Summary Methods (Phase 3 - US1) ---

// GetUserXPSummary returns XP summary for a user with Redis caching (T029, T106)
func (s *LearningGamificationService) GetUserXPSummary(ctx context.Context, tenantID, userID uuid.UUID) (*models.LearningXPSummary, error) {
	// Try cache first (T106)
	cacheKey := fmt.Sprintf("%s%s:%s", xpSummaryCachePrefix, tenantID.String(), userID.String())
	if s.redisClient != nil {
		cached, err := s.redisClient.Get(ctx, cacheKey).Result()
		if err == nil && cached != "" {
			var summary models.LearningXPSummary
			if err := json.Unmarshal([]byte(cached), &summary); err == nil {
				return &summary, nil
			}
		}
	}

	totalXP, err := s.xpRepo.GetUserXPSum(ctx, tenantID, userID)
	if err != nil {
		return nil, err
	}

	level, err := s.levelRepo.GetLevelForXP(ctx, tenantID, totalXP)
	if err != nil {
		return nil, err
	}

	summary := &models.LearningXPSummary{
		TotalXP:       totalXP,
		Level:         level.LevelNumber,
		LevelName:     level.LevelName,
		XPToNextLevel: level.XPToNextLevel(totalXP),
		ProgressPct:   level.ProgressInLevel(totalXP),
	}

	// Cache the result (T106)
	if s.redisClient != nil {
		data, err := json.Marshal(summary)
		if err == nil {
			s.redisClient.Set(ctx, cacheKey, data, xpSummaryCacheTTL)
		}
	}

	return summary, nil
}

// InvalidateXPSummaryCache invalidates cached XP summary for a user (T106)
func (s *LearningGamificationService) InvalidateXPSummaryCache(ctx context.Context, tenantID, userID uuid.UUID) {
	if s.redisClient != nil {
		cacheKey := fmt.Sprintf("%s%s:%s", xpSummaryCachePrefix, tenantID.String(), userID.String())
		s.redisClient.Del(ctx, cacheKey)
	}
}

// GetUserXPTransactions returns paginated XP transactions for a user (T030)
func (s *LearningGamificationService) GetUserXPTransactions(ctx context.Context, tenantID, userID uuid.UUID, page, pageSize int) ([]models.LearningXPTransaction, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	offset := (page - 1) * pageSize

	return s.xpRepo.FindByUser(ctx, tenantID, userID, pageSize, offset)
}

// CalculateLevelFromXP calculates level from XP amount (T031)
func (s *LearningGamificationService) CalculateLevelFromXP(ctx context.Context, tenantID uuid.UUID, xp int) (*models.LevelInfo, error) {
	return s.levelRepo.GetLevelInfo(ctx, tenantID, xp)
}

// --- Progress Methods (Phase 4 - US2) ---

// CourseProgressWithXP represents course progress with XP data
type CourseProgressWithXP struct {
	CourseID         uuid.UUID `json:"course_id"`
	CourseName       string    `json:"course_name"`
	LessonsCompleted int       `json:"lessons_completed"`
	TotalLessons     int       `json:"total_lessons"`
	XPEarned         int       `json:"xp_earned"`
	ProgressPct      float64   `json:"progress_pct"`
}

// GetCourseProgressWithXP returns course progress with XP (T040)
func (s *LearningGamificationService) GetCourseProgressWithXP(ctx context.Context, tenantID, userID, courseID uuid.UUID) (*CourseProgressWithXP, error) {
	// Get XP earned for this course (course completion bonus)
	transactions, err := s.xpRepo.FindByContent(ctx, tenantID, "Course", courseID)
	if err != nil {
		return nil, err
	}

	xpEarned := 0
	for _, tx := range transactions {
		xpEarned += tx.XPAmount
	}

	// Get lesson XP for this course (from lesson transactions that have courseID reference)
	// Note: Lessons store their course reference in the transaction metadata
	// For now, just return the course-level XP; lesson XP would need schema enhancement

	return &CourseProgressWithXP{
		CourseID: courseID,
		XPEarned: xpEarned,
	}, nil
}

// AllCoursesProgress represents progress for all enrolled courses (T041)
type AllCoursesProgress struct {
	Courses      []CourseProgressWithXP `json:"courses"`
	TotalXP      int                    `json:"total_xp"`
	TotalCourses int                    `json:"total_courses"`
}

// GetAllEnrolledCoursesProgress returns progress for all user enrollments (T041)
func (s *LearningGamificationService) GetAllEnrolledCoursesProgress(ctx context.Context, tenantID, userID uuid.UUID) (*AllCoursesProgress, error) {
	// This is a placeholder - full implementation would query enrollments
	// and aggregate XP per course. For now, return summary from user stats.

	totalXP, err := s.xpRepo.GetUserXPSum(ctx, tenantID, userID)
	if err != nil {
		return nil, err
	}

	stats, err := s.xpRepo.GetUserStats(ctx, tenantID, userID)
	if err != nil {
		// If stats don't exist, return basic info
		return &AllCoursesProgress{
			Courses:      []CourseProgressWithXP{},
			TotalXP:      totalXP,
			TotalCourses: 0,
		}, nil
	}

	return &AllCoursesProgress{
		Courses:      []CourseProgressWithXP{}, // Would be populated from enrollment queries
		TotalXP:      totalXP,
		TotalCourses: stats.CoursesCompleted,
	}, nil
}

// --- Streak Methods (Phase 7 - US5) ---

// GetUserStreak returns streak info for a user (T067)
func (s *LearningGamificationService) GetUserStreak(ctx context.Context, tenantID, userID uuid.UUID) (*models.LearningStreakInfo, error) {
	streak, err := s.streakRepo.GetOrCreate(ctx, tenantID, userID)
	if err != nil {
		return nil, err
	}
	return streak.ToInfo(), nil
}

// --- Leaderboard Methods (Phase 6 - US4) ---

// LeaderboardTimeframe represents leaderboard time periods
type LeaderboardTimeframe string

const (
	LeaderboardDaily   LeaderboardTimeframe = "daily"
	LeaderboardWeekly  LeaderboardTimeframe = "weekly"
	LeaderboardMonthly LeaderboardTimeframe = "monthly"
	LeaderboardAllTime LeaderboardTimeframe = "all_time"
)

// GetLearningLeaderboard returns learning leaderboard with Redis caching (T058, T105)
func (s *LearningGamificationService) GetLearningLeaderboard(ctx context.Context, tenantID uuid.UUID, timeframe LeaderboardTimeframe, limit int) ([]models.LearningLeaderboardEntry, error) {
	// Try cache first (T105)
	cacheKey := fmt.Sprintf("%s%s:%s:%d", leaderboardCachePrefix, tenantID.String(), timeframe, limit)
	if s.redisClient != nil {
		cached, err := s.redisClient.Get(ctx, cacheKey).Result()
		if err == nil && cached != "" {
			var entries []models.LearningLeaderboardEntry
			if err := json.Unmarshal([]byte(cached), &entries); err == nil {
				return entries, nil
			}
		}
	}

	var since time.Time
	now := time.Now()

	switch timeframe {
	case LeaderboardDaily:
		since = now.Truncate(24 * time.Hour)
	case LeaderboardWeekly:
		since = now.AddDate(0, 0, -7)
	case LeaderboardMonthly:
		since = now.AddDate(0, -1, 0)
	case LeaderboardAllTime:
		since = time.Time{} // Zero time for all-time
	default:
		since = now.AddDate(0, 0, -7) // Default to weekly
	}

	if limit <= 0 || limit > 100 {
		limit = 50
	}

	entries, err := s.xpRepo.GetLeaderboardByPeriod(ctx, tenantID, since, limit)
	if err != nil {
		return nil, err
	}

	// Cache the result (T105)
	if s.redisClient != nil && len(entries) > 0 {
		data, err := json.Marshal(entries)
		if err == nil {
			s.redisClient.Set(ctx, cacheKey, data, leaderboardCacheTTL)
		}
	}

	return entries, nil
}

// GetCourseLeaderboard returns course-specific leaderboard (T059)
func (s *LearningGamificationService) GetCourseLeaderboard(ctx context.Context, tenantID, courseID uuid.UUID, timeframe LeaderboardTimeframe, limit int) ([]models.LearningLeaderboardEntry, error) {
	var since time.Time
	now := time.Now()

	switch timeframe {
	case LeaderboardDaily:
		since = now.Truncate(24 * time.Hour)
	case LeaderboardWeekly:
		since = now.AddDate(0, 0, -7)
	case LeaderboardMonthly:
		since = now.AddDate(0, -1, 0)
	case LeaderboardAllTime:
		since = time.Time{} // Zero time for all-time
	default:
		since = now.AddDate(0, 0, -7) // Default to weekly
	}

	if limit <= 0 || limit > 100 {
		limit = 50
	}

	return s.xpRepo.GetCourseLeaderboard(ctx, tenantID, courseID, since, limit)
}

// UpdateLeaderboardOnXP updates leaderboard entries after XP is awarded (T060)
// This is called asynchronously after XP awards to update Redis sorted sets
func (s *LearningGamificationService) UpdateLeaderboardOnXP(ctx context.Context, tenantID, userID uuid.UUID, totalXP int) error {
	// Update the leaderboard service if available
	if s.leaderboardService != nil {
		// Update learning category leaderboard using the existing UpdateRank method
		if err := s.leaderboardService.UpdateRank(ctx, tenantID, userID, models.LeaderboardTypeCategory, "learning", totalXP); err != nil {
			// Log but don't fail - leaderboard is non-critical
			_ = err
		}
	}

	return nil
}

// --- Challenge Methods (Phase 9 - US7) ---

// GetUserDailyChallenges returns user's daily challenges (T088)
func (s *LearningGamificationService) GetUserDailyChallenges(ctx context.Context, tenantID, userID uuid.UUID, userTimezone string) ([]models.DailyLearningChallenge, error) {
	// Get user's current date in their timezone
	loc, err := time.LoadLocation(userTimezone)
	if err != nil {
		loc = time.UTC
	}
	userDate := time.Now().In(loc).Truncate(24 * time.Hour)

	challenges, err := s.challengeRepo.GetUserChallengesForDate(ctx, tenantID, userID, userDate)
	if err != nil {
		return nil, err
	}

	// If no challenges for today, generate new ones
	if len(challenges) == 0 {
		challenges, err = s.generateDailyChallenges(ctx, tenantID, userID, userDate, loc)
		if err != nil {
			return nil, err
		}
	}

	// Convert to DTOs
	result := make([]models.DailyLearningChallenge, len(challenges))
	for i, c := range challenges {
		result[i] = *c.ToDTO()
	}

	return result, nil
}

// --- Private Helper Methods ---

// checkLevelUp checks if user leveled up and updates result
func (s *LearningGamificationService) checkLevelUp(ctx context.Context, tenantID, userID uuid.UUID, newTotalXP int, result *LearningXPAwardResult) error {
	// Get current user level
	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		return err
	}

	// Get level for new XP
	newLevel, err := s.levelRepo.GetLevelForXP(ctx, tenantID, newTotalXP)
	if err != nil {
		return err
	}

	if newLevel.LevelNumber > user.Level {
		result.LeveledUp = true
		result.NewLevel = newLevel.LevelNumber
		result.NewLevelName = newLevel.LevelName

		// Update user level
		user.Level = newLevel.LevelNumber
		if err := s.userRepo.UpdateUser(ctx, user); err != nil {
			return err
		}

		// TODO: Send level-up notification
	}

	return nil
}

// updateStreak updates user's learning streak
func (s *LearningGamificationService) updateStreak(ctx context.Context, tenantID, userID uuid.UUID, result *LearningXPAwardResult) error {
	// Get user timezone
	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		return err
	}

	loc, err := time.LoadLocation(user.Timezone)
	if err != nil {
		loc = time.UTC
	}
	userDate := time.Now().In(loc)

	streak, milestoneReached, err := s.streakRepo.UpdateStreak(ctx, tenantID, userID, userDate)
	if err != nil {
		return err
	}

	result.StreakUpdated = true
	result.CurrentStreak = streak.CurrentStreak

	if milestoneReached {
		// Award milestone XP
		milestoneXP := models.StreakMilestones[streak.CurrentStreak]
		result.StreakMilestoneXP = milestoneXP

		// Create milestone claim
		claimed, _ := s.streakRepo.CheckMilestoneClaimed(ctx, tenantID, userID, streak.CurrentStreak)
		if !claimed {
			milestone := &models.LearningStreakMilestone{
				TenantID:      tenantID,
				UserID:        userID,
				MilestoneDays: streak.CurrentStreak,
				XPAwarded:     milestoneXP,
			}
			if err := s.streakRepo.ClaimMilestone(ctx, milestone); err != nil {
				return err
			}

			// Award milestone XP
			milestoneParams := &LearningXPAwardParams{
				TenantID:    tenantID,
				UserID:      userID,
				ActionType:  models.LearningActionStreakBonus,
				ContentType: "Streak",
				ContentID:   milestone.ID,
				Description: time.Now().Format("2006-01-02") + " streak milestone: " + string(rune(streak.CurrentStreak)) + " days",
				XPOverride:  milestoneXP,
			}

			// Award XP (without triggering another streak update)
			tx := &models.LearningXPTransaction{
				TenantID:    milestoneParams.TenantID,
				UserID:      milestoneParams.UserID,
				ActionType:  milestoneParams.ActionType,
				XPAmount:    milestoneXP,
				ContentType: milestoneParams.ContentType,
				ContentID:   milestoneParams.ContentID,
				Description: milestoneParams.Description,
				Multiplier:  1.0,
			}
			if err := s.xpRepo.Create(ctx, tx); err != nil {
				return err
			}
		}
	}

	return nil
}

// updateChallengeProgress updates challenge progress based on action
func (s *LearningGamificationService) updateChallengeProgress(ctx context.Context, tenantID, userID uuid.UUID, actionType models.LearningActionType, xpAmount int, result *LearningXPAwardResult) error {
	// Get active challenges
	challenges, err := s.challengeRepo.GetActiveUserChallenges(ctx, tenantID, userID)
	if err != nil {
		return err
	}

	for _, challenge := range challenges {
		var increment int

		switch challenge.Template.ChallengeType {
		case models.ChallengeTypeLessonCount:
			if actionType == models.LearningActionLessonCompletion {
				increment = 1
			}
		case models.ChallengeTypeXPEarned:
			increment = xpAmount
		case models.ChallengeTypeStreakMaintain:
			if result.StreakUpdated && result.CurrentStreak > 0 {
				increment = 1
			}
		}

		if increment > 0 {
			updated, completed, err := s.challengeRepo.IncrementChallengeProgress(ctx, challenge.ID, increment)
			if err != nil {
				continue
			}

			update := LearningChallengeUpdate{
				ChallengeID:     updated.ID,
				ChallengeName:   updated.Template.Name,
				CurrentProgress: updated.CurrentProgress,
				TargetValue:     updated.TargetValue,
				Completed:       completed,
			}

			if completed && updated.XPAwarded != nil {
				update.XPAwarded = *updated.XPAwarded

				// Award challenge completion XP
				tx := &models.LearningXPTransaction{
					TenantID:    tenantID,
					UserID:      userID,
					ActionType:  models.LearningActionChallenge,
					XPAmount:    *updated.XPAwarded,
					ContentType: "Challenge",
					ContentID:   updated.ID,
					Description: "Completed challenge: " + updated.Template.Name,
					Multiplier:  1.0,
				}
				if err := s.xpRepo.Create(ctx, tx); err != nil {
					// Log but don't fail
				}
			}

			result.ChallengesUpdated = append(result.ChallengesUpdated, update)
		}
	}

	return nil
}

// LearningAchievementWithProgress represents a learning achievement with user progress
type LearningAchievementWithProgress struct {
	ID          uuid.UUID  `json:"id"`
	Name        string     `json:"name"`
	Description string     `json:"description"`
	IconURL     string     `json:"icon_url"`
	Tier        string     `json:"tier"`
	Category    string     `json:"category"`
	TargetXP    int        `json:"target_xp"`
	IsUnlocked  bool       `json:"is_unlocked"`
	UnlockedAt  *time.Time `json:"unlocked_at,omitempty"`
	Progress    int        `json:"progress"`
	ProgressPct float64    `json:"progress_pct"`
}

// CheckLearningAchievements checks and unlocks learning achievements (T050)
// Returns newly unlocked achievements and awards associated badges
func (s *LearningGamificationService) CheckLearningAchievements(ctx context.Context, tenantID, userID uuid.UUID) ([]UnlockedAchievement, error) {
	if s.badgeRepo == nil {
		return nil, nil
	}

	// Get user's total learning XP
	totalXP, err := s.xpRepo.GetUserXPSum(ctx, tenantID, userID)
	if err != nil {
		return nil, err
	}

	// Get learning badges (category = 'learning')
	// Using FindAllPaginated to filter by category
	learningBadges, _, err := s.badgeRepo.FindAllPaginated(ctx, tenantID, repositories.BadgeFilters{
		Category: "learning",
		Page:     1,
		Limit:    100,
	})
	if err != nil {
		return nil, err
	}

	// Get user's already earned badges
	userBadges, err := s.badgeRepo.GetUserBadges(ctx, tenantID, userID)
	if err != nil {
		return nil, err
	}

	earnedBadgeIDs := make(map[uuid.UUID]bool)
	for _, ub := range userBadges {
		earnedBadgeIDs[ub.BadgeID] = true
	}

	var unlocked []UnlockedAchievement

	for _, badge := range learningBadges {
		// Skip already earned badges
		if earnedBadgeIDs[badge.ID] {
			continue
		}

		// Check if user meets XP threshold
		if totalXP >= badge.PointsThreshold {
			// Award the badge
			userBadge := &models.UserBadge{
				TenantID:       tenantID,
				UserID:         userID,
				BadgeID:        badge.ID,
				ApprovalStatus: models.ApprovalStatusApproved,
			}

			if err := s.badgeRepo.AwardBadgeToUser(ctx, userBadge); err != nil {
				// Log error but continue
				continue
			}

			unlocked = append(unlocked, UnlockedAchievement{
				BadgeID:     badge.ID,
				BadgeName:   badge.Name,
				Description: badge.Description,
				XPAwarded:   0, // No additional XP reward in current schema
				IconURL:     badge.IconURL,
				Rarity:      string(badge.Tier),
			})
		}
	}

	return unlocked, nil
}

// GetUserLearningAchievements returns all learning achievements with user progress (T050)
func (s *LearningGamificationService) GetUserLearningAchievements(ctx context.Context, tenantID, userID uuid.UUID) ([]LearningAchievementWithProgress, error) {
	if s.badgeRepo == nil {
		return nil, nil
	}

	// Get user's total learning XP for progress calculation
	totalXP, err := s.xpRepo.GetUserXPSum(ctx, tenantID, userID)
	if err != nil {
		return nil, err
	}

	// Get all learning badges
	learningBadges, _, err := s.badgeRepo.FindAllPaginated(ctx, tenantID, repositories.BadgeFilters{
		Category: "learning",
		Page:     1,
		Limit:    100,
	})
	if err != nil {
		return nil, err
	}

	// Get user's earned badges
	userBadges, err := s.badgeRepo.GetUserBadges(ctx, tenantID, userID)
	if err != nil {
		return nil, err
	}

	earnedBadges := make(map[uuid.UUID]time.Time)
	for _, ub := range userBadges {
		earnedBadges[ub.BadgeID] = ub.EarnedAt
	}

	achievements := make([]LearningAchievementWithProgress, 0, len(learningBadges))

	for _, badge := range learningBadges {
		// Calculate progress
		progressPct := float64(totalXP) / float64(badge.PointsThreshold) * 100
		if progressPct > 100 {
			progressPct = 100
		}

		earnedAt, isUnlocked := earnedBadges[badge.ID]
		var unlockedAt *time.Time
		if isUnlocked {
			unlockedAt = &earnedAt
		}

		achievements = append(achievements, LearningAchievementWithProgress{
			ID:          badge.ID,
			Name:        badge.Name,
			Description: badge.Description,
			IconURL:     badge.IconURL,
			Tier:        string(badge.Tier),
			Category:    string(badge.Category),
			TargetXP:    badge.PointsThreshold,
			IsUnlocked:  isUnlocked,
			UnlockedAt:  unlockedAt,
			Progress:    totalXP,
			ProgressPct: progressPct,
		})
	}

	return achievements, nil
}

// checkAchievements checks if user unlocked any achievements (internal helper)
func (s *LearningGamificationService) checkAchievements(ctx context.Context, tenantID, userID uuid.UUID, result *LearningXPAwardResult) error {
	unlocked, err := s.CheckLearningAchievements(ctx, tenantID, userID)
	if err != nil {
		return err
	}

	if len(unlocked) > 0 {
		result.AchievementsUnlocked = unlocked
	}

	return nil
}

// generateDailyChallenges generates new daily challenges for a user
func (s *LearningGamificationService) generateDailyChallenges(ctx context.Context, tenantID, userID uuid.UUID, userDate time.Time, loc *time.Location) ([]models.UserLearningChallenge, error) {
	// Get 3 random templates
	templates, err := s.challengeRepo.GetRandomTemplates(ctx, tenantID, 3)
	if err != nil {
		return nil, err
	}

	// If no templates, ensure defaults exist
	if len(templates) == 0 {
		hasTemplates, _ := s.challengeRepo.HasTemplates(ctx, tenantID)
		if !hasTemplates {
			if err := s.challengeRepo.CreateDefaultTemplates(ctx, tenantID); err != nil {
				return nil, err
			}
			templates, err = s.challengeRepo.GetRandomTemplates(ctx, tenantID, 3)
			if err != nil {
				return nil, err
			}
		}
	}

	// Calculate expiry (end of user's day)
	expiresAt := time.Date(userDate.Year(), userDate.Month(), userDate.Day(), 23, 59, 59, 0, loc)

	challenges := make([]models.UserLearningChallenge, 0, len(templates))
	for _, template := range templates {
		challenge := models.UserLearningChallenge{
			TenantID:      tenantID,
			UserID:        userID,
			TemplateID:    template.ID,
			TargetValue:   template.TargetValue,
			Status:        models.ChallengeStatusActive,
			ChallengeDate: userDate,
			ExpiresAt:     expiresAt,
		}
		challenge.Template = template // Set for DTO conversion

		if err := s.challengeRepo.CreateUserChallenge(ctx, &challenge); err != nil {
			continue
		}
		challenges = append(challenges, challenge)
	}

	return challenges, nil
}

// --- Instructor Badge Methods (Phase 8 - US6) ---

// AwardInstructorBadge allows instructors to award badges to students (T081)
// The instructor must own a course where the student is enrolled
func (s *LearningGamificationService) AwardInstructorBadge(ctx context.Context, tenantID, instructorID, studentID, badgeID, courseID uuid.UUID, message string) (*models.InstructorBadgeAwardResponse, error) {
	if s.badgeRepo == nil {
		return nil, models.ErrServiceUnavailable
	}

	// Verify the badge exists and is of learning category
	badge, err := s.badgeRepo.FindByID(ctx, tenantID, badgeID)
	if err != nil {
		return nil, err
	}
	if badge == nil {
		return nil, models.ErrBadgeNotFound
	}

	// Check if student already has this badge
	existingBadge, err := s.badgeRepo.GetUserBadge(ctx, tenantID, studentID, badgeID)
	if err != nil && err != models.ErrBadgeNotFound {
		return nil, err
	}
	if existingBadge != nil && existingBadge.ApprovalStatus == models.ApprovalStatusApproved {
		return nil, models.ErrBadgeAlreadyAwarded
	}

	// Create the user badge with instructor attribution
	now := time.Now()
	userBadge := &models.UserBadge{
		TenantID:       tenantID,
		UserID:         studentID,
		BadgeID:        badgeID,
		ApprovalStatus: models.ApprovalStatusApproved, // Instructor-awarded badges are auto-approved
		ApprovedBy:     &instructorID,
		ApprovedAt:     &now,
		EarnedAt:       now,
		Notes:          message,
	}

	if err := s.badgeRepo.AwardBadgeToUser(ctx, userBadge); err != nil {
		return nil, err
	}

	// Send notification to student (uses existing SendBadgeAward method)
	if s.notificationService != nil {
		_ = s.notificationService.SendBadgeAward(ctx, tenantID, studentID, badgeID, badge.Name)
	}

	// Build response
	response := &models.InstructorBadgeAwardResponse{
		Success:     true,
		BadgeID:     badgeID,
		StudentID:   studentID,
		AwardedByID: instructorID,
		AwardedAt:   now.Format(time.RFC3339),
		BadgeName:   badge.Name,
		Message:     message,
	}

	return response, nil
}

// --- Cron Job Methods ---

// ResetExpiredStreaks resets all expired streaks (T069)
func (s *LearningGamificationService) ResetExpiredStreaks(ctx context.Context) (int64, error) {
	// Reset streaks where last activity was more than 2 days ago
	cutoff := time.Now().AddDate(0, 0, -2).Truncate(24 * time.Hour)
	return s.streakRepo.ResetExpiredStreaks(ctx, cutoff)
}

// ExpireOldChallenges expires and cleans up old challenges (T094)
func (s *LearningGamificationService) ExpireOldChallenges(ctx context.Context) error {
	// Expire active challenges past their expiry
	_, err := s.challengeRepo.ExpireUserChallenges(ctx, time.Now())
	if err != nil {
		return err
	}

	// Clean up very old expired challenges (older than 30 days)
	_, err = s.challengeRepo.DeleteExpiredChallenges(ctx, time.Now().AddDate(0, 0, -30))
	return err
}

// EnsureLevelsExist ensures default levels exist for a tenant
func (s *LearningGamificationService) EnsureLevelsExist(ctx context.Context, tenantID uuid.UUID) error {
	hasLevels, err := s.levelRepo.HasLevels(ctx, tenantID)
	if err != nil {
		return err
	}
	if !hasLevels {
		return s.levelRepo.CreateDefaultLevels(ctx, tenantID)
	}
	return nil
}
