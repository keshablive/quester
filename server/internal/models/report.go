package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// Report represents a generated analytics report
type Report struct {
	ID           uuid.UUID      `gorm:"type:uuid;primary_key" json:"id"`
	TenantID     uuid.UUID      `gorm:"type:uuid;not null;index:idx_report_tenant" json:"tenant_id"`
	UserID       uuid.UUID      `gorm:"type:uuid;not null;index:idx_report_user" json:"user_id"`
	Name         string         `gorm:"type:varchar(255);not null" json:"name"`
	Description  string         `gorm:"type:text" json:"description,omitempty"`
	Type         string         `gorm:"type:varchar(50);not null;index:idx_report_type" json:"type"` // user_activity, course_performance, engagement, revenue
	Period       string         `gorm:"type:varchar(20);not null" json:"period"`                     // daily, weekly, monthly, quarterly, yearly, custom
	StartDate    time.Time      `gorm:"type:date;not null" json:"start_date"`
	EndDate      time.Time      `gorm:"type:date;not null" json:"end_date"`
	Status       string         `gorm:"type:varchar(20);not null;index:idx_report_status" json:"status"` // pending, processing, completed, failed
	Format       string         `gorm:"type:varchar(20)" json:"format"`                                  // pdf, excel, csv, json
	FileURL      string         `gorm:"type:text" json:"file_url,omitempty"`
	FileSize     int            `gorm:"default:0" json:"file_size"` // in bytes
	RecordCount  int            `gorm:"default:0" json:"record_count"`
	ErrorMessage string         `gorm:"type:text" json:"error_message,omitempty"`
	Metadata     datatypes.JSON `gorm:"type:jsonb" json:"metadata,omitempty"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
}

// BeforeCreate hook to set UUID
func (r *Report) BeforeCreate(tx *gorm.DB) error {
	if r.ID == uuid.Nil {
		r.ID = uuid.New()
	}
	return nil
}

// TableName specifies the table name
func (Report) TableName() string {
	return "reports"
}

// ReportSchedule represents a scheduled report configuration
type ReportSchedule struct {
	ID          uuid.UUID      `gorm:"type:uuid;primary_key" json:"id"`
	TenantID    uuid.UUID      `gorm:"type:uuid;not null;index:idx_report_schedule_tenant" json:"tenant_id"`
	UserID      uuid.UUID      `gorm:"type:uuid;not null;index:idx_report_schedule_user" json:"user_id"`
	Name        string         `gorm:"type:varchar(255);not null" json:"name"`
	Description string         `gorm:"type:text" json:"description,omitempty"`
	ReportType  string         `gorm:"type:varchar(50);not null" json:"report_type"`
	Frequency   string         `gorm:"type:varchar(20);not null" json:"frequency"` // daily, weekly, monthly
	DayOfWeek   int            `gorm:"default:0" json:"day_of_week"`               // 0-6 for weekly reports
	DayOfMonth  int            `gorm:"default:1" json:"day_of_month"`              // 1-31 for monthly reports
	TimeOfDay   string         `gorm:"type:varchar(5)" json:"time_of_day"`         // HH:MM format
	Timezone    string         `gorm:"type:varchar(50);default:'UTC'" json:"timezone"`
	Format      string         `gorm:"type:varchar(20)" json:"format"`
	IsActive    bool           `gorm:"default:true" json:"is_active"`
	Recipients  pq.StringArray `gorm:"type:text[]" json:"recipients"`
	Filters     datatypes.JSON `gorm:"type:jsonb" json:"filters,omitempty"`
	LastRunAt   *time.Time     `json:"last_run_at,omitempty"`
	NextRunAt   *time.Time     `json:"next_run_at,omitempty"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
}

// BeforeCreate hook to set UUID
func (rs *ReportSchedule) BeforeCreate(tx *gorm.DB) error {
	if rs.ID == uuid.Nil {
		rs.ID = uuid.New()
	}
	return nil
}

// TableName specifies the table name
func (ReportSchedule) TableName() string {
	return "report_schedules"
}

// ReportExecution represents a single execution of a scheduled report
type ReportExecution struct {
	ID           uuid.UUID  `gorm:"type:uuid;primary_key" json:"id"`
	TenantID     uuid.UUID  `gorm:"type:uuid;not null;index:idx_report_execution_tenant" json:"tenant_id"`
	ScheduleID   uuid.UUID  `gorm:"type:uuid;not null;index:idx_report_execution_schedule" json:"schedule_id"`
	ReportID     *uuid.UUID `gorm:"type:uuid;index:idx_report_execution_report" json:"report_id,omitempty"`
	StartedAt    time.Time  `gorm:"not null" json:"started_at"`
	CompletedAt  *time.Time `json:"completed_at,omitempty"`
	Status       string     `gorm:"type:varchar(20);not null" json:"status"` // running, success, failed
	RecordCount  int        `gorm:"default:0" json:"record_count"`
	FileURL      string     `gorm:"type:text" json:"file_url,omitempty"`
	FileSize     int        `gorm:"default:0" json:"file_size"`
	ErrorMessage string     `gorm:"type:text" json:"error_message,omitempty"`
	Duration     int        `gorm:"default:0" json:"duration"` // in seconds
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

// BeforeCreate hook to set UUID
func (re *ReportExecution) BeforeCreate(tx *gorm.DB) error {
	if re.ID == uuid.Nil {
		re.ID = uuid.New()
	}
	return nil
}

// TableName specifies the table name
func (ReportExecution) TableName() string {
	return "report_executions"
}
