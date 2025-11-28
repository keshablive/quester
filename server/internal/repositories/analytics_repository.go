package repositories

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/keshablive/quester/internal/models"
)

// AnalyticsRepository handles analytics data operations
type AnalyticsRepository struct {
	db *gorm.DB
}

// NewAnalyticsRepository creates a new analytics repository
func NewAnalyticsRepository(db *gorm.DB) *AnalyticsRepository {
	return &AnalyticsRepository{db: db}
}

// UserAnalytics operations

// CreateUserAnalytics creates a new user analytics record
func (r *AnalyticsRepository) CreateUserAnalytics(analytics *models.UserAnalytics) error {
	return r.db.Create(analytics).Error
}

// GetUserAnalyticsByID retrieves user analytics by ID
func (r *AnalyticsRepository) GetUserAnalyticsByID(id uuid.UUID) (*models.UserAnalytics, error) {
	var analytics models.UserAnalytics
	err := r.db.Where("id = ?", id).First(&analytics).Error
	if err != nil {
		return nil, err
	}
	return &analytics, nil
}

// GetUserAnalyticsByDate retrieves user analytics for a specific date
func (r *AnalyticsRepository) GetUserAnalyticsByDate(tenantID, userID uuid.UUID, date time.Time) (*models.UserAnalytics, error) {
	var analytics models.UserAnalytics
	err := r.db.Where("tenant_id = ? AND user_id = ? AND date = ?", tenantID, userID, date).
		First(&analytics).Error
	if err != nil {
		return nil, err
	}
	return &analytics, nil
}

// GetUserAnalyticsRange retrieves user analytics for a date range
func (r *AnalyticsRepository) GetUserAnalyticsRange(tenantID, userID uuid.UUID, startDate, endDate time.Time) ([]models.UserAnalytics, error) {
	var analytics []models.UserAnalytics
	err := r.db.Where("tenant_id = ? AND user_id = ? AND date >= ? AND date <= ?",
		tenantID, userID, startDate, endDate).
		Order("date ASC").
		Find(&analytics).Error
	return analytics, err
}

// GetTenantUserAnalyticsRange retrieves analytics for all users in a tenant for a date range
func (r *AnalyticsRepository) GetTenantUserAnalyticsRange(tenantID uuid.UUID, startDate, endDate time.Time, limit, offset int) ([]models.UserAnalytics, error) {
	var analytics []models.UserAnalytics
	query := r.db.Where("tenant_id = ? AND date >= ? AND date <= ?", tenantID, startDate, endDate).
		Order("date DESC")

	if limit > 0 {
		query = query.Limit(limit).Offset(offset)
	}

	err := query.Find(&analytics).Error
	return analytics, err
}

// UpdateUserAnalytics updates user analytics record
func (r *AnalyticsRepository) UpdateUserAnalytics(analytics *models.UserAnalytics) error {
	return r.db.Save(analytics).Error
}

// GetUserAnalyticsSummary aggregates user analytics for a period
func (r *AnalyticsRepository) GetUserAnalyticsSummary(tenantID, userID uuid.UUID, startDate, endDate time.Time) (map[string]interface{}, error) {
	var result struct {
		TotalLogins           int
		TotalActiveMinutes    int
		TotalCoursesStarted   int
		TotalCoursesCompleted int
		TotalLessonsCompleted int
		TotalQuizzesAttempted int
		TotalQuizzesPassed    int
		TotalPointsEarned     int
		TotalBadgesEarned     int
		TotalPostsCreated     int
		TotalCommentsCreated  int
		TotalLikesGiven       int
		TotalMessagesSent     int
	}

	err := r.db.Model(&models.UserAnalytics{}).
		Select(`
			COALESCE(SUM(login_count), 0) as total_logins,
			COALESCE(SUM(active_minutes), 0) as total_active_minutes,
			COALESCE(SUM(courses_started), 0) as total_courses_started,
			COALESCE(SUM(courses_completed), 0) as total_courses_completed,
			COALESCE(SUM(lessons_completed), 0) as total_lessons_completed,
			COALESCE(SUM(quizzes_attempted), 0) as total_quizzes_attempted,
			COALESCE(SUM(quizzes_passed), 0) as total_quizzes_passed,
			COALESCE(SUM(points_earned), 0) as total_points_earned,
			COALESCE(SUM(badges_earned), 0) as total_badges_earned,
			COALESCE(SUM(posts_created), 0) as total_posts_created,
			COALESCE(SUM(comments_created), 0) as total_comments_created,
			COALESCE(SUM(likes_given), 0) as total_likes_given,
			COALESCE(SUM(messages_sent), 0) as total_messages_sent
		`).
		Where("tenant_id = ? AND user_id = ? AND date >= ? AND date <= ?",
			tenantID, userID, startDate, endDate).
		Scan(&result).Error

	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"total_logins":            result.TotalLogins,
		"total_active_minutes":    result.TotalActiveMinutes,
		"total_courses_started":   result.TotalCoursesStarted,
		"total_courses_completed": result.TotalCoursesCompleted,
		"total_lessons_completed": result.TotalLessonsCompleted,
		"total_quizzes_attempted": result.TotalQuizzesAttempted,
		"total_quizzes_passed":    result.TotalQuizzesPassed,
		"total_points_earned":     result.TotalPointsEarned,
		"total_badges_earned":     result.TotalBadgesEarned,
		"total_posts_created":     result.TotalPostsCreated,
		"total_comments_created":  result.TotalCommentsCreated,
		"total_likes_given":       result.TotalLikesGiven,
		"total_messages_sent":     result.TotalMessagesSent,
	}, nil
}

// CourseAnalytics operations

// CreateCourseAnalytics creates a new course analytics record
func (r *AnalyticsRepository) CreateCourseAnalytics(analytics *models.CourseAnalytics) error {
	return r.db.Create(analytics).Error
}

// GetCourseAnalyticsByID retrieves course analytics by ID
func (r *AnalyticsRepository) GetCourseAnalyticsByID(id uuid.UUID) (*models.CourseAnalytics, error) {
	var analytics models.CourseAnalytics
	err := r.db.Where("id = ?", id).First(&analytics).Error
	if err != nil {
		return nil, err
	}
	return &analytics, nil
}

// GetCourseAnalyticsByDate retrieves course analytics for a specific date
func (r *AnalyticsRepository) GetCourseAnalyticsByDate(tenantID, courseID uuid.UUID, date time.Time) (*models.CourseAnalytics, error) {
	var analytics models.CourseAnalytics
	err := r.db.Where("tenant_id = ? AND course_id = ? AND date = ?", tenantID, courseID, date).
		First(&analytics).Error
	if err != nil {
		return nil, err
	}
	return &analytics, nil
}

// GetCourseAnalyticsRange retrieves course analytics for a date range
func (r *AnalyticsRepository) GetCourseAnalyticsRange(tenantID, courseID uuid.UUID, startDate, endDate time.Time) ([]models.CourseAnalytics, error) {
	var analytics []models.CourseAnalytics
	err := r.db.Where("tenant_id = ? AND course_id = ? AND date >= ? AND date <= ?",
		tenantID, courseID, startDate, endDate).
		Order("date ASC").
		Find(&analytics).Error
	return analytics, err
}

// GetTenantCourseAnalyticsRange retrieves analytics for all courses in a tenant
func (r *AnalyticsRepository) GetTenantCourseAnalyticsRange(tenantID uuid.UUID, startDate, endDate time.Time, limit, offset int) ([]models.CourseAnalytics, error) {
	var analytics []models.CourseAnalytics
	query := r.db.Where("tenant_id = ? AND date >= ? AND date <= ?", tenantID, startDate, endDate).
		Order("date DESC")

	if limit > 0 {
		query = query.Limit(limit).Offset(offset)
	}

	err := query.Find(&analytics).Error
	return analytics, err
}

// UpdateCourseAnalytics updates course analytics record
func (r *AnalyticsRepository) UpdateCourseAnalytics(analytics *models.CourseAnalytics) error {
	return r.db.Save(analytics).Error
}

// GetCourseAnalyticsSummary aggregates course analytics for a period
func (r *AnalyticsRepository) GetCourseAnalyticsSummary(tenantID, courseID uuid.UUID, startDate, endDate time.Time) (map[string]interface{}, error) {
	var result struct {
		AvgCompletionRate float64
		AvgProgress       float64
		AvgRating         float64
		TotalReviews      int
		AvgDropoutRate    float64
		AvgTimeSpent      int
		TotalRevenue      float64
		MaxEnrollments    int
		AvgActiveStudents int
	}

	err := r.db.Model(&models.CourseAnalytics{}).
		Select(`
			COALESCE(AVG(completion_rate), 0) as avg_completion_rate,
			COALESCE(AVG(average_progress), 0) as avg_progress,
			COALESCE(AVG(average_rating), 0) as avg_rating,
			COALESCE(SUM(total_reviews), 0) as total_reviews,
			COALESCE(AVG(dropout_rate), 0) as avg_dropout_rate,
			COALESCE(AVG(average_time_spent), 0) as avg_time_spent,
			COALESCE(SUM(total_revenue), 0) as total_revenue,
			COALESCE(MAX(total_enrollments), 0) as max_enrollments,
			COALESCE(AVG(active_students), 0) as avg_active_students
		`).
		Where("tenant_id = ? AND course_id = ? AND date >= ? AND date <= ?",
			tenantID, courseID, startDate, endDate).
		Scan(&result).Error

	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"avg_completion_rate": result.AvgCompletionRate,
		"avg_progress":        result.AvgProgress,
		"avg_rating":          result.AvgRating,
		"total_reviews":       result.TotalReviews,
		"avg_dropout_rate":    result.AvgDropoutRate,
		"avg_time_spent":      result.AvgTimeSpent,
		"total_revenue":       result.TotalRevenue,
		"max_enrollments":     result.MaxEnrollments,
		"avg_active_students": result.AvgActiveStudents,
	}, nil
}

// GetTopCourses retrieves top performing courses by various metrics
func (r *AnalyticsRepository) GetTopCourses(tenantID uuid.UUID, startDate, endDate time.Time, orderBy string, limit int) ([]models.CourseAnalytics, error) {
	var analytics []models.CourseAnalytics

	validOrderBy := map[string]string{
		"enrollments":     "total_enrollments DESC",
		"completion":      "completion_rate DESC",
		"rating":          "average_rating DESC",
		"revenue":         "total_revenue DESC",
		"active_students": "active_students DESC",
	}

	order, ok := validOrderBy[orderBy]
	if !ok {
		order = "total_enrollments DESC"
	}

	err := r.db.Where("tenant_id = ? AND date >= ? AND date <= ?", tenantID, startDate, endDate).
		Order(order).
		Limit(limit).
		Find(&analytics).Error

	return analytics, err
}

// EngagementAnalytics operations

// CreateEngagementAnalytics creates a new engagement analytics record
func (r *AnalyticsRepository) CreateEngagementAnalytics(analytics *models.EngagementAnalytics) error {
	return r.db.Create(analytics).Error
}

// GetEngagementAnalyticsByID retrieves engagement analytics by ID
func (r *AnalyticsRepository) GetEngagementAnalyticsByID(id uuid.UUID) (*models.EngagementAnalytics, error) {
	var analytics models.EngagementAnalytics
	err := r.db.Where("id = ?", id).First(&analytics).Error
	if err != nil {
		return nil, err
	}
	return &analytics, nil
}

// GetEngagementAnalyticsByDate retrieves engagement analytics for a specific date
func (r *AnalyticsRepository) GetEngagementAnalyticsByDate(tenantID uuid.UUID, date time.Time) (*models.EngagementAnalytics, error) {
	var analytics models.EngagementAnalytics
	err := r.db.Where("tenant_id = ? AND date = ?", tenantID, date).
		First(&analytics).Error
	if err != nil {
		return nil, err
	}
	return &analytics, nil
}

// GetEngagementAnalyticsRange retrieves engagement analytics for a date range
func (r *AnalyticsRepository) GetEngagementAnalyticsRange(tenantID uuid.UUID, startDate, endDate time.Time) ([]models.EngagementAnalytics, error) {
	var analytics []models.EngagementAnalytics
	err := r.db.Where("tenant_id = ? AND date >= ? AND date <= ?", tenantID, startDate, endDate).
		Order("date ASC").
		Find(&analytics).Error
	return analytics, err
}

// UpdateEngagementAnalytics updates engagement analytics record
func (r *AnalyticsRepository) UpdateEngagementAnalytics(analytics *models.EngagementAnalytics) error {
	return r.db.Save(analytics).Error
}

// GetEngagementAnalyticsSummary aggregates engagement analytics for a period
func (r *AnalyticsRepository) GetEngagementAnalyticsSummary(tenantID uuid.UUID, startDate, endDate time.Time) (map[string]interface{}, error) {
	var result struct {
		AvgDailyActiveUsers   int
		AvgWeeklyActiveUsers  int
		AvgMonthlyActiveUsers int
		TotalNewUsers         int
		AvgSessionDuration    float64
		TotalSessions         int
		TotalPageViews        int
		AvgBounceRate         float64
		AvgConversionRate     float64
	}

	err := r.db.Model(&models.EngagementAnalytics{}).
		Select(`
			COALESCE(AVG(daily_active_users), 0) as avg_daily_active_users,
			COALESCE(AVG(weekly_active_users), 0) as avg_weekly_active_users,
			COALESCE(AVG(monthly_active_users), 0) as avg_monthly_active_users,
			COALESCE(SUM(new_users), 0) as total_new_users,
			COALESCE(AVG(average_session_duration), 0) as avg_session_duration,
			COALESCE(SUM(total_sessions), 0) as total_sessions,
			COALESCE(SUM(page_views), 0) as total_page_views,
			COALESCE(AVG(bounce_rate), 0) as avg_bounce_rate,
			COALESCE(AVG(conversion_rate), 0) as avg_conversion_rate
		`).
		Where("tenant_id = ? AND date >= ? AND date <= ?", tenantID, startDate, endDate).
		Scan(&result).Error

	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"avg_daily_active_users":   result.AvgDailyActiveUsers,
		"avg_weekly_active_users":  result.AvgWeeklyActiveUsers,
		"avg_monthly_active_users": result.AvgMonthlyActiveUsers,
		"total_new_users":          result.TotalNewUsers,
		"avg_session_duration":     result.AvgSessionDuration,
		"total_sessions":           result.TotalSessions,
		"total_page_views":         result.TotalPageViews,
		"avg_bounce_rate":          result.AvgBounceRate,
		"avg_conversion_rate":      result.AvgConversionRate,
	}, nil
}

// DeleteOldAnalytics deletes analytics data older than the specified date
func (r *AnalyticsRepository) DeleteOldAnalytics(beforeDate time.Time) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("date < ?", beforeDate).Delete(&models.UserAnalytics{}).Error; err != nil {
			return err
		}
		if err := tx.Where("date < ?", beforeDate).Delete(&models.CourseAnalytics{}).Error; err != nil {
			return err
		}
		if err := tx.Where("date < ?", beforeDate).Delete(&models.EngagementAnalytics{}).Error; err != nil {
			return err
		}
		return nil
	})
}

// GetActiveTenants retrieves all active tenant IDs
func (r *AnalyticsRepository) GetActiveTenants() ([]uuid.UUID, error) {
	var tenantIDs []uuid.UUID
	err := r.db.Model(&models.UserAnalytics{}).
		Distinct("tenant_id").
		Where("deleted_at IS NULL").
		Pluck("tenant_id", &tenantIDs).Error
	return tenantIDs, err
}

// StoreDailySummary stores a daily summary for a tenant
func (r *AnalyticsRepository) StoreDailySummary(tenantID uuid.UUID, date time.Time, summaryType string, data map[string]interface{}) error {
	// Use a generic analytics_summaries table or cache (Redis recommended for production)
	// For now, we'll store in a JSON column in the database
	summary := map[string]interface{}{
		"tenant_id":    tenantID,
		"date":         date,
		"summary_type": summaryType,
		"data":         data,
		"created_at":   time.Now(),
	}

	// This would ideally use a dedicated summaries table or Redis
	// For MVP, we can log the summary or store in a JSONB column
	_ = summary // Placeholder - implement based on storage strategy
	return nil
}

// StoreWeeklySummary stores a weekly summary for a tenant
func (r *AnalyticsRepository) StoreWeeklySummary(tenantID uuid.UUID, startDate time.Time, data map[string]interface{}) error {
	summary := map[string]interface{}{
		"tenant_id":    tenantID,
		"start_date":   startDate,
		"summary_type": "weekly",
		"data":         data,
		"created_at":   time.Now(),
	}

	_ = summary // Placeholder - implement based on storage strategy
	return nil
}

// StoreMonthlySummary stores a monthly summary for a tenant
func (r *AnalyticsRepository) StoreMonthlySummary(tenantID uuid.UUID, startDate time.Time, data map[string]interface{}) error {
	summary := map[string]interface{}{
		"tenant_id":    tenantID,
		"start_date":   startDate,
		"summary_type": "monthly",
		"data":         data,
		"created_at":   time.Now(),
	}

	_ = summary // Placeholder - implement based on storage strategy
	return nil
}
