package repositories

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/yourusername/quester/internal/models"
)

// DashboardRepository handles dashboard data operations
type DashboardRepository struct {
	db *gorm.DB
}

// NewDashboardRepository creates a new dashboard repository
func NewDashboardRepository(db *gorm.DB) *DashboardRepository {
	return &DashboardRepository{db: db}
}

// Dashboard operations

// CreateDashboard creates a new dashboard
func (r *DashboardRepository) CreateDashboard(dashboard *models.Dashboard) error {
	return r.db.Create(dashboard).Error
}

// GetDashboardByID retrieves a dashboard by ID
func (r *DashboardRepository) GetDashboardByID(id uuid.UUID) (*models.Dashboard, error) {
	var dashboard models.Dashboard
	err := r.db.Where("id = ?", id).First(&dashboard).Error
	if err != nil {
		return nil, err
	}
	return &dashboard, nil
}

// GetDashboardsByUser retrieves all dashboards for a user
func (r *DashboardRepository) GetDashboardsByUser(tenantID, userID uuid.UUID) ([]models.Dashboard, error) {
	var dashboards []models.Dashboard
	err := r.db.Where("tenant_id = ? AND user_id = ?", tenantID, userID).
		Order("created_at DESC").
		Find(&dashboards).Error
	return dashboards, err
}

// GetDefaultDashboard retrieves the default dashboard for a user
func (r *DashboardRepository) GetDefaultDashboard(tenantID, userID uuid.UUID) (*models.Dashboard, error) {
	var dashboard models.Dashboard
	err := r.db.Where("tenant_id = ? AND user_id = ? AND is_default = ?", tenantID, userID, true).
		First(&dashboard).Error
	if err != nil {
		return nil, err
	}
	return &dashboard, nil
}

// GetSharedDashboards retrieves dashboards shared with a user
func (r *DashboardRepository) GetSharedDashboards(tenantID, userID uuid.UUID) ([]models.Dashboard, error) {
	var dashboards []models.Dashboard
	// Query dashboards where the user is in the shared_with JSONB array
	err := r.db.Where("tenant_id = ? AND is_shared = ? AND shared_with @> ?",
		tenantID, true, `[{"user_id":"`+userID.String()+`"}]`).
		Order("created_at DESC").
		Find(&dashboards).Error
	return dashboards, err
}

// UpdateDashboard updates a dashboard
func (r *DashboardRepository) UpdateDashboard(dashboard *models.Dashboard) error {
	return r.db.Save(dashboard).Error
}

// SetDefaultDashboard sets a dashboard as default and unsets others
func (r *DashboardRepository) SetDefaultDashboard(tenantID, userID, dashboardID uuid.UUID) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// Unset all default dashboards for the user
		if err := tx.Model(&models.Dashboard{}).
			Where("tenant_id = ? AND user_id = ?", tenantID, userID).
			Update("is_default", false).Error; err != nil {
			return err
		}

		// Set the specified dashboard as default
		if err := tx.Model(&models.Dashboard{}).
			Where("id = ?", dashboardID).
			Update("is_default", true).Error; err != nil {
			return err
		}

		return nil
	})
}

// DeleteDashboard soft deletes a dashboard
func (r *DashboardRepository) DeleteDashboard(id uuid.UUID) error {
	return r.db.Where("id = ?", id).Delete(&models.Dashboard{}).Error
}

// DashboardMetric operations

// CreateDashboardMetric creates a new dashboard metric
func (r *DashboardRepository) CreateDashboardMetric(metric *models.DashboardMetric) error {
	return r.db.Create(metric).Error
}

// GetDashboardMetricByID retrieves a dashboard metric by ID
func (r *DashboardRepository) GetDashboardMetricByID(id uuid.UUID) (*models.DashboardMetric, error) {
	var metric models.DashboardMetric
	err := r.db.Where("id = ?", id).First(&metric).Error
	if err != nil {
		return nil, err
	}
	return &metric, nil
}

// GetDashboardMetricByName retrieves a metric by name
func (r *DashboardRepository) GetDashboardMetricByName(tenantID uuid.UUID, name string) (*models.DashboardMetric, error) {
	var metric models.DashboardMetric
	err := r.db.Where("tenant_id = ? AND name = ?", tenantID, name).
		First(&metric).Error
	if err != nil {
		return nil, err
	}
	return &metric, nil
}

// GetDashboardMetricsByCategory retrieves metrics by category
func (r *DashboardRepository) GetDashboardMetricsByCategory(tenantID uuid.UUID, category string) ([]models.DashboardMetric, error) {
	var metrics []models.DashboardMetric
	err := r.db.Where("tenant_id = ? AND category = ?", tenantID, category).
		Order("name ASC").
		Find(&metrics).Error
	return metrics, err
}

// GetAllDashboardMetrics retrieves all metrics for a tenant
func (r *DashboardRepository) GetAllDashboardMetrics(tenantID uuid.UUID) ([]models.DashboardMetric, error) {
	var metrics []models.DashboardMetric
	err := r.db.Where("tenant_id = ?", tenantID).
		Order("category ASC, name ASC").
		Find(&metrics).Error
	return metrics, err
}

// UpdateDashboardMetric updates a dashboard metric
func (r *DashboardRepository) UpdateDashboardMetric(metric *models.DashboardMetric) error {
	return r.db.Save(metric).Error
}

// UpsertDashboardMetric creates or updates a metric
func (r *DashboardRepository) UpsertDashboardMetric(metric *models.DashboardMetric) error {
	var existing models.DashboardMetric
	err := r.db.Where("tenant_id = ? AND name = ?", metric.TenantID, metric.Name).
		First(&existing).Error

	if err == gorm.ErrRecordNotFound {
		// Create new metric
		return r.db.Create(metric).Error
	} else if err != nil {
		return err
	}

	// Update existing metric
	metric.ID = existing.ID
	metric.CreatedAt = existing.CreatedAt
	return r.db.Save(metric).Error
}

// UpdateMetricValue updates only the value and related fields of a metric
func (r *DashboardRepository) UpdateMetricValue(tenantID uuid.UUID, name string, value float64, trend string, change float64) error {
	return r.db.Model(&models.DashboardMetric{}).
		Where("tenant_id = ? AND name = ?", tenantID, name).
		Updates(map[string]interface{}{
			"value":      value,
			"trend":      trend,
			"change":     change,
			"updated_at": time.Now(),
		}).Error
}

// DeleteDashboardMetric soft deletes a dashboard metric
func (r *DashboardRepository) DeleteDashboardMetric(id uuid.UUID) error {
	return r.db.Where("id = ?", id).Delete(&models.DashboardMetric{}).Error
}

// DeleteDashboardMetricsByCategory deletes all metrics in a category
func (r *DashboardRepository) DeleteDashboardMetricsByCategory(tenantID uuid.UUID, category string) error {
	return r.db.Where("tenant_id = ? AND category = ?", tenantID, category).
		Delete(&models.DashboardMetric{}).Error
}

// GetMetricHistory retrieves historical values for a metric (if tracked separately)
func (r *DashboardRepository) GetMetricHistory(tenantID uuid.UUID, name string, startDate, endDate time.Time) ([]models.DashboardMetric, error) {
	var metrics []models.DashboardMetric
	err := r.db.Where("tenant_id = ? AND name = ? AND updated_at >= ? AND updated_at <= ?",
		tenantID, name, startDate, endDate).
		Order("updated_at ASC").
		Find(&metrics).Error
	return metrics, err
}

// GetMetricsSummary retrieves summary statistics for metrics by category
func (r *DashboardRepository) GetMetricsSummary(tenantID uuid.UUID) (map[string]interface{}, error) {
	var result struct {
		TotalMetrics       int64
		UserMetrics        int64
		CourseMetrics      int64
		EngagementMetrics  int64
		PerformanceMetrics int64
		RevenueMetrics     int64
	}

	if err := r.db.Model(&models.DashboardMetric{}).
		Where("tenant_id = ?", tenantID).
		Count(&result.TotalMetrics).Error; err != nil {
		return nil, err
	}

	categories := map[string]*int64{
		"users":       &result.UserMetrics,
		"courses":     &result.CourseMetrics,
		"engagement":  &result.EngagementMetrics,
		"performance": &result.PerformanceMetrics,
		"revenue":     &result.RevenueMetrics,
	}

	for category, count := range categories {
		if err := r.db.Model(&models.DashboardMetric{}).
			Where("tenant_id = ? AND category = ?", tenantID, category).
			Count(count).Error; err != nil {
			return nil, err
		}
	}

	return map[string]interface{}{
		"total_metrics":       result.TotalMetrics,
		"user_metrics":        result.UserMetrics,
		"course_metrics":      result.CourseMetrics,
		"engagement_metrics":  result.EngagementMetrics,
		"performance_metrics": result.PerformanceMetrics,
		"revenue_metrics":     result.RevenueMetrics,
	}, nil
}

// SearchDashboards searches dashboards by name or description
func (r *DashboardRepository) SearchDashboards(tenantID, userID uuid.UUID, query string) ([]models.Dashboard, error) {
	var dashboards []models.Dashboard
	searchQuery := "%" + query + "%"

	err := r.db.Where("tenant_id = ? AND user_id = ? AND (name ILIKE ? OR description ILIKE ?)",
		tenantID, userID, searchQuery, searchQuery).
		Order("created_at DESC").
		Find(&dashboards).Error

	return dashboards, err
}

// CloneDashboard creates a copy of an existing dashboard
func (r *DashboardRepository) CloneDashboard(dashboardID uuid.UUID, newUserID uuid.UUID, newName string) (*models.Dashboard, error) {
	// Get the original dashboard
	original, err := r.GetDashboardByID(dashboardID)
	if err != nil {
		return nil, err
	}

	// Create a new dashboard with copied settings
	clone := &models.Dashboard{
		TenantID:        original.TenantID,
		UserID:          newUserID,
		Name:            newName,
		Description:     original.Description + " (Copy)",
		IsDefault:       false,
		IsShared:        false,
		RefreshInterval: original.RefreshInterval,
		Layout:          original.Layout,
		Widgets:         original.Widgets,
		Filters:         original.Filters,
		Preferences:     original.Preferences,
	}

	err = r.CreateDashboard(clone)
	if err != nil {
		return nil, err
	}

	return clone, nil
}

// CountDashboards counts total dashboards for a user
func (r *DashboardRepository) CountDashboards(tenantID, userID uuid.UUID) (int64, error) {
	var count int64
	err := r.db.Model(&models.Dashboard{}).
		Where("tenant_id = ? AND user_id = ?", tenantID, userID).
		Count(&count).Error
	return count, err
}

// GetRecentlyUpdatedDashboards retrieves dashboards recently updated
func (r *DashboardRepository) GetRecentlyUpdatedDashboards(tenantID, userID uuid.UUID, limit int) ([]models.Dashboard, error) {
	var dashboards []models.Dashboard
	err := r.db.Where("tenant_id = ? AND user_id = ?", tenantID, userID).
		Order("updated_at DESC").
		Limit(limit).
		Find(&dashboards).Error
	return dashboards, err
}

// BulkUpdateMetrics updates multiple metrics in a single transaction
func (r *DashboardRepository) BulkUpdateMetrics(metrics []models.DashboardMetric) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		for _, metric := range metrics {
			if err := r.UpsertDashboardMetric(&metric); err != nil {
				return err
			}
		}
		return nil
	})
}
