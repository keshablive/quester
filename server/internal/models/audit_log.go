// AuditLog model for tracking tenant isolation violations
package models

import (
	"time"

	"github.com/google/uuid"
)

// AuditLog represents a security audit log entry
// Used to track cross-tenant access attempts and other security events
type AuditLog struct {
	ID                uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	UserID            uuid.UUID `gorm:"type:uuid;not null;index:idx_user_violations" json:"user_id"`
	TenantID          uuid.UUID `gorm:"type:uuid;not null;index:idx_tenant_violations" json:"tenant_id"`
	AttemptedTenantID uuid.UUID `gorm:"type:uuid;not null" json:"attempted_tenant_id"`
	ResourceType      string    `gorm:"type:varchar(50);not null" json:"resource_type"` // e.g., "quest", "user", "quest_progress"
	ResourceID        uuid.UUID `gorm:"type:uuid" json:"resource_id"`
	Action            string    `gorm:"type:varchar(20);not null" json:"action"` // e.g., "read", "write", "delete"
	IPAddress         string    `gorm:"type:varchar(45)" json:"ip_address"`      // IPv4 or IPv6
	UserAgent         string    `gorm:"type:text" json:"user_agent"`
	CreatedAt         time.Time `gorm:"index:idx_created_at" json:"created_at"`
}

// TableName specifies the table name for GORM
func (AuditLog) TableName() string {
	return "audit_logs"
}
