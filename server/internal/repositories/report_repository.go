package repositories

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/keshablive/quester/internal/models"
)

// ReportRepository handles report data operations
type ReportRepository struct {
	db *gorm.DB
}

// NewReportRepository creates a new report repository
func NewReportRepository(db *gorm.DB) *ReportRepository {
	return &ReportRepository{db: db}
}

// Report operations

// CreateReport creates a new report
func (r *ReportRepository) CreateReport(report *models.Report) error {
	return r.db.Create(report).Error
}

// GetReportByID retrieves a report by ID
func (r *ReportRepository) GetReportByID(id uuid.UUID) (*models.Report, error) {
	var report models.Report
	err := r.db.Where("id = ?", id).First(&report).Error
	if err != nil {
		return nil, err
	}
	return &report, nil
}

// GetReportsByUser retrieves all reports for a user
func (r *ReportRepository) GetReportsByUser(tenantID, userID uuid.UUID, limit, offset int) ([]models.Report, error) {
	var reports []models.Report
	query := r.db.Where("tenant_id = ? AND user_id = ?", tenantID, userID).
		Order("created_at DESC")

	if limit > 0 {
		query = query.Limit(limit).Offset(offset)
	}

	err := query.Find(&reports).Error
	return reports, err
}

// GetReportsByTenant retrieves all reports for a tenant
func (r *ReportRepository) GetReportsByTenant(tenantID uuid.UUID, limit, offset int) ([]models.Report, error) {
	var reports []models.Report
	query := r.db.Where("tenant_id = ?", tenantID).
		Order("created_at DESC")

	if limit > 0 {
		query = query.Limit(limit).Offset(offset)
	}

	err := query.Find(&reports).Error
	return reports, err
}

// GetReportsByType retrieves reports by type
func (r *ReportRepository) GetReportsByType(tenantID uuid.UUID, reportType string, limit, offset int) ([]models.Report, error) {
	var reports []models.Report
	query := r.db.Where("tenant_id = ? AND type = ?", tenantID, reportType).
		Order("created_at DESC")

	if limit > 0 {
		query = query.Limit(limit).Offset(offset)
	}

	err := query.Find(&reports).Error
	return reports, err
}

// GetReportsByStatus retrieves reports by status
func (r *ReportRepository) GetReportsByStatus(tenantID uuid.UUID, status string, limit, offset int) ([]models.Report, error) {
	var reports []models.Report
	query := r.db.Where("tenant_id = ? AND status = ?", tenantID, status).
		Order("created_at DESC")

	if limit > 0 {
		query = query.Limit(limit).Offset(offset)
	}

	err := query.Find(&reports).Error
	return reports, err
}

// UpdateReport updates a report
func (r *ReportRepository) UpdateReport(report *models.Report) error {
	return r.db.Save(report).Error
}

// UpdateReportStatus updates report status
func (r *ReportRepository) UpdateReportStatus(id uuid.UUID, status string, errorMessage string) error {
	updates := map[string]interface{}{
		"status":     status,
		"updated_at": time.Now(),
	}
	if errorMessage != "" {
		updates["error_message"] = errorMessage
	}
	return r.db.Model(&models.Report{}).Where("id = ?", id).Updates(updates).Error
}

// DeleteReport soft deletes a report
func (r *ReportRepository) DeleteReport(id uuid.UUID) error {
	return r.db.Where("id = ?", id).Delete(&models.Report{}).Error
}

// DeleteOldReports deletes reports older than the specified date
func (r *ReportRepository) DeleteOldReports(beforeDate time.Time) error {
	return r.db.Where("created_at < ?", beforeDate).Delete(&models.Report{}).Error
}

// ReportSchedule operations

// CreateReportSchedule creates a new report schedule
func (r *ReportRepository) CreateReportSchedule(schedule *models.ReportSchedule) error {
	return r.db.Create(schedule).Error
}

// GetReportScheduleByID retrieves a report schedule by ID
func (r *ReportRepository) GetReportScheduleByID(id uuid.UUID) (*models.ReportSchedule, error) {
	var schedule models.ReportSchedule
	err := r.db.Where("id = ?", id).First(&schedule).Error
	if err != nil {
		return nil, err
	}
	return &schedule, nil
}

// GetReportSchedulesByUser retrieves all report schedules for a user
func (r *ReportRepository) GetReportSchedulesByUser(tenantID, userID uuid.UUID) ([]models.ReportSchedule, error) {
	var schedules []models.ReportSchedule
	err := r.db.Where("tenant_id = ? AND user_id = ?", tenantID, userID).
		Order("created_at DESC").
		Find(&schedules).Error
	return schedules, err
}

// GetActiveReportSchedules retrieves all active report schedules
func (r *ReportRepository) GetActiveReportSchedules(tenantID uuid.UUID) ([]models.ReportSchedule, error) {
	var schedules []models.ReportSchedule
	err := r.db.Where("tenant_id = ? AND is_active = ?", tenantID, true).
		Find(&schedules).Error
	return schedules, err
}

// GetDueReportSchedules retrieves schedules that are due to run
func (r *ReportRepository) GetDueReportSchedules() ([]models.ReportSchedule, error) {
	var schedules []models.ReportSchedule
	now := time.Now()
	err := r.db.Where("is_active = ? AND (next_run_at IS NULL OR next_run_at <= ?)", true, now).
		Find(&schedules).Error
	return schedules, err
}

// UpdateReportSchedule updates a report schedule
func (r *ReportRepository) UpdateReportSchedule(schedule *models.ReportSchedule) error {
	return r.db.Save(schedule).Error
}

// UpdateReportScheduleRunTime updates the last and next run times
func (r *ReportRepository) UpdateReportScheduleRunTime(id uuid.UUID, lastRunAt, nextRunAt time.Time) error {
	return r.db.Model(&models.ReportSchedule{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"last_run_at": lastRunAt,
			"next_run_at": nextRunAt,
			"updated_at":  time.Now(),
		}).Error
}

// ToggleReportSchedule activates or deactivates a schedule
func (r *ReportRepository) ToggleReportSchedule(id uuid.UUID, isActive bool) error {
	return r.db.Model(&models.ReportSchedule{}).
		Where("id = ?", id).
		Update("is_active", isActive).Error
}

// DeleteReportSchedule soft deletes a report schedule
func (r *ReportRepository) DeleteReportSchedule(id uuid.UUID) error {
	return r.db.Where("id = ?", id).Delete(&models.ReportSchedule{}).Error
}

// ReportExecution operations

// CreateReportExecution creates a new report execution record
func (r *ReportRepository) CreateReportExecution(execution *models.ReportExecution) error {
	return r.db.Create(execution).Error
}

// GetReportExecutionByID retrieves a report execution by ID
func (r *ReportRepository) GetReportExecutionByID(id uuid.UUID) (*models.ReportExecution, error) {
	var execution models.ReportExecution
	err := r.db.Where("id = ?", id).First(&execution).Error
	if err != nil {
		return nil, err
	}
	return &execution, nil
}

// GetReportExecutionsBySchedule retrieves all executions for a schedule
func (r *ReportRepository) GetReportExecutionsBySchedule(scheduleID uuid.UUID, limit, offset int) ([]models.ReportExecution, error) {
	var executions []models.ReportExecution
	query := r.db.Where("schedule_id = ?", scheduleID).
		Order("started_at DESC")

	if limit > 0 {
		query = query.Limit(limit).Offset(offset)
	}

	err := query.Find(&executions).Error
	return executions, err
}

// GetReportExecutionsByStatus retrieves executions by status
func (r *ReportRepository) GetReportExecutionsByStatus(tenantID uuid.UUID, status string) ([]models.ReportExecution, error) {
	var executions []models.ReportExecution
	err := r.db.Where("tenant_id = ? AND status = ?", tenantID, status).
		Order("started_at DESC").
		Find(&executions).Error
	return executions, err
}

// GetRunningReportExecutions retrieves all currently running executions
func (r *ReportRepository) GetRunningReportExecutions(tenantID uuid.UUID) ([]models.ReportExecution, error) {
	return r.GetReportExecutionsByStatus(tenantID, "running")
}

// UpdateReportExecution updates a report execution
func (r *ReportRepository) UpdateReportExecution(execution *models.ReportExecution) error {
	return r.db.Save(execution).Error
}

// CompleteReportExecution marks an execution as completed
func (r *ReportRepository) CompleteReportExecution(id uuid.UUID, reportID uuid.UUID, status string, fileURL string, fileSize, recordCount int, errorMessage string) error {
	now := time.Now()

	updates := map[string]interface{}{
		"status":       status,
		"completed_at": now,
		"file_url":     fileURL,
		"file_size":    fileSize,
		"record_count": recordCount,
		"updated_at":   now,
	}

	if reportID != uuid.Nil {
		updates["report_id"] = reportID
	}

	if errorMessage != "" {
		updates["error_message"] = errorMessage
	}

	// Calculate duration
	var execution models.ReportExecution
	if err := r.db.Where("id = ?", id).First(&execution).Error; err == nil {
		duration := int(now.Sub(execution.StartedAt).Seconds())
		updates["duration"] = duration
	}

	return r.db.Model(&models.ReportExecution{}).Where("id = ?", id).Updates(updates).Error
}

// GetReportExecutionStats retrieves execution statistics for a schedule
func (r *ReportRepository) GetReportExecutionStats(scheduleID uuid.UUID, startDate, endDate time.Time) (map[string]interface{}, error) {
	var stats struct {
		TotalExecutions int
		SuccessfulRuns  int
		FailedRuns      int
		AvgDuration     float64
		TotalRecords    int
		AvgRecords      float64
	}

	err := r.db.Model(&models.ReportExecution{}).
		Select(`
			COUNT(*) as total_executions,
			SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_runs,
			SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_runs,
			COALESCE(AVG(duration), 0) as avg_duration,
			COALESCE(SUM(record_count), 0) as total_records,
			COALESCE(AVG(record_count), 0) as avg_records
		`).
		Where("schedule_id = ? AND started_at >= ? AND started_at <= ?", scheduleID, startDate, endDate).
		Scan(&stats).Error

	if err != nil {
		return nil, err
	}

	successRate := 0.0
	if stats.TotalExecutions > 0 {
		successRate = (float64(stats.SuccessfulRuns) / float64(stats.TotalExecutions)) * 100
	}

	return map[string]interface{}{
		"total_executions": stats.TotalExecutions,
		"successful_runs":  stats.SuccessfulRuns,
		"failed_runs":      stats.FailedRuns,
		"success_rate":     successRate,
		"avg_duration":     stats.AvgDuration,
		"total_records":    stats.TotalRecords,
		"avg_records":      stats.AvgRecords,
	}, nil
}

// DeleteOldReportExecutions deletes execution records older than the specified date
func (r *ReportRepository) DeleteOldReportExecutions(beforeDate time.Time) error {
	return r.db.Where("started_at < ?", beforeDate).Delete(&models.ReportExecution{}).Error
}

// SearchReports searches reports by name or description
func (r *ReportRepository) SearchReports(tenantID uuid.UUID, query string, limit, offset int) ([]models.Report, error) {
	var reports []models.Report
	searchQuery := "%" + query + "%"

	err := r.db.Where("tenant_id = ? AND (name ILIKE ? OR description ILIKE ?)",
		tenantID, searchQuery, searchQuery).
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&reports).Error

	return reports, err
}

// CountReports counts total reports for a tenant
func (r *ReportRepository) CountReports(tenantID uuid.UUID) (int64, error) {
	var count int64
	err := r.db.Model(&models.Report{}).Where("tenant_id = ?", tenantID).Count(&count).Error
	return count, err
}

// CountReportsByStatus counts reports by status
func (r *ReportRepository) CountReportsByStatus(tenantID uuid.UUID, status string) (int64, error) {
	var count int64
	err := r.db.Model(&models.Report{}).
		Where("tenant_id = ? AND status = ?", tenantID, status).
		Count(&count).Error
	return count, err
}
