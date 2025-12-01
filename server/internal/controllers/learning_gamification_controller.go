package controllers

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/framework/service"
)

// LearningGamificationController handles learning XP and gamification HTTP requests
// Implements T032 from 006-course-gamification spec
type LearningGamificationController struct {
	gamificationService *service.LearningGamificationService
}

// NewLearningGamificationController creates a new learning gamification controller
func NewLearningGamificationController(gamificationService *service.LearningGamificationService) *LearningGamificationController {
	return &LearningGamificationController{
		gamificationService: gamificationService,
	}
}

// GetXPSummary handles GET /api/v1/learning/xp/summary
// Returns XP summary including total XP, level, and progress to next level
func (ctrl *LearningGamificationController) GetXPSummary(c *fiber.Ctx) error {
	// Get tenant ID
	tenantIDStr := c.Locals("tenant_id").(string)
	tenantID, err := uuid.Parse(tenantIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid tenant ID",
		})
	}

	// Get authenticated user
	userIDStr := c.Locals("user_id").(string)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	ctx := c.Context()
	summary, err := ctrl.gamificationService.GetUserXPSummary(ctx, tenantID, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get XP summary",
		})
	}

	return c.JSON(summary)
}

// GetXPTransactions handles GET /api/v1/learning/xp/transactions
// Returns paginated list of XP transactions
func (ctrl *LearningGamificationController) GetXPTransactions(c *fiber.Ctx) error {
	// Get tenant ID
	tenantIDStr := c.Locals("tenant_id").(string)
	tenantID, err := uuid.Parse(tenantIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid tenant ID",
		})
	}

	// Get authenticated user
	userIDStr := c.Locals("user_id").(string)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	// Parse pagination parameters
	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("limit", "20"))

	ctx := c.Context()
	transactions, total, err := ctrl.gamificationService.GetUserXPTransactions(ctx, tenantID, userID, page, pageSize)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get XP transactions",
		})
	}

	return c.JSON(fiber.Map{
		"data":      transactions,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
		"has_more":  int64(page*pageSize) < total,
	})
}

// GetCourseProgress handles GET /api/v1/learning/courses/:courseId/progress
// Returns course-specific XP and progress data
func (ctrl *LearningGamificationController) GetCourseProgress(c *fiber.Ctx) error {
	// Get tenant ID
	tenantIDStr := c.Locals("tenant_id").(string)
	tenantID, err := uuid.Parse(tenantIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid tenant ID",
		})
	}

	// Get authenticated user
	userIDStr := c.Locals("user_id").(string)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	// Parse course ID
	courseID, err := uuid.Parse(c.Params("courseId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid course ID",
		})
	}

	ctx := c.Context()
	progress, err := ctrl.gamificationService.GetCourseProgressWithXP(ctx, tenantID, userID, courseID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get course progress",
		})
	}

	return c.JSON(progress)
}

// GetStreak handles GET /api/v1/learning/streak
// Returns current streak information
func (ctrl *LearningGamificationController) GetStreak(c *fiber.Ctx) error {
	// Get tenant ID
	tenantIDStr := c.Locals("tenant_id").(string)
	tenantID, err := uuid.Parse(tenantIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid tenant ID",
		})
	}

	// Get authenticated user
	userIDStr := c.Locals("user_id").(string)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	ctx := c.Context()
	streak, err := ctrl.gamificationService.GetUserStreak(ctx, tenantID, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get streak",
		})
	}

	return c.JSON(streak)
}

// GetLeaderboard handles GET /api/v1/leaderboards/learning
// Returns learning XP leaderboard with timeframe filter
func (ctrl *LearningGamificationController) GetLeaderboard(c *fiber.Ctx) error {
	// Get tenant ID
	tenantIDStr := c.Locals("tenant_id").(string)
	tenantID, err := uuid.Parse(tenantIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid tenant ID",
		})
	}

	// Get authenticated user for rank context
	userIDStr := c.Locals("user_id").(string)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		userID = uuid.Nil // Anonymous access allowed
	}

	// Parse query parameters
	timeframe := service.LeaderboardTimeframe(c.Query("timeframe", "weekly"))
	limit, _ := strconv.Atoi(c.Query("limit", "50"))

	ctx := c.Context()
	entries, err := ctrl.gamificationService.GetLearningLeaderboard(ctx, tenantID, timeframe, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get leaderboard",
		})
	}

	// Find user's rank if authenticated
	var userRank interface{}
	if userID != uuid.Nil {
		for _, entry := range entries {
			if entry.UserID == userID {
				userRank = entry
				break
			}
		}
	}

	return c.JSON(fiber.Map{
		"entries":     entries,
		"user_rank":   userRank,
		"total_users": len(entries),
	})
}

// GetCourseLeaderboard handles GET /api/v1/leaderboards/learning/course/:courseId (T061)
// Returns course-specific XP leaderboard with timeframe filter
func (ctrl *LearningGamificationController) GetCourseLeaderboard(c *fiber.Ctx) error {
	// Get tenant ID
	tenantIDStr := c.Locals("tenant_id").(string)
	tenantID, err := uuid.Parse(tenantIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid tenant ID",
		})
	}

	// Get course ID from path
	courseIDStr := c.Params("courseId")
	courseID, err := uuid.Parse(courseIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid course ID",
		})
	}

	// Get authenticated user for rank context
	userIDStr := c.Locals("user_id").(string)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		userID = uuid.Nil // Anonymous access allowed
	}

	// Parse query parameters
	timeframe := service.LeaderboardTimeframe(c.Query("timeframe", "weekly"))
	limit, _ := strconv.Atoi(c.Query("limit", "50"))

	ctx := c.Context()
	entries, err := ctrl.gamificationService.GetCourseLeaderboard(ctx, tenantID, courseID, timeframe, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get course leaderboard",
		})
	}

	// Find user's rank if authenticated
	var userRank interface{}
	if userID != uuid.Nil {
		for _, entry := range entries {
			if entry.UserID == userID {
				userRank = entry
				break
			}
		}
	}

	return c.JSON(fiber.Map{
		"entries":     entries,
		"user_rank":   userRank,
		"total_users": len(entries),
		"course_id":   courseID,
	})
}

// GetDailyChallenges handles GET /api/v1/learning/challenges/daily
// Returns current daily challenges with progress
func (ctrl *LearningGamificationController) GetDailyChallenges(c *fiber.Ctx) error {
	// Get tenant ID
	tenantIDStr := c.Locals("tenant_id").(string)
	tenantID, err := uuid.Parse(tenantIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid tenant ID",
		})
	}

	// Get authenticated user
	userIDStr := c.Locals("user_id").(string)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	// Get user timezone from header or default to UTC
	userTimezone := c.Get("X-Timezone", "UTC")

	ctx := c.Context()
	challenges, err := ctrl.gamificationService.GetUserDailyChallenges(ctx, tenantID, userID, userTimezone)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get daily challenges",
		})
	}

	return c.JSON(challenges)
}

// GetCurrentLevel handles GET /api/v1/learning/level
// Returns current level with XP progress
func (ctrl *LearningGamificationController) GetCurrentLevel(c *fiber.Ctx) error {
	// Get tenant ID
	tenantIDStr := c.Locals("tenant_id").(string)
	tenantID, err := uuid.Parse(tenantIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid tenant ID",
		})
	}

	// Get authenticated user
	userIDStr := c.Locals("user_id").(string)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	ctx := c.Context()

	// Get XP summary which includes level info
	summary, err := ctrl.gamificationService.GetUserXPSummary(ctx, tenantID, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get level info",
		})
	}

	return c.JSON(fiber.Map{
		"level":            summary.Level,
		"level_name":       summary.LevelName,
		"total_xp":         summary.TotalXP,
		"xp_to_next":       summary.XPToNextLevel,
		"progress_percent": summary.ProgressPct,
	})
}

// GetAllLevels handles GET /api/v1/learning/levels
// Returns all level definitions for roadmap display
func (ctrl *LearningGamificationController) GetAllLevels(c *fiber.Ctx) error {
	// Get tenant ID
	tenantIDStr := c.Locals("tenant_id").(string)
	tenantID, err := uuid.Parse(tenantIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid tenant ID",
		})
	}

	ctx := c.Context()

	// Ensure levels exist
	if err := ctrl.gamificationService.EnsureLevelsExist(ctx, tenantID); err != nil {
		// Log but don't fail
	}

	// Get level info for XP 0 which gives us access to all levels
	level, err := ctrl.gamificationService.CalculateLevelFromXP(ctx, tenantID, 0)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get levels",
		})
	}

	return c.JSON(level)
}

// GetLearningAchievements handles GET /api/v1/learning/achievements (T052)
// Returns all learning achievements with user progress
func (ctrl *LearningGamificationController) GetLearningAchievements(c *fiber.Ctx) error {
	// Get tenant ID
	tenantIDStr := c.Locals("tenant_id").(string)
	tenantID, err := uuid.Parse(tenantIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid tenant ID",
		})
	}

	// Get authenticated user
	userIDStr := c.Locals("user_id").(string)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	ctx := c.Context()
	achievements, err := ctrl.gamificationService.GetUserLearningAchievements(ctx, tenantID, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get learning achievements",
		})
	}

	// Separate unlocked and locked achievements
	unlocked := make([]interface{}, 0)
	locked := make([]interface{}, 0)
	for _, a := range achievements {
		if a.IsUnlocked {
			unlocked = append(unlocked, a)
		} else {
			locked = append(locked, a)
		}
	}

	return c.JSON(fiber.Map{
		"achievements":       achievements,
		"unlocked":           unlocked,
		"locked":             locked,
		"total_count":        len(achievements),
		"unlocked_count":     len(unlocked),
		"completion_percent": float64(len(unlocked)) / float64(len(achievements)) * 100,
	})
}

// AwardInstructorBadge handles POST /api/v1/learning/admin/badges/award
// Allows instructors to award badges to students (T082)
func (ctrl *LearningGamificationController) AwardInstructorBadge(c *fiber.Ctx) error {
	// Get tenant ID
	tenantIDStr := c.Locals("tenant_id").(string)
	tenantID, err := uuid.Parse(tenantIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid tenant ID",
		})
	}

	// Get authenticated user (instructor)
	instructorIDStr := c.Locals("user_id").(string)
	instructorID, err := uuid.Parse(instructorIDStr)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	// Parse request body
	type AwardBadgeRequest struct {
		StudentID string `json:"student_id"`
		BadgeID   string `json:"badge_id"`
		CourseID  string `json:"course_id"`
		Message   string `json:"message"`
	}

	var req AwardBadgeRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Validate required fields
	studentID, err := uuid.Parse(req.StudentID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid student ID",
		})
	}

	badgeID, err := uuid.Parse(req.BadgeID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid badge ID",
		})
	}

	courseID, err := uuid.Parse(req.CourseID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid course ID",
		})
	}

	ctx := c.Context()
	result, err := ctrl.gamificationService.AwardInstructorBadge(ctx, tenantID, instructorID, studentID, badgeID, courseID, req.Message)
	if err != nil {
		// Handle specific errors
		switch err.Error() {
		case "Badge not found":
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Badge not found",
			})
		case "User already has this badge":
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": "Student already has this badge",
			})
		default:
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to award badge",
			})
		}
	}

	return c.Status(fiber.StatusCreated).JSON(result)
}
