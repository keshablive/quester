package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// UserAnalytics represents daily user activity metrics
type UserAnalytics struct {
	ID               uuid.UUID      `gorm:"type:uuid;primary_key" json:"id"`
	TenantID         uuid.UUID      `gorm:"type:uuid;not null;index:idx_user_analytics_tenant" json:"tenant_id"`
	UserID           uuid.UUID      `gorm:"type:uuid;not null;index:idx_user_analytics_user" json:"user_id"`
	Date             time.Time      `gorm:"type:date;not null;index:idx_user_analytics_date" json:"date"`
	LoginCount       int            `gorm:"default:0" json:"login_count"`
	ActiveMinutes    int            `gorm:"default:0" json:"active_minutes"`
	CoursesStarted   int            `gorm:"default:0" json:"courses_started"`
	CoursesCompleted int            `gorm:"default:0" json:"courses_completed"`
	LessonsCompleted int            `gorm:"default:0" json:"lessons_completed"`
	QuizzesAttempted int            `gorm:"default:0" json:"quizzes_attempted"`
	QuizzesPassed    int            `gorm:"default:0" json:"quizzes_passed"`
	PointsEarned     int            `gorm:"default:0" json:"points_earned"`
	BadgesEarned     int            `gorm:"default:0" json:"badges_earned"`
	PostsCreated     int            `gorm:"default:0" json:"posts_created"`
	CommentsCreated  int            `gorm:"default:0" json:"comments_created"`
	LikesGiven       int            `gorm:"default:0" json:"likes_given"`
	MessagesSet      int            `gorm:"default:0" json:"messages_sent"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
}

// BeforeCreate hook to set UUID
func (ua *UserAnalytics) BeforeCreate(tx *gorm.DB) error {
	if ua.ID == uuid.Nil {
		ua.ID = uuid.New()
	}
	return nil
}

// TableName specifies the table name
func (UserAnalytics) TableName() string {
	return "user_analytics"
}

// CourseAnalytics represents course performance metrics
type CourseAnalytics struct {
	ID               uuid.UUID      `gorm:"type:uuid;primary_key" json:"id"`
	TenantID         uuid.UUID      `gorm:"type:uuid;not null;index:idx_course_analytics_tenant" json:"tenant_id"`
	CourseID         uuid.UUID      `gorm:"type:uuid;not null;index:idx_course_analytics_course" json:"course_id"`
	Date             time.Time      `gorm:"type:date;not null;index:idx_course_analytics_date" json:"date"`
	TotalEnrollments int            `gorm:"default:0" json:"total_enrollments"`
	ActiveStudents   int            `gorm:"default:0" json:"active_students"`
	CompletionRate   float64        `gorm:"type:decimal(5,2);default:0" json:"completion_rate"`
	AverageProgress  float64        `gorm:"type:decimal(5,2);default:0" json:"average_progress"`
	AverageRating    float64        `gorm:"type:decimal(3,2);default:0" json:"average_rating"`
	TotalReviews     int            `gorm:"default:0" json:"total_reviews"`
	DropoutRate      float64        `gorm:"type:decimal(5,2);default:0" json:"dropout_rate"`
	AverageTimeSpent int            `gorm:"default:0" json:"average_time_spent"` // in minutes
	TotalRevenue     float64        `gorm:"type:decimal(10,2);default:0" json:"total_revenue"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
}

// BeforeCreate hook to set UUID
func (ca *CourseAnalytics) BeforeCreate(tx *gorm.DB) error {
	if ca.ID == uuid.Nil {
		ca.ID = uuid.New()
	}
	return nil
}

// TableName specifies the table name
func (CourseAnalytics) TableName() string {
	return "course_analytics"
}

// EngagementAnalytics represents platform-wide engagement metrics
type EngagementAnalytics struct {
	ID                     uuid.UUID      `gorm:"type:uuid;primary_key" json:"id"`
	TenantID               uuid.UUID      `gorm:"type:uuid;not null;index:idx_engagement_analytics_tenant" json:"tenant_id"`
	Date                   time.Time      `gorm:"type:date;not null;index:idx_engagement_analytics_date" json:"date"`
	TotalActiveUsers       int            `gorm:"default:0" json:"total_active_users"`
	NewUsers               int            `gorm:"default:0" json:"new_users"`
	ReturningUsers         int            `gorm:"default:0" json:"returning_users"`
	DailyActiveUsers       int            `gorm:"default:0" json:"daily_active_users"`
	WeeklyActiveUsers      int            `gorm:"default:0" json:"weekly_active_users"`
	MonthlyActiveUsers     int            `gorm:"default:0" json:"monthly_active_users"`
	AverageSessionDuration float64        `gorm:"type:decimal(10,2);default:0" json:"average_session_duration"` // in minutes
	TotalSessions          int            `gorm:"default:0" json:"total_sessions"`
	PageViews              int            `gorm:"default:0" json:"page_views"`
	BounceRate             float64        `gorm:"type:decimal(5,2);default:0" json:"bounce_rate"`
	ConversionRate         float64        `gorm:"type:decimal(5,2);default:0" json:"conversion_rate"`
	CreatedAt              time.Time      `json:"created_at"`
	UpdatedAt              time.Time      `json:"updated_at"`
	DeletedAt              gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
}

// BeforeCreate hook to set UUID
func (ea *EngagementAnalytics) BeforeCreate(tx *gorm.DB) error {
	if ea.ID == uuid.Nil {
		ea.ID = uuid.New()
	}
	return nil
}

// TableName specifies the table name
func (EngagementAnalytics) TableName() string {
	return "engagement_analytics"
}

// DashboardMetric represents a single metric displayed on dashboards
type DashboardMetric struct {
	ID          uuid.UUID      `gorm:"type:uuid;primary_key" json:"id"`
	TenantID    uuid.UUID      `gorm:"type:uuid;not null;index:idx_dashboard_metric_tenant" json:"tenant_id"`
	Name        string         `gorm:"type:varchar(100);not null;index:idx_dashboard_metric_name" json:"name"`
	Value       float64        `gorm:"type:decimal(20,2);not null" json:"value"`
	Label       string         `gorm:"type:varchar(255);not null" json:"label"`
	Description string         `gorm:"type:text" json:"description,omitempty"`
	Category    string         `gorm:"type:varchar(50);index:idx_dashboard_metric_category" json:"category"`
	Format      string         `gorm:"type:varchar(50)" json:"format"` // number, percentage, currency, duration
	Unit        string         `gorm:"type:varchar(20)" json:"unit,omitempty"`
	Icon        string         `gorm:"type:varchar(50)" json:"icon,omitempty"`
	Trend       string         `gorm:"type:varchar(20)" json:"trend,omitempty"`    // up, down, stable
	Change      float64        `gorm:"type:decimal(10,2)" json:"change,omitempty"` // percentage change
	Target      float64        `gorm:"type:decimal(20,2)" json:"target,omitempty"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
}

// BeforeCreate hook to set UUID
func (dm *DashboardMetric) BeforeCreate(tx *gorm.DB) error {
	if dm.ID == uuid.Nil {
		dm.ID = uuid.New()
	}
	return nil
}

// TableName specifies the table name
func (DashboardMetric) TableName() string {
	return "dashboard_metrics"
}
