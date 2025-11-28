// Package repository provides generic repository patterns with multi-tenant support.
// CONSTITUTION: Multi-Tenancy (NON-NEGOTIABLE) - All queries MUST filter by TenantID.
package repository

import "github.com/google/uuid"

// TenantModel is a type constraint for models that support multi-tenancy.
// CONSTITUTION: Multi-Tenancy (NON-NEGOTIABLE) - All models MUST implement this interface.
//
// Any model used with GenericRepository MUST:
// - Have a TenantID field of type uuid.UUID
// - Implement these methods for tenant scope enforcement
//
// Models without TenantID are rejected at compile time via the type constraint.
//
// Example implementation:
//
//	type Badge struct {
//	    ID        uuid.UUID `gorm:"type:uuid;primaryKey"`
//	    TenantID  uuid.UUID `gorm:"type:uuid;not null;index"`
//	    Name      string
//	    CreatedAt time.Time
//	    UpdatedAt time.Time
//	}
//
//	func (b *Badge) GetID() uuid.UUID         { return b.ID }
//	func (b *Badge) GetTenantID() uuid.UUID   { return b.TenantID }
//	func (b *Badge) SetTenantID(id uuid.UUID) { b.TenantID = id }
//	func (b *Badge) TableName() string        { return "badges" }
type TenantModel interface {
	// GetID returns the primary key as UUID
	GetID() uuid.UUID

	// GetTenantID returns the tenant scope identifier
	GetTenantID() uuid.UUID

	// SetTenantID sets the tenant scope identifier (called during Create)
	SetTenantID(id uuid.UUID)

	// TableName returns the database table name (GORM convention)
	TableName() string
}

// TenantIDKey is the context key for storing tenant ID.
type TenantIDKey struct{}

// UserIDKey is the context key for storing user ID.
type UserIDKey struct{}
