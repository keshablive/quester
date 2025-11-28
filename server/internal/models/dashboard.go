package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// Dashboard represents a customizable analytics dashboard
type Dashboard struct {
	ID              uuid.UUID      `gorm:"type:uuid;primary_key" json:"id"`
	TenantID        uuid.UUID      `gorm:"type:uuid;not null;index:idx_dashboard_tenant" json:"tenant_id"`
	UserID          uuid.UUID      `gorm:"type:uuid;not null;index:idx_dashboard_user" json:"user_id"`
	Name            string         `gorm:"type:varchar(255);not null" json:"name"`
	Description     string         `gorm:"type:text" json:"description,omitempty"`
	IsDefault       bool           `gorm:"default:false" json:"is_default"`
	IsShared        bool           `gorm:"default:false" json:"is_shared"`
	RefreshInterval int            `gorm:"default:60" json:"refresh_interval"` // in seconds
	Layout          datatypes.JSON `gorm:"type:jsonb" json:"layout,omitempty"`
	Widgets         datatypes.JSON `gorm:"type:jsonb" json:"widgets,omitempty"`
	Filters         datatypes.JSON `gorm:"type:jsonb" json:"filters,omitempty"`
	Preferences     datatypes.JSON `gorm:"type:jsonb" json:"preferences,omitempty"`
	SharedWith      datatypes.JSON `gorm:"type:jsonb" json:"shared_with,omitempty"`
	ExportConfig    datatypes.JSON `gorm:"type:jsonb" json:"export_config,omitempty"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
}

// BeforeCreate hook to set UUID
func (d *Dashboard) BeforeCreate(tx *gorm.DB) error {
	if d.ID == uuid.Nil {
		d.ID = uuid.New()
	}
	return nil
}

// TableName specifies the table name
func (Dashboard) TableName() string {
	return "dashboards"
}
