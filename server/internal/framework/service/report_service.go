package service

import (
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/keshablive/quester/internal/models"
	"github.com/keshablive/quester/internal/framework/repository"
)

// ReportService handles report business logic
type ReportService struct {
	repo          *repository.ReportRepository
	analyticsRepo *repository.AnalyticsRepository
}

// NewReportService creates a new report service
func NewReportService(repo *repository.ReportRepository, analyticsRepo *repository.AnalyticsRepository) *ReportService {
	return &ReportService{
		repo:          repo,
		analyticsRepo: analyticsRepo,
	}
}

// CreateReport creates a new report
func (s *ReportService) CreateReport(tenantID, userID uuid.UUID, name, description, reportType, period, format string, startDate, endDate time.Time) (*models.Report, error) {
	// Validate report type
	validTypes := map[string]bool{
		"user_activity":      true,
		"course_performance": true,
		"engagement":         true,
		"revenue":            true,
		"custom":             true,
	}
	if !validTypes[reportType] {
		return nil, errors.New("invalid report type")
	}

	// Validate period
	validPeriods := map[string]bool{
		"daily": true, "weekly": true, "monthly": true,
		"quarterly": true, "yearly": true, "custom": true,
	}
	if !validPeriods[period] {
		return nil, errors.New("invalid period")
	}

	// Validate format
	validFormats := map[string]bool{
		"pdf": true, "excel": true, "csv": true, "json": true,
	}
	if format != "" && !validFormats[format] {
		return nil, errors.New("invalid format")
	}

	// Validate date range
	if endDate.Before(startDate) {
		return nil, errors.New("end date must be after start date")
	}

	report := &models.Report{
		TenantID:    tenantID,
		UserID:      userID,
		Name:        name,
		Description: description,
		Type:        reportType,
		Period:      period,
		StartDate:   startDate,
		EndDate:     endDate,
		Status:      "pending",
		Format:      format,
	}

	if err := s.repo.CreateReport(report); err != nil {
		return nil, err
	}

	return report, nil
}

// GetReport retrieves a report by ID
func (s *ReportService) GetReport(id uuid.UUID) (*models.Report, error) {
	return s.repo.GetReportByID(id)
}

// GetUserReports retrieves all reports for a user
func (s *ReportService) GetUserReports(tenantID, userID uuid.UUID, limit, offset int) ([]models.Report, error) {
	return s.repo.GetReportsByUser(tenantID, userID, limit, offset)
}

// GetTenantReports retrieves all reports for a tenant
func (s *ReportService) GetTenantReports(tenantID uuid.UUID, limit, offset int) ([]models.Report, error) {
	return s.repo.GetReportsByTenant(tenantID, limit, offset)
}

// GenerateReport generates report data and updates status
func (s *ReportService) GenerateReport(reportID uuid.UUID) error {
	report, err := s.repo.GetReportByID(reportID)
	if err != nil {
		return err
	}

	// Update status to processing
	if err := s.repo.UpdateReportStatus(reportID, "processing", ""); err != nil {
		return err
	}

	// Generate report based on type
	var data interface{}
	var recordCount int

	switch report.Type {
	case "user_activity":
		data, recordCount, err = s.generateUserActivityReport(report)
	case "course_performance":
		data, recordCount, err = s.generateCoursePerformanceReport(report)
	case "engagement":
		data, recordCount, err = s.generateEngagementReport(report)
	default:
		err = errors.New("unsupported report type")
	}

	if err != nil {
		s.repo.UpdateReportStatus(reportID, "failed", err.Error())
		return err
	}

	// In a real implementation, this would:
	// 1. Format data according to report.Format (PDF, Excel, CSV, JSON)
	// 2. Upload to cloud storage (S3, etc.)
	// 3. Get file URL and size
	// For now, we'll simulate success
	fileURL := fmt.Sprintf("https://storage.example.com/reports/%s.%s", reportID, report.Format)
	fileSize := len(fmt.Sprintf("%v", data)) // Simplified size calculation

	// Update report with results
	report.Status = "completed"
	report.FileURL = fileURL
	report.FileSize = fileSize
	report.RecordCount = recordCount

	// Convert metadata to JSON bytes for datatypes.JSON
	metadataJSON, err := json.Marshal(map[string]interface{}{
		"generated_at": time.Now(),
		"data_summary": data,
	})
	if err != nil {
		return fmt.Errorf("failed to marshal metadata: %w", err)
	}
	report.Metadata = metadataJSON

	return s.repo.UpdateReport(report)
}

// DeleteReport deletes a report
func (s *ReportService) DeleteReport(id uuid.UUID) error {
	return s.repo.DeleteReport(id)
}

// SearchReports searches reports by query
func (s *ReportService) SearchReports(tenantID uuid.UUID, query string, limit, offset int) ([]models.Report, error) {
	return s.repo.SearchReports(tenantID, query, limit, offset)
}

// Report Schedule operations

// CreateReportSchedule creates a new report schedule
func (s *ReportService) CreateReportSchedule(schedule *models.ReportSchedule) error {
	// Validate frequency
	validFrequencies := map[string]bool{
		"daily": true, "weekly": true, "monthly": true,
	}
	if !validFrequencies[schedule.Frequency] {
		return errors.New("invalid frequency")
	}

	// Calculate next run time
	nextRun := s.calculateNextRunTime(schedule)
	schedule.NextRunAt = &nextRun

	return s.repo.CreateReportSchedule(schedule)
}

// GetReportSchedule retrieves a schedule by ID
func (s *ReportService) GetReportSchedule(id uuid.UUID) (*models.ReportSchedule, error) {
	return s.repo.GetReportScheduleByID(id)
}

// GetUserReportSchedules retrieves schedules for a user
func (s *ReportService) GetUserReportSchedules(tenantID, userID uuid.UUID) ([]models.ReportSchedule, error) {
	return s.repo.GetReportSchedulesByUser(tenantID, userID)
}

// UpdateReportSchedule updates a schedule
func (s *ReportService) UpdateReportSchedule(schedule *models.ReportSchedule) error {
	// Recalculate next run time if schedule changed
	nextRun := s.calculateNextRunTime(schedule)
	schedule.NextRunAt = &nextRun

	return s.repo.UpdateReportSchedule(schedule)
}

// ToggleReportSchedule activates/deactivates a schedule
func (s *ReportService) ToggleReportSchedule(id uuid.UUID, isActive bool) error {
	return s.repo.ToggleReportSchedule(id, isActive)
}

// DeleteReportSchedule deletes a schedule
func (s *ReportService) DeleteReportSchedule(id uuid.UUID) error {
	return s.repo.DeleteReportSchedule(id)
}

// ProcessDueSchedules processes all schedules that are due to run
func (s *ReportService) ProcessDueSchedules() error {
	schedules, err := s.repo.GetDueReportSchedules()
	if err != nil {
		return err
	}

	for _, schedule := range schedules {
		if err := s.executeScheduledReport(&schedule); err != nil {
			// Log error but continue processing other schedules
			continue
		}
	}

	return nil
}

// Report Execution operations

// GetReportExecutions retrieves execution history for a schedule
func (s *ReportService) GetReportExecutions(scheduleID uuid.UUID, limit, offset int) ([]models.ReportExecution, error) {
	return s.repo.GetReportExecutionsBySchedule(scheduleID, limit, offset)
}

// GetReportExecutionStats retrieves execution statistics
func (s *ReportService) GetReportExecutionStats(scheduleID uuid.UUID, startDate, endDate time.Time) (map[string]interface{}, error) {
	return s.repo.GetReportExecutionStats(scheduleID, startDate, endDate)
}

// Private helper methods

func (s *ReportService) generateUserActivityReport(report *models.Report) (interface{}, int, error) {
	// Get user analytics for the period
	analytics, err := s.analyticsRepo.GetTenantUserAnalyticsRange(
		report.TenantID,
		report.StartDate,
		report.EndDate,
		0, 0, // No pagination for report generation
	)
	if err != nil {
		return nil, 0, err
	}

	// Aggregate data
	summary := make(map[string]interface{})
	var totalLogins, totalActiveMinutes, totalPoints int
	for _, a := range analytics {
		totalLogins += a.LoginCount
		totalActiveMinutes += a.ActiveMinutes
		totalPoints += a.PointsEarned
	}

	summary["total_users"] = len(analytics)
	summary["total_logins"] = totalLogins
	summary["total_active_minutes"] = totalActiveMinutes
	summary["total_points_earned"] = totalPoints
	summary["avg_logins_per_user"] = float64(totalLogins) / float64(len(analytics))

	return summary, len(analytics), nil
}

func (s *ReportService) generateCoursePerformanceReport(report *models.Report) (interface{}, int, error) {
	analytics, err := s.analyticsRepo.GetTenantCourseAnalyticsRange(
		report.TenantID,
		report.StartDate,
		report.EndDate,
		0, 0,
	)
	if err != nil {
		return nil, 0, err
	}

	summary := make(map[string]interface{})
	var totalEnrollments, totalReviews int
	var totalRevenue, avgCompletionRate, avgRating float64

	for _, a := range analytics {
		totalEnrollments += a.TotalEnrollments
		totalReviews += a.TotalReviews
		totalRevenue += a.TotalRevenue
		avgCompletionRate += a.CompletionRate
		avgRating += a.AverageRating
	}

	count := float64(len(analytics))
	summary["total_courses"] = len(analytics)
	summary["total_enrollments"] = totalEnrollments
	summary["total_reviews"] = totalReviews
	summary["total_revenue"] = totalRevenue
	summary["avg_completion_rate"] = avgCompletionRate / count
	summary["avg_rating"] = avgRating / count

	return summary, len(analytics), nil
}

func (s *ReportService) generateEngagementReport(report *models.Report) (interface{}, int, error) {
	analytics, err := s.analyticsRepo.GetEngagementAnalyticsRange(
		report.TenantID,
		report.StartDate,
		report.EndDate,
	)
	if err != nil {
		return nil, 0, err
	}

	summary := make(map[string]interface{})
	var totalSessions, totalPageViews, totalNewUsers int
	var avgSessionDuration, avgBounceRate, avgConversionRate float64

	for _, a := range analytics {
		totalSessions += a.TotalSessions
		totalPageViews += a.PageViews
		totalNewUsers += a.NewUsers
		avgSessionDuration += a.AverageSessionDuration
		avgBounceRate += a.BounceRate
		avgConversionRate += a.ConversionRate
	}

	count := float64(len(analytics))
	summary["total_days"] = len(analytics)
	summary["total_sessions"] = totalSessions
	summary["total_page_views"] = totalPageViews
	summary["total_new_users"] = totalNewUsers
	summary["avg_session_duration"] = avgSessionDuration / count
	summary["avg_bounce_rate"] = avgBounceRate / count
	summary["avg_conversion_rate"] = avgConversionRate / count

	return summary, len(analytics), nil
}

func (s *ReportService) executeScheduledReport(schedule *models.ReportSchedule) error {
	now := time.Now()

	// Create execution record
	execution := &models.ReportExecution{
		TenantID:   schedule.TenantID,
		ScheduleID: schedule.ID,
		StartedAt:  now,
		Status:     "running",
	}

	if err := s.repo.CreateReportExecution(execution); err != nil {
		return err
	}

	// Determine date range based on frequency
	var startDate, endDate time.Time
	switch schedule.Frequency {
	case "daily":
		yesterday := now.AddDate(0, 0, -1)
		startDate = time.Date(yesterday.Year(), yesterday.Month(), yesterday.Day(), 0, 0, 0, 0, time.UTC)
		endDate = time.Date(yesterday.Year(), yesterday.Month(), yesterday.Day(), 23, 59, 59, 0, time.UTC)
	case "weekly":
		startDate = now.AddDate(0, 0, -7)
		endDate = now
	case "monthly":
		startDate = now.AddDate(0, -1, 0)
		endDate = now
	}

	// Create report
	report, err := s.CreateReport(
		schedule.TenantID,
		schedule.UserID,
		schedule.Name,
		"Automated report from schedule",
		schedule.ReportType,
		schedule.Frequency,
		schedule.Format,
		startDate,
		endDate,
	)

	if err != nil {
		s.repo.CompleteReportExecution(execution.ID, uuid.Nil, "failed", "", 0, 0, err.Error())
		return err
	}

	// Generate report
	if err := s.GenerateReport(report.ID); err != nil {
		s.repo.CompleteReportExecution(execution.ID, report.ID, "failed", "", 0, 0, err.Error())
		return err
	}

	// Update execution as success
	if err := s.repo.CompleteReportExecution(
		execution.ID,
		report.ID,
		"success",
		report.FileURL,
		report.FileSize,
		report.RecordCount,
		"",
	); err != nil {
		return err
	}

	// Update schedule run times
	lastRun := now
	nextRun := s.calculateNextRunTime(schedule)
	return s.repo.UpdateReportScheduleRunTime(schedule.ID, lastRun, nextRun)
}

func (s *ReportService) calculateNextRunTime(schedule *models.ReportSchedule) time.Time {
	now := time.Now()

	switch schedule.Frequency {
	case "daily":
		// Run at specified time tomorrow
		return s.getNextTimeOfDay(now, schedule.TimeOfDay, 1)
	case "weekly":
		// Run on specified day of week
		return s.getNextDayOfWeek(now, schedule.DayOfWeek, schedule.TimeOfDay)
	case "monthly":
		// Run on specified day of month
		return s.getNextDayOfMonth(now, schedule.DayOfMonth, schedule.TimeOfDay)
	default:
		return now.AddDate(0, 0, 1) // Default to tomorrow
	}
}

func (s *ReportService) getNextTimeOfDay(from time.Time, timeOfDay string, daysToAdd int) time.Time {
	// Parse time (format: "HH:MM")
	hour, minute := 0, 0
	fmt.Sscanf(timeOfDay, "%d:%d", &hour, &minute)

	next := from.AddDate(0, 0, daysToAdd)
	return time.Date(next.Year(), next.Month(), next.Day(), hour, minute, 0, 0, from.Location())
}

func (s *ReportService) getNextDayOfWeek(from time.Time, dayOfWeek int, timeOfDay string) time.Time {
	daysUntil := (dayOfWeek - int(from.Weekday()) + 7) % 7
	if daysUntil == 0 {
		daysUntil = 7 // Next week
	}
	return s.getNextTimeOfDay(from, timeOfDay, daysUntil)
}

func (s *ReportService) getNextDayOfMonth(from time.Time, dayOfMonth int, timeOfDay string) time.Time {
	year, month := from.Year(), from.Month()
	if from.Day() >= dayOfMonth {
		// Next month
		month++
		if month > 12 {
			month = 1
			year++
		}
	}

	// Handle months with fewer days
	lastDay := time.Date(year, month+1, 0, 0, 0, 0, 0, from.Location()).Day()
	if dayOfMonth > lastDay {
		dayOfMonth = lastDay
	}

	hour, minute := 0, 0
	fmt.Sscanf(timeOfDay, "%d:%d", &hour, &minute)

	return time.Date(year, month, dayOfMonth, hour, minute, 0, 0, from.Location())
}
