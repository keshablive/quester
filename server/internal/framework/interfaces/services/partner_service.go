// Package services defines service layer interfaces for the Quester platform.
package services

import (
	"context"

	"github.com/google/uuid"
)

// PartnerServiceInterface defines the contract for partner/affiliate operations.
// Implementations handle partner onboarding, commission tracking, and payouts.
type PartnerServiceInterface interface {
	// GetPartner retrieves a partner by ID.
	GetPartner(ctx context.Context, tenantID, partnerID uuid.UUID) (*Partner, error)

	// GetPartnerByCode retrieves a partner by their referral code.
	GetPartnerByCode(ctx context.Context, tenantID uuid.UUID, code string) (*Partner, error)

	// CreatePartner creates a new partner.
	CreatePartner(ctx context.Context, tenantID uuid.UUID, input *CreatePartnerInput) (*Partner, error)

	// UpdatePartner updates partner information.
	UpdatePartner(ctx context.Context, tenantID, partnerID uuid.UUID, input *UpdatePartnerInput) (*Partner, error)

	// DeactivatePartner deactivates a partner account.
	DeactivatePartner(ctx context.Context, tenantID, partnerID uuid.UUID) error

	// GetPartners retrieves partners with optional filtering.
	GetPartners(ctx context.Context, tenantID uuid.UUID, filters *PartnerFilters) (*PartnerListResponse, error)

	// TrackReferral records a referral from a partner.
	TrackReferral(ctx context.Context, tenantID uuid.UUID, referral *ReferralInput) (*Referral, error)

	// GetPartnerReferrals retrieves referrals for a partner.
	GetPartnerReferrals(ctx context.Context, tenantID, partnerID uuid.UUID, filters *ReferralFilters) (*ReferralListResponse, error)

	// GetPartnerEarnings retrieves earnings summary for a partner.
	GetPartnerEarnings(ctx context.Context, tenantID, partnerID uuid.UUID) (*PartnerEarnings, error)

	// ProcessPayout processes a payout request for a partner.
	ProcessPayout(ctx context.Context, tenantID, partnerID uuid.UUID, amount int64) (*Payout, error)
}

// Partner represents a partner/affiliate.
type Partner struct {
	ID              uuid.UUID `json:"id"`
	TenantID        uuid.UUID `json:"tenant_id"`
	UserID          uuid.UUID `json:"user_id"`
	Code            string    `json:"code"`
	Name            string    `json:"name"`
	Email           string    `json:"email"`
	CommissionRate  float64   `json:"commission_rate"`
	Status          string    `json:"status"` // pending, active, suspended
	TotalEarnings   int64     `json:"total_earnings"`
	PendingEarnings int64     `json:"pending_earnings"`
	CreatedAt       string    `json:"created_at"`
	UpdatedAt       string    `json:"updated_at"`
}

// CreatePartnerInput contains data for creating a partner.
type CreatePartnerInput struct {
	UserID         uuid.UUID `json:"user_id" validate:"required"`
	Code           string    `json:"code"`
	CommissionRate float64   `json:"commission_rate" validate:"min=0,max=100"`
}

// UpdatePartnerInput contains fields that can be updated on a partner.
type UpdatePartnerInput struct {
	Code           *string  `json:"code"`
	CommissionRate *float64 `json:"commission_rate"`
	Status         *string  `json:"status"`
}

// PartnerFilters contains filtering options for partner queries.
type PartnerFilters struct {
	Status string `json:"status"`
	Search string `json:"search"`
	Page   int    `json:"page"`
	Limit  int    `json:"limit"`
}

// PartnerListResponse contains paginated partner results.
type PartnerListResponse struct {
	Partners   []*Partner `json:"partners"`
	TotalCount int64      `json:"total_count"`
	Page       int        `json:"page"`
	Limit      int        `json:"limit"`
}

// Referral represents a partner referral.
type Referral struct {
	ID           uuid.UUID `json:"id"`
	TenantID     uuid.UUID `json:"tenant_id"`
	PartnerID    uuid.UUID `json:"partner_id"`
	ReferredUser uuid.UUID `json:"referred_user"`
	Source       string    `json:"source"`
	Status       string    `json:"status"` // pending, converted, expired
	Commission   int64     `json:"commission"`
	CreatedAt    string    `json:"created_at"`
	ConvertedAt  *string   `json:"converted_at,omitempty"`
}

// ReferralInput contains data for creating a referral.
type ReferralInput struct {
	PartnerCode  string    `json:"partner_code" validate:"required"`
	ReferredUser uuid.UUID `json:"referred_user" validate:"required"`
	Source       string    `json:"source"`
}

// ReferralFilters contains filtering options for referral queries.
type ReferralFilters struct {
	Status    string `json:"status"`
	StartDate string `json:"start_date"`
	EndDate   string `json:"end_date"`
	Page      int    `json:"page"`
	Limit     int    `json:"limit"`
}

// ReferralListResponse contains paginated referral results.
type ReferralListResponse struct {
	Referrals  []*Referral `json:"referrals"`
	TotalCount int64       `json:"total_count"`
	Page       int         `json:"page"`
	Limit      int         `json:"limit"`
}

// PartnerEarnings contains earnings summary for a partner.
type PartnerEarnings struct {
	PartnerID       uuid.UUID `json:"partner_id"`
	TotalEarnings   int64     `json:"total_earnings"`
	PendingEarnings int64     `json:"pending_earnings"`
	PaidOut         int64     `json:"paid_out"`
	TotalReferrals  int       `json:"total_referrals"`
	ConvertedCount  int       `json:"converted_count"`
	ConversionRate  float64   `json:"conversion_rate"`
}

// Payout represents a partner payout.
type Payout struct {
	ID          uuid.UUID `json:"id"`
	TenantID    uuid.UUID `json:"tenant_id"`
	PartnerID   uuid.UUID `json:"partner_id"`
	Amount      int64     `json:"amount"`
	Currency    string    `json:"currency"`
	Status      string    `json:"status"` // pending, processing, completed, failed
	ProcessedAt *string   `json:"processed_at,omitempty"`
	CreatedAt   string    `json:"created_at"`
}
