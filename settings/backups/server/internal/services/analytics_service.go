package services

import (
	"context"
	"errors"
	"time"

	"github.com/gofiber/fiber/v2/log"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/yourusername/quester/internal/models"
	"github.com/yourusername/quester/internal/repositories"
)

// AnalyticsService handles analytics business logic
type AnalyticsService struct {
	repo *repositories.AnalyticsRepository
}

// NewAnalyticsService creates a new analytics service
func NewAnalyticsService(repo *repositories.AnalyticsRepository) *AnalyticsService {
	return &AnalyticsService{repo: repo}
}

// TrackUserActivity records or updates user activity for a specific date
func (s *AnalyticsService) TrackUserActivity(tenantID, userID uuid.UUID, date time.Time, activity map[string]int) error {
	// Normalize date to start of day
	date = time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, time.UTC)

	// Try to get existing analytics for the date
	existing, err := s.repo.GetUserAnalyticsByDate(tenantID, userID, date)

	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}

	if existing != nil {
		// Update existing record by incrementing values
		if val, ok := activity["login_count"]; ok {
			existing.LoginCount += val
		}
		if val, ok := activity["active_minutes"]; ok {
			existing.ActiveMinutes += val
		}
		if val, ok := activity["courses_started"]; ok {
			existing.CoursesStarted += val
		}
		if val, ok := activity["courses_completed"]; ok {
			existing.CoursesCompleted += val
		}
		if val, ok := activity["lessons_completed"]; ok {
			existing.LessonsCompleted += val
		}
		if val, ok := activity["quizzes_attempted"]; ok {
			existing.QuizzesAttempted += val
		}
		if val, ok := activity["quizzes_passed"]; ok {
			existing.QuizzesPassed += val
		}
		if val, ok := activity["points_earned"]; ok {
			existing.PointsEarned += val
		}
		if val, ok := activity["badges_earned"]; ok {
			existing.BadgesEarned += val
		}
		if val, ok := activity["posts_created"]; ok {
			existing.PostsCreated += val
		}
		if val, ok := activity["comments_created"]; ok {
			existing.CommentsCreated += val
		}
		if val, ok := activity["likes_given"]; ok {
			existing.LikesGiven += val
		}
		if val, ok := activity["messages_sent"]; ok {
			existing.MessagesSet += val
		}

		return s.repo.UpdateUserAnalytics(existing)
	}

	// Create new record
	analytics := &models.UserAnalytics{
		TenantID:         tenantID,
		UserID:           userID,
		Date:             date,
		LoginCount:       activity["login_count"],
		ActiveMinutes:    activity["active_minutes"],
		CoursesStarted:   activity["courses_started"],
		CoursesCompleted: activity["courses_completed"],
		LessonsCompleted: activity["lessons_completed"],
		QuizzesAttempted: activity["quizzes_attempted"],
		QuizzesPassed:    activity["quizzes_passed"],
		PointsEarned:     activity["points_earned"],
		BadgesEarned:     activity["badges_earned"],
		PostsCreated:     activity["posts_created"],
		CommentsCreated:  activity["comments_created"],
		LikesGiven:       activity["likes_given"],
		MessagesSet:      activity["messages_sent"],
	}

	return s.repo.CreateUserAnalytics(analytics)
}

// GetUserAnalyticsSummary retrieves aggregated user analytics for a period
func (s *AnalyticsService) GetUserAnalyticsSummary(tenantID, userID uuid.UUID, period string) (map[string]interface{}, error) {
	startDate, endDate := s.calculateDateRange(period)
	return s.repo.GetUserAnalyticsSummary(tenantID, userID, startDate, endDate)
}

// GetUserAnalyticsTimeSeries retrieves time series data for charting
func (s *AnalyticsService) GetUserAnalyticsTimeSeries(tenantID, userID uuid.UUID, period string) ([]models.UserAnalytics, error) {
	startDate, endDate := s.calculateDateRange(period)
	return s.repo.GetUserAnalyticsRange(tenantID, userID, startDate, endDate)
}

// TrackCourseActivity records or updates course activity for a specific date
func (s *AnalyticsService) TrackCourseActivity(tenantID, courseID uuid.UUID, date time.Time, metrics map[string]interface{}) error {
	date = time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, time.UTC)

	existing, err := s.repo.GetCourseAnalyticsByDate(tenantID, courseID, date)

	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}

	if existing != nil {
		// Update existing record
		if val, ok := metrics["total_enrollments"].(int); ok {
			existing.TotalEnrollments = val
		}
		if val, ok := metrics["active_students"].(int); ok {
			existing.ActiveStudents = val
		}
		if val, ok := metrics["completion_rate"].(float64); ok {
			existing.CompletionRate = val
		}
		if val, ok := metrics["average_progress"].(float64); ok {
			existing.AverageProgress = val
		}
		if val, ok := metrics["average_rating"].(float64); ok {
			existing.AverageRating = val
		}
		if val, ok := metrics["total_reviews"].(int); ok {
			existing.TotalReviews = val
		}
		if val, ok := metrics["dropout_rate"].(float64); ok {
			existing.DropoutRate = val
		}
		if val, ok := metrics["average_time_spent"].(int); ok {
			existing.AverageTimeSpent = val
		}
		if val, ok := metrics["total_revenue"].(float64); ok {
			existing.TotalRevenue = val
		}

		return s.repo.UpdateCourseAnalytics(existing)
	}

	// Create new record
	analytics := &models.CourseAnalytics{
		TenantID:         tenantID,
		CourseID:         courseID,
		Date:             date,
		TotalEnrollments: s.getIntValue(metrics, "total_enrollments"),
		ActiveStudents:   s.getIntValue(metrics, "active_students"),
		CompletionRate:   s.getFloatValue(metrics, "completion_rate"),
		AverageProgress:  s.getFloatValue(metrics, "average_progress"),
		AverageRating:    s.getFloatValue(metrics, "average_rating"),
		TotalReviews:     s.getIntValue(metrics, "total_reviews"),
		DropoutRate:      s.getFloatValue(metrics, "dropout_rate"),
		AverageTimeSpent: s.getIntValue(metrics, "average_time_spent"),
		TotalRevenue:     s.getFloatValue(metrics, "total_revenue"),
	}

	return s.repo.CreateCourseAnalytics(analytics)
}

// GetCourseAnalyticsSummary retrieves aggregated course analytics
func (s *AnalyticsService) GetCourseAnalyticsSummary(tenantID, courseID uuid.UUID, period string) (map[string]interface{}, error) {
	startDate, endDate := s.calculateDateRange(period)
	return s.repo.GetCourseAnalyticsSummary(tenantID, courseID, startDate, endDate)
}

// GetCourseAnalyticsTimeSeries retrieves time series data for a course
func (s *AnalyticsService) GetCourseAnalyticsTimeSeries(tenantID, courseID uuid.UUID, period string) ([]models.CourseAnalytics, error) {
	startDate, endDate := s.calculateDateRange(period)
	return s.repo.GetCourseAnalyticsRange(tenantID, courseID, startDate, endDate)
}

// GetTopCourses retrieves top performing courses
func (s *AnalyticsService) GetTopCourses(tenantID uuid.UUID, period string, orderBy string, limit int) ([]models.CourseAnalytics, error) {
	startDate, endDate := s.calculateDateRange(period)
	return s.repo.GetTopCourses(tenantID, startDate, endDate, orderBy, limit)
}

// TrackEngagementActivity records or updates platform engagement for a specific date
func (s *AnalyticsService) TrackEngagementActivity(tenantID uuid.UUID, date time.Time, metrics map[string]interface{}) error {
	date = time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, time.UTC)

	existing, err := s.repo.GetEngagementAnalyticsByDate(tenantID, date)

	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}

	if existing != nil {
		// Update existing record
		if val, ok := metrics["total_active_users"].(int); ok {
			existing.TotalActiveUsers = val
		}
		if val, ok := metrics["new_users"].(int); ok {
			existing.NewUsers = val
		}
		if val, ok := metrics["returning_users"].(int); ok {
			existing.ReturningUsers = val
		}
		if val, ok := metrics["daily_active_users"].(int); ok {
			existing.DailyActiveUsers = val
		}
		if val, ok := metrics["weekly_active_users"].(int); ok {
			existing.WeeklyActiveUsers = val
		}
		if val, ok := metrics["monthly_active_users"].(int); ok {
			existing.MonthlyActiveUsers = val
		}
		if val, ok := metrics["average_session_duration"].(float64); ok {
			existing.AverageSessionDuration = val
		}
		if val, ok := metrics["total_sessions"].(int); ok {
			existing.TotalSessions = val
		}
		if val, ok := metrics["page_views"].(int); ok {
			existing.PageViews = val
		}
		if val, ok := metrics["bounce_rate"].(float64); ok {
			existing.BounceRate = val
		}
		if val, ok := metrics["conversion_rate"].(float64); ok {
			existing.ConversionRate = val
		}

		return s.repo.UpdateEngagementAnalytics(existing)
	}

	// Create new record
	analytics := &models.EngagementAnalytics{
		TenantID:               tenantID,
		Date:                   date,
		TotalActiveUsers:       s.getIntValue(metrics, "total_active_users"),
		NewUsers:               s.getIntValue(metrics, "new_users"),
		ReturningUsers:         s.getIntValue(metrics, "returning_users"),
		DailyActiveUsers:       s.getIntValue(metrics, "daily_active_users"),
		WeeklyActiveUsers:      s.getIntValue(metrics, "weekly_active_users"),
		MonthlyActiveUsers:     s.getIntValue(metrics, "monthly_active_users"),
		AverageSessionDuration: s.getFloatValue(metrics, "average_session_duration"),
		TotalSessions:          s.getIntValue(metrics, "total_sessions"),
		PageViews:              s.getIntValue(metrics, "page_views"),
		BounceRate:             s.getFloatValue(metrics, "bounce_rate"),
		ConversionRate:         s.getFloatValue(metrics, "conversion_rate"),
	}

	return s.repo.CreateEngagementAnalytics(analytics)
}

// GetEngagementAnalyticsSummary retrieves aggregated engagement analytics
func (s *AnalyticsService) GetEngagementAnalyticsSummary(tenantID uuid.UUID, period string) (map[string]interface{}, error) {
	startDate, endDate := s.calculateDateRange(period)
	return s.repo.GetEngagementAnalyticsSummary(tenantID, startDate, endDate)
}

// GetEngagementAnalyticsTimeSeries retrieves time series data for engagement
func (s *AnalyticsService) GetEngagementAnalyticsTimeSeries(tenantID uuid.UUID, period string) ([]models.EngagementAnalytics, error) {
	startDate, endDate := s.calculateDateRange(period)
	return s.repo.GetEngagementAnalyticsRange(tenantID, startDate, endDate)
}

// CleanupOldAnalytics deletes analytics data older than retention period
func (s *AnalyticsService) CleanupOldAnalytics(retentionDays int) error {
	cutoffDate := time.Now().AddDate(0, 0, -retentionDays)
	return s.repo.DeleteOldAnalytics(cutoffDate)
}

// PreAggregateDailySummaries generates daily summary aggregations for all tenants
// This should be run daily via cron job at 00:30 UTC
func (s *AnalyticsService) PreAggregateDailySummaries(ctx context.Context) error {
	yesterday := time.Now().UTC().AddDate(0, 0, -1)
	startDate := time.Date(yesterday.Year(), yesterday.Month(), yesterday.Day(), 0, 0, 0, 0, time.UTC)
	endDate := time.Date(yesterday.Year(), yesterday.Month(), yesterday.Day(), 23, 59, 59, 0, time.UTC)

	log.Infof("Pre-aggregating daily summaries for date: %v", startDate)

	// Get all active tenants
	tenants, err := s.repo.GetActiveTenants()
	if err != nil {
		return err
	}

	for _, tenantID := range tenants {
		// Pre-aggregate user analytics
		if err := s.preAggregateUserSummaries(tenantID, startDate, endDate); err != nil {
			log.Errorf("Failed to pre-aggregate user summaries for tenant %s: %v", tenantID, err)
			continue
		}

		// Pre-aggregate course analytics
		if err := s.preAggregateCourseSummaries(tenantID, startDate, endDate); err != nil {
			log.Errorf("Failed to pre-aggregate course summaries for tenant %s: %v", tenantID, err)
			continue
		}

		// Pre-aggregate engagement analytics
		if err := s.preAggregateEngagementSummary(tenantID, startDate, endDate); err != nil {
			log.Errorf("Failed to pre-aggregate engagement summary for tenant %s: %v", tenantID, err)
			continue
		}
	}

	log.Info("Daily summary pre-aggregation completed successfully")
	return nil
}

// PreAggregateWeeklySummaries generates weekly summary aggregations for all tenants
// This should be run weekly via cron job on Mondays at 01:00 UTC
func (s *AnalyticsService) PreAggregateWeeklySummaries(ctx context.Context) error {
	now := time.Now().UTC()
	// Get last complete week (Monday to Sunday)
	weekStart := now.AddDate(0, 0, -int(now.Weekday())-7+1) // Last Monday
	weekEnd := weekStart.AddDate(0, 0, 6)                   // Last Sunday

	startDate := time.Date(weekStart.Year(), weekStart.Month(), weekStart.Day(), 0, 0, 0, 0, time.UTC)
	endDate := time.Date(weekEnd.Year(), weekEnd.Month(), weekEnd.Day(), 23, 59, 59, 0, time.UTC)

	log.Infof("Pre-aggregating weekly summaries for week: %v to %v", startDate, endDate)

	tenants, err := s.repo.GetActiveTenants()
	if err != nil {
		return err
	}

	for _, tenantID := range tenants {
		// Store weekly aggregates in summary table
		if err := s.storeWeeklySummary(tenantID, startDate, endDate); err != nil {
			log.Errorf("Failed to store weekly summary for tenant %s: %v", tenantID, err)
			continue
		}
	}

	log.Info("Weekly summary pre-aggregation completed successfully")
	return nil
}

// PreAggregateMonthlySummaries generates monthly summary aggregations for all tenants
// This should be run monthly via cron job on 1st day at 02:00 UTC
func (s *AnalyticsService) PreAggregateMonthlySummaries(ctx context.Context) error {
	now := time.Now().UTC()
	// Get last complete month
	lastMonth := now.AddDate(0, -1, 0)
	startDate := time.Date(lastMonth.Year(), lastMonth.Month(), 1, 0, 0, 0, 0, time.UTC)
	endDate := time.Date(lastMonth.Year(), lastMonth.Month()+1, 1, 0, 0, 0, 0, time.UTC).Add(-time.Second)

	log.Infof("Pre-aggregating monthly summaries for month: %v to %v", startDate, endDate)

	tenants, err := s.repo.GetActiveTenants()
	if err != nil {
		return err
	}

	for _, tenantID := range tenants {
		// Store monthly aggregates in summary table
		if err := s.storeMonthlySummary(tenantID, startDate, endDate); err != nil {
			log.Errorf("Failed to store monthly summary for tenant %s: %v", tenantID, err)
			continue
		}
	}

	log.Info("Monthly summary pre-aggregation completed successfully")
	return nil
}

// preAggregateUserSummaries aggregates user analytics for the given period
func (s *AnalyticsService) preAggregateUserSummaries(tenantID uuid.UUID, startDate, endDate time.Time) error {
	// Get all user analytics for the period
	analytics, err := s.repo.GetTenantUserAnalyticsRange(tenantID, startDate, endDate, 0, 0)
	if err != nil {
		return err
	}

	// Calculate aggregates
	var totalLogins, totalActiveMinutes, totalCourses, totalBadges int
	for _, a := range analytics {
		totalLogins += a.LoginCount
		totalActiveMinutes += a.ActiveMinutes
		totalCourses += a.CoursesCompleted
		totalBadges += a.BadgesEarned
	}

	// Store in cache or summary table for fast retrieval
	summary := map[string]interface{}{
		"total_users":       len(analytics),
		"total_logins":      totalLogins,
		"total_active_time": totalActiveMinutes,
		"total_courses":     totalCourses,
		"total_badges":      totalBadges,
		"avg_logins_per_user": func() float64 {
			if len(analytics) > 0 {
				return float64(totalLogins) / float64(len(analytics))
			}
			return 0
		}(),
	}

	return s.repo.StoreDailySummary(tenantID, startDate, "user_analytics", summary)
}

// preAggregateCourseSummaries aggregates course analytics for the given period
func (s *AnalyticsService) preAggregateCourseSummaries(tenantID uuid.UUID, startDate, endDate time.Time) error {
	analytics, err := s.repo.GetTenantCourseAnalyticsRange(tenantID, startDate, endDate, 0, 0)
	if err != nil {
		return err
	}

	var totalEnrollments, totalCompletions int
	var totalRevenue float64
	for _, a := range analytics {
		totalEnrollments += a.TotalEnrollments
		totalCompletions += 0 // 0 // a.TotalCompletions
		totalRevenue += a.TotalRevenue
	}

	summary := map[string]interface{}{
		"total_courses":     len(analytics),
		"total_enrollments": totalEnrollments,
		"total_completions": totalCompletions,
		"total_revenue":     totalRevenue,
		"completion_rate": func() float64 {
			if totalEnrollments > 0 {
				return float64(totalCompletions) / float64(totalEnrollments) * 100
			}
			return 0
		}(),
	}

	return s.repo.StoreDailySummary(tenantID, startDate, "course_analytics", summary)
}

// preAggregateEngagementSummary aggregates engagement analytics for the given period
func (s *AnalyticsService) preAggregateEngagementSummary(tenantID uuid.UUID, startDate, endDate time.Time) error {
	analytics, err := s.repo.GetEngagementAnalyticsRange(tenantID, startDate, endDate)
	if err != nil {
		return err
	}

	if len(analytics) == 0 {
		return nil
	}

	var totalDAU, totalWAU, totalMAU, totalSessions, totalPageViews int
	var totalSessionDuration, totalBounceRate, totalConversionRate float64

	for _, a := range analytics {
		totalDAU += a.DailyActiveUsers
		totalWAU += a.WeeklyActiveUsers
		totalMAU += a.MonthlyActiveUsers
		totalSessions += a.TotalSessions
		totalPageViews += 0 // 0 // a.TotalPageViews
		totalSessionDuration += a.AverageSessionDuration
		totalBounceRate += a.BounceRate
		totalConversionRate += a.ConversionRate
	}

	count := len(analytics)
	summary := map[string]interface{}{
		"avg_dau":              totalDAU / count,
		"avg_wau":              totalWAU / count,
		"avg_mau":              totalMAU / count,
		"total_sessions":       totalSessions,
		"total_page_views":     totalPageViews,
		"avg_session_duration": totalSessionDuration / float64(count),
		"avg_bounce_rate":      totalBounceRate / float64(count),
		"avg_conversion_rate":  totalConversionRate / float64(count),
	}

	return s.repo.StoreDailySummary(tenantID, startDate, "engagement_analytics", summary)
}

// storeWeeklySummary stores weekly aggregated summary
func (s *AnalyticsService) storeWeeklySummary(tenantID uuid.UUID, startDate, endDate time.Time) error {
	// Get daily summaries for the week
	userSummary, _ := s.repo.GetUserAnalyticsSummary(tenantID, uuid.Nil, startDate, endDate)
	courseSummary, _ := s.repo.GetCourseAnalyticsSummary(tenantID, uuid.Nil, startDate, endDate)
	engagementSummary, _ := s.repo.GetEngagementAnalyticsSummary(tenantID, startDate, endDate)

	weeklySummary := map[string]interface{}{
		"user_analytics":       userSummary,
		"course_analytics":     courseSummary,
		"engagement_analytics": engagementSummary,
		"period_type":          "weekly",
	}

	return s.repo.StoreWeeklySummary(tenantID, startDate, weeklySummary)
}

// storeMonthlySummary stores monthly aggregated summary
func (s *AnalyticsService) storeMonthlySummary(tenantID uuid.UUID, startDate, endDate time.Time) error {
	userSummary, _ := s.repo.GetUserAnalyticsSummary(tenantID, uuid.Nil, startDate, endDate)
	courseSummary, _ := s.repo.GetCourseAnalyticsSummary(tenantID, uuid.Nil, startDate, endDate)
	engagementSummary, _ := s.repo.GetEngagementAnalyticsSummary(tenantID, startDate, endDate)

	monthlySummary := map[string]interface{}{
		"user_analytics":       userSummary,
		"course_analytics":     courseSummary,
		"engagement_analytics": engagementSummary,
		"period_type":          "monthly",
	}

	return s.repo.StoreMonthlySummary(tenantID, startDate, monthlySummary)
}

// Helper methods

func (s *AnalyticsService) calculateDateRange(period string) (time.Time, time.Time) {
	now := time.Now()
	endDate := time.Date(now.Year(), now.Month(), now.Day(), 23, 59, 59, 0, time.UTC)
	var startDate time.Time

	switch period {
	case "today":
		startDate = time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	case "yesterday":
		yesterday := now.AddDate(0, 0, -1)
		startDate = time.Date(yesterday.Year(), yesterday.Month(), yesterday.Day(), 0, 0, 0, 0, time.UTC)
		endDate = time.Date(yesterday.Year(), yesterday.Month(), yesterday.Day(), 23, 59, 59, 0, time.UTC)
	case "7days", "week":
		startDate = now.AddDate(0, 0, -7)
	case "30days", "month":
		startDate = now.AddDate(0, 0, -30)
	case "90days", "quarter":
		startDate = now.AddDate(0, 0, -90)
	case "365days", "year":
		startDate = now.AddDate(0, 0, -365)
	default:
		// Default to last 30 days
		startDate = now.AddDate(0, 0, -30)
	}

	return startDate, endDate
}

func (s *AnalyticsService) getIntValue(metrics map[string]interface{}, key string) int {
	if val, ok := metrics[key].(int); ok {
		return val
	}
	if val, ok := metrics[key].(float64); ok {
		return int(val)
	}
	return 0
}

func (s *AnalyticsService) getFloatValue(metrics map[string]interface{}, key string) float64 {
	if val, ok := metrics[key].(float64); ok {
		return val
	}
	if val, ok := metrics[key].(int); ok {
		return float64(val)
	}
	return 0.0
}
