// Package services defines service layer interfaces for the Quester platform.
package services

import (
	"context"

	"github.com/google/uuid"
)

// TenantServiceInterface defines the contract for multi-tenant operations.
// Implementations handle tenant CRUD, settings, and configuration management.
type TenantServiceInterface interface {
	// GetTenant retrieves a tenant by ID.
	// Returns tenant on success, error if not found.
	GetTenant(ctx context.Context, tenantID uuid.UUID) (*Tenant, error)

	// GetTenantBySlug retrieves a tenant by its slug/subdomain.
	// Returns tenant on success, error if not found.
	GetTenantBySlug(ctx context.Context, slug string) (*Tenant, error)

	// CreateTenant creates a new tenant.
	// Returns created tenant on success.
	CreateTenant(ctx context.Context, input *CreateTenantInput) (*Tenant, error)

	// UpdateTenant updates tenant information.
	// Returns updated tenant on success.
	UpdateTenant(ctx context.Context, tenantID uuid.UUID, input *UpdateTenantInput) (*Tenant, error)

	// DeleteTenant soft-deletes a tenant.
	// Returns error if tenant not found or has active users.
	DeleteTenant(ctx context.Context, tenantID uuid.UUID) error

	// GetTenantSettings retrieves tenant-specific settings.
	GetTenantSettings(ctx context.Context, tenantID uuid.UUID) (*TenantSettings, error)

	// UpdateTenantSettings updates tenant-specific settings.
	UpdateTenantSettings(ctx context.Context, tenantID uuid.UUID, settings *TenantSettings) error
}

// Tenant represents a tenant/organization in the multi-tenant system.
type Tenant struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Slug      string    `json:"slug"`
	LogoURL   string    `json:"logo_url"`
	Domain    string    `json:"domain"`
	Active    bool      `json:"active"`
	CreatedAt string    `json:"created_at"`
	UpdatedAt string    `json:"updated_at"`
}

// CreateTenantInput contains data for creating a tenant.
type CreateTenantInput struct {
	Name    string `json:"name" validate:"required"`
	Slug    string `json:"slug" validate:"required"`
	LogoURL string `json:"logo_url"`
	Domain  string `json:"domain"`
}

// UpdateTenantInput contains fields that can be updated on a tenant.
type UpdateTenantInput struct {
	Name    *string `json:"name"`
	LogoURL *string `json:"logo_url"`
	Domain  *string `json:"domain"`
	Active  *bool   `json:"active"`
}

// TenantSettings represents tenant-specific configuration.
type TenantSettings struct {
	TenantID           uuid.UUID         `json:"tenant_id"`
	Features           map[string]bool   `json:"features"`
	Branding           *BrandingSettings `json:"branding"`
	NotificationConfig map[string]any    `json:"notification_config"`
}

// BrandingSettings represents tenant branding configuration.
type BrandingSettings struct {
	PrimaryColor   string `json:"primary_color"`
	SecondaryColor string `json:"secondary_color"`
	LogoURL        string `json:"logo_url"`
	FaviconURL     string `json:"favicon_url"`
}
