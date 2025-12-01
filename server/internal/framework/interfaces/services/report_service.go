// Package services defines service layer interfaces for the Quester platform.
package services

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// ReportServiceInterface defines the contract for reporting operations.
// Implementations handle report generation, scheduling, and delivery.
type ReportServiceInterface interface {
	// CreateReport creates a new report request.
	CreateReport(ctx context.Context, tenantID, userID uuid.UUID, input *CreateReportInput) (*Report, error)

	// GetReport retrieves a report by ID.
	GetReport(ctx context.Context, tenantID, reportID uuid.UUID) (*Report, error)

	// GetUserReports retrieves reports created by a user.
	GetUserReports(ctx context.Context, tenantID, userID uuid.UUID, filters *ReportFilters) (*ReportListResponse, error)

	// GenerateReport generates report data and returns the result.
	GenerateReport(ctx context.Context, tenantID, reportID uuid.UUID) (*ReportResult, error)

	// ScheduleReport schedules a recurring report.
	ScheduleReport(ctx context.Context, tenantID, reportID uuid.UUID, schedule *ReportSchedule) error

	// CancelScheduledReport cancels a scheduled report.
	CancelScheduledReport(ctx context.Context, tenantID, reportID uuid.UUID) error

	// GetReportData retrieves the actual report data/content.
	GetReportData(ctx context.Context, tenantID, reportID uuid.UUID) ([]byte, error)

	// ExportReport exports a report in specified format.
	ExportReport(ctx context.Context, tenantID, reportID uuid.UUID, format string) ([]byte, string, error)

	// DeleteReport deletes a report.
	DeleteReport(ctx context.Context, tenantID, reportID uuid.UUID) error
}

// Report represents a report configuration.
type Report struct {
	ID          uuid.UUID `json:"id"`
	TenantID    uuid.UUID `json:"tenant_id"`
	UserID      uuid.UUID `json:"user_id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Type        string    `json:"type"` // user_activity, course_performance, engagement, revenue, custom
	Period      string    `json:"period"` // daily, weekly, monthly, quarterly, yearly, custom
	StartDate   time.Time `json:"start_date"`
	EndDate     time.Time `json:"end_date"`
	Status      string    `json:"status"` // pending, processing, completed, failed
	Format      string    `json:"format"` // pdf, excel, csv, json
	FileURL     string    `json:"file_url,omitempty"`
	ScheduleID  *uuid.UUID `json:"schedule_id,omitempty"`
	CreatedAt   string    `json:"created_at"`
	UpdatedAt   string    `json:"updated_at"`
}

// CreateReportInput contains data for creating a report.
type CreateReportInput struct {
	Name        string    `json:"name" validate:"required"`
	Description string    `json:"description"`
	Type        string    `json:"type" validate:"required"`
	Period      string    `json:"period" validate:"required"`
	StartDate   time.Time `json:"start_date" validate:"required"`
	EndDate     time.Time `json:"end_date" validate:"required"`
	Format      string    `json:"format"`
	Parameters  map[string]any `json:"parameters"`
}

// ReportFilters contains filtering options for report queries.
type ReportFilters struct {
	Type   string `json:"type"`
	Status string `json:"status"`
	Period string `json:"period"`
	Page   int    `json:"page"`
	Limit  int    `json:"limit"`
}

// ReportListResponse contains paginated report results.
type ReportListResponse struct {
	Reports    []*Report `json:"reports"`
	TotalCount int64     `json:"total_count"`
	Page       int       `json:"page"`
	Limit      int       `json:"limit"`
}

// ReportResult contains the generated report data.
type ReportResult struct {
	ReportID    uuid.UUID      `json:"report_id"`
	Data        map[string]any `json:"data"`
	Summary     *ReportSummary `json:"summary"`
	GeneratedAt string         `json:"generated_at"`
}

// ReportSummary contains high-level report metrics.
type ReportSummary struct {
	TotalRecords int            `json:"total_records"`
	DateRange    string         `json:"date_range"`
	Metrics      map[string]any `json:"metrics"`
}

// ReportSchedule represents a recurring report schedule.
type ReportSchedule struct {
	ID           uuid.UUID `json:"id"`
	ReportID     uuid.UUID `json:"report_id"`
	Frequency    string    `json:"frequency"` // daily, weekly, monthly
	DayOfWeek    *int      `json:"day_of_week,omitempty"` // 0-6 for weekly
	DayOfMonth   *int      `json:"day_of_month,omitempty"` // 1-31 for monthly
	Time         string    `json:"time"` // HH:MM format
	Recipients   []string  `json:"recipients"`
	NextRunAt    string    `json:"next_run_at"`
	LastRunAt    *string   `json:"last_run_at,omitempty"`
	Active       bool      `json:"active"`
}
