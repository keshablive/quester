package models

import (
	"time"

	"github.com/google/uuid"
)

// Tenant represents a multi-tenant organization in the system
type Tenant struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Name      string    `gorm:"type:varchar(255);not null" json:"name"`
	Subdomain string    `gorm:"type:varchar(100);uniqueIndex;not null" json:"subdomain"`
	IsActive  bool      `gorm:"not null;default:true" json:"is_active"`
	CreatedAt time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"updated_at"`
}

// TableName specifies the table name for Tenant
func (Tenant) TableName() string {
	return "tenants"
}
