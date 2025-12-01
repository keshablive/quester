package service

import (
	"encoding/json"
	"errors"
	"time"

	"gorm.io/datatypes"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/keshablive/quester/internal/models"
	"github.com/keshablive/quester/internal/framework/repository"
)

// DashboardService handles dashboard business logic
type DashboardService struct {
	repo          *repository.DashboardRepository
	analyticsRepo *repository.AnalyticsRepository
}

// NewDashboardService creates a new dashboard service
func NewDashboardService(repo *repository.DashboardRepository, analyticsRepo *repository.AnalyticsRepository) *DashboardService {
	return &DashboardService{
		repo:          repo,
		analyticsRepo: analyticsRepo,
	}
}

// Dashboard operations

// CreateDashboard creates a new dashboard
func (s *DashboardService) CreateDashboard(dashboard *models.Dashboard) error {
	// Validate refresh interval
	if dashboard.RefreshInterval < 10 || dashboard.RefreshInterval > 3600 {
		return errors.New("refresh interval must be between 10 and 3600 seconds")
	}

	return s.repo.CreateDashboard(dashboard)
}

// GetDashboard retrieves a dashboard by ID
func (s *DashboardService) GetDashboard(id uuid.UUID) (*models.Dashboard, error) {
	return s.repo.GetDashboardByID(id)
}

// GetUserDashboards retrieves all dashboards for a user
func (s *DashboardService) GetUserDashboards(tenantID, userID uuid.UUID) ([]models.Dashboard, error) {
	return s.repo.GetDashboardsByUser(tenantID, userID)
}

// GetDefaultDashboard retrieves the default dashboard for a user
func (s *DashboardService) GetDefaultDashboard(tenantID, userID uuid.UUID) (*models.Dashboard, error) {
	dashboard, err := s.repo.GetDefaultDashboard(tenantID, userID)
	if err != nil && errors.Is(err, gorm.ErrRecordNotFound) {
		// If no default dashboard exists, create one
		return s.createDefaultDashboard(tenantID, userID)
	}
	return dashboard, err
}

// UpdateDashboard updates a dashboard
func (s *DashboardService) UpdateDashboard(dashboard *models.Dashboard) error {
	// Validate refresh interval
	if dashboard.RefreshInterval < 10 || dashboard.RefreshInterval > 3600 {
		return errors.New("refresh interval must be between 10 and 3600 seconds")
	}

	return s.repo.UpdateDashboard(dashboard)
}

// SetDefaultDashboard sets a dashboard as default
func (s *DashboardService) SetDefaultDashboard(tenantID, userID, dashboardID uuid.UUID) error {
	// Verify dashboard belongs to user
	dashboard, err := s.repo.GetDashboardByID(dashboardID)
	if err != nil {
		return err
	}

	if dashboard.UserID != userID || dashboard.TenantID != tenantID {
		return errors.New("dashboard does not belong to user")
	}

	return s.repo.SetDefaultDashboard(tenantID, userID, dashboardID)
}

// DeleteDashboard deletes a dashboard
func (s *DashboardService) DeleteDashboard(id uuid.UUID, userID uuid.UUID) error {
	// Verify ownership
	dashboard, err := s.repo.GetDashboardByID(id)
	if err != nil {
		return err
	}

	if dashboard.UserID != userID {
		return errors.New("unauthorized to delete this dashboard")
	}

	return s.repo.DeleteDashboard(id)
}

// CloneDashboard creates a copy of a dashboard
func (s *DashboardService) CloneDashboard(dashboardID, userID uuid.UUID, newName string) (*models.Dashboard, error) {
	return s.repo.CloneDashboard(dashboardID, userID, newName)
}

// SearchDashboards searches dashboards by query
func (s *DashboardService) SearchDashboards(tenantID, userID uuid.UUID, query string) ([]models.Dashboard, error) {
	return s.repo.SearchDashboards(tenantID, userID, query)
}

// DashboardMetric operations

// CreateMetric creates a new dashboard metric
func (s *DashboardService) CreateMetric(metric *models.DashboardMetric) error {
	return s.repo.CreateDashboardMetric(metric)
}

// GetMetric retrieves a metric by ID
func (s *DashboardService) GetMetric(id uuid.UUID) (*models.DashboardMetric, error) {
	return s.repo.GetDashboardMetricByID(id)
}

// GetMetricByName retrieves a metric by name
func (s *DashboardService) GetMetricByName(tenantID uuid.UUID, name string) (*models.DashboardMetric, error) {
	return s.repo.GetDashboardMetricByName(tenantID, name)
}

// GetMetricsByCategory retrieves metrics by category
func (s *DashboardService) GetMetricsByCategory(tenantID uuid.UUID, category string) ([]models.DashboardMetric, error) {
	return s.repo.GetDashboardMetricsByCategory(tenantID, category)
}

// GetAllMetrics retrieves all metrics for a tenant
func (s *DashboardService) GetAllMetrics(tenantID uuid.UUID) ([]models.DashboardMetric, error) {
	return s.repo.GetAllDashboardMetrics(tenantID)
}

// UpdateMetric updates a metric
func (s *DashboardService) UpdateMetric(metric *models.DashboardMetric) error {
	return s.repo.UpdateDashboardMetric(metric)
}

// UpsertMetric creates or updates a metric
func (s *DashboardService) UpsertMetric(metric *models.DashboardMetric) error {
	return s.repo.UpsertDashboardMetric(metric)
}

// RefreshAllMetrics recalculates all metrics for a tenant
func (s *DashboardService) RefreshAllMetrics(tenantID uuid.UUID) error {
	metrics := []models.DashboardMetric{
		s.calculateTotalUsersMetric(tenantID),
		s.calculateActiveUsersMetric(tenantID),
		s.calculateTotalCoursesMetric(tenantID),
		s.calculateAvgCompletionRateMetric(tenantID),
		s.calculateTotalRevenueMetric(tenantID),
	}

	for _, metric := range metrics {
		if err := s.repo.UpsertDashboardMetric(&metric); err != nil {
			return err
		}
	}

	return nil
}

// RefreshMetric recalculates a specific metric
func (s *DashboardService) RefreshMetric(tenantID uuid.UUID, metricName string) error {
	var metric models.DashboardMetric

	switch metricName {
	case "total_users":
		metric = s.calculateTotalUsersMetric(tenantID)
	case "active_users":
		metric = s.calculateActiveUsersMetric(tenantID)
	case "total_courses":
		metric = s.calculateTotalCoursesMetric(tenantID)
	case "avg_completion_rate":
		metric = s.calculateAvgCompletionRateMetric(tenantID)
	case "total_revenue":
		metric = s.calculateTotalRevenueMetric(tenantID)
	default:
		return errors.New("unknown metric name")
	}

	return s.repo.UpsertDashboardMetric(&metric)
}

// GetMetricsSummary retrieves summary statistics
func (s *DashboardService) GetMetricsSummary(tenantID uuid.UUID) (datatypes.JSON, error) {
	summary, err := s.repo.GetMetricsSummary(tenantID)
	if err != nil {
		return nil, err
	}
	jsonData, err := json.Marshal(summary)
	if err != nil {
		return nil, err
	}
	return datatypes.JSON(jsonData), nil
}

// Private helper methods

func (s *DashboardService) createDefaultDashboard(tenantID, userID uuid.UUID) (*models.Dashboard, error) {
	dashboard := &models.Dashboard{
		TenantID:        tenantID,
		UserID:          userID,
		Name:            "My Dashboard",
		Description:     "Default dashboard with key metrics",
		IsDefault:       true,
		RefreshInterval: 60,
		Layout: datatypes.JSON(`{
			"columns": 3,
			"rows": 4
		}`),
		Widgets: datatypes.JSON(`[
			{
				"id": "widget-1",
				"type": "metric",
				"title": "Total Users",
				"position": {"x": 0, "y": 0},
				"size": {"w": 1, "h": 1},
				"config": {
					"metric_name": "total_users"
				}
			},
			{
				"id": "widget-2",
				"type": "metric",
				"title": "Active Users",
				"position": {"x": 1, "y": 0},
				"size": {"w": 1, "h": 1},
				"config": {
					"metric_name": "active_users"
				}
			},
			{
				"id": "widget-3",
				"type": "chart",
				"title": "User Activity",
				"position": {"x": 0, "y": 1},
				"size": {"w": 2, "h": 2},
				"config": {
					"chart_type": "line",
					"metric": "user_analytics",
					"period": "30days"
				}
			}
		]`),
	}

	if err := s.repo.CreateDashboard(dashboard); err != nil {
		return nil, err
	}

	return dashboard, nil
}

func (s *DashboardService) calculateTotalUsersMetric(tenantID uuid.UUID) models.DashboardMetric {
	// This would query the actual user count
	// For now, return a placeholder metric
	return models.DashboardMetric{
		TenantID:    tenantID,
		Name:        "total_users",
		Value:       0, // Would be calculated from database
		Label:       "Total Users",
		Description: "Total number of registered users",
		Category:    "users",
		Format:      "number",
		Icon:        "users",
		Trend:       "up",
		Change:      0,
	}
}

func (s *DashboardService) calculateActiveUsersMetric(tenantID uuid.UUID) models.DashboardMetric {
	// Calculate active users from analytics
	now := time.Now()
	startDate := now.AddDate(0, 0, -30)
	endDate := now

	summary, err := s.analyticsRepo.GetEngagementAnalyticsSummary(tenantID, startDate, endDate)
	activeUsers := 0
	if err == nil {
		if val, ok := summary["avg_daily_active_users"].(int); ok {
			activeUsers = val
		}
	}

	return models.DashboardMetric{
		TenantID:    tenantID,
		Name:        "active_users",
		Value:       float64(activeUsers),
		Label:       "Active Users (30d)",
		Description: "Average daily active users in last 30 days",
		Category:    "engagement",
		Format:      "number",
		Icon:        "activity",
		Trend:       "up",
		Change:      0,
	}
}

func (s *DashboardService) calculateTotalCoursesMetric(tenantID uuid.UUID) models.DashboardMetric {
	// Would query actual course count
	return models.DashboardMetric{
		TenantID:    tenantID,
		Name:        "total_courses",
		Value:       0,
		Label:       "Total Courses",
		Description: "Total number of courses",
		Category:    "courses",
		Format:      "number",
		Icon:        "book",
		Trend:       "stable",
		Change:      0,
	}
}

func (s *DashboardService) calculateAvgCompletionRateMetric(tenantID uuid.UUID) models.DashboardMetric {
	// Calculate from course analytics
	now := time.Now()
	startDate := now.AddDate(0, 0, -30)
	endDate := now

	// Get course analytics for tenant
	analytics, err := s.analyticsRepo.GetTenantCourseAnalyticsRange(tenantID, startDate, endDate, 0, 0)

	avgCompletionRate := 0.0
	if err == nil && len(analytics) > 0 {
		var totalRate float64
		for _, a := range analytics {
			totalRate += a.CompletionRate
		}
		avgCompletionRate = totalRate / float64(len(analytics))
	}

	return models.DashboardMetric{
		TenantID:    tenantID,
		Name:        "avg_completion_rate",
		Value:       avgCompletionRate,
		Label:       "Avg Completion Rate",
		Description: "Average course completion rate",
		Category:    "courses",
		Format:      "percentage",
		Unit:        "%",
		Icon:        "check-circle",
		Trend:       "up",
		Change:      0,
		Target:      75.0,
	}
}

func (s *DashboardService) calculateTotalRevenueMetric(tenantID uuid.UUID) models.DashboardMetric {
	// Calculate from course analytics
	now := time.Now()
	startDate := now.AddDate(0, 0, -30)
	endDate := now

	analytics, err := s.analyticsRepo.GetTenantCourseAnalyticsRange(tenantID, startDate, endDate, 0, 0)

	totalRevenue := 0.0
	if err == nil {
		for _, a := range analytics {
			totalRevenue += a.TotalRevenue
		}
	}

	return models.DashboardMetric{
		TenantID:    tenantID,
		Name:        "total_revenue",
		Value:       totalRevenue,
		Label:       "Total Revenue (30d)",
		Description: "Total revenue in last 30 days",
		Category:    "revenue",
		Format:      "currency",
		Unit:        "$",
		Icon:        "dollar-sign",
		Trend:       "up",
		Change:      0,
	}
}
