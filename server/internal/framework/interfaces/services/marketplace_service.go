// Package services defines service layer interfaces for the Quester platform.
package services

import (
	"context"

	"github.com/google/uuid"
)

// MarketplaceServiceInterface defines the contract for marketplace operations.
// Implementations handle listing CRUD, purchases, and seller management.
type MarketplaceServiceInterface interface {
	// GetListing retrieves a marketplace listing by ID.
	GetListing(ctx context.Context, tenantID, listingID uuid.UUID) (*MarketplaceListing, error)

	// GetListings retrieves marketplace listings with filtering.
	GetListings(ctx context.Context, tenantID uuid.UUID, filters *ListingFilters) (*ListingListResponse, error)

	// CreateListing creates a new marketplace listing.
	CreateListing(ctx context.Context, tenantID, sellerID uuid.UUID, input *CreateListingInput) (*MarketplaceListing, error)

	// UpdateListing updates a marketplace listing.
	UpdateListing(ctx context.Context, tenantID, listingID uuid.UUID, input *UpdateListingInput) (*MarketplaceListing, error)

	// DeleteListing removes a marketplace listing.
	DeleteListing(ctx context.Context, tenantID, listingID uuid.UUID) error

	// PurchaseListing processes a purchase of a listing.
	PurchaseListing(ctx context.Context, tenantID, buyerID, listingID uuid.UUID) (*Purchase, error)

	// GetUserPurchases retrieves purchases made by a user.
	GetUserPurchases(ctx context.Context, tenantID, userID uuid.UUID, filters *PurchaseFilters) (*PurchaseListResponse, error)

	// GetSellerListings retrieves listings created by a seller.
	GetSellerListings(ctx context.Context, tenantID, sellerID uuid.UUID) ([]*MarketplaceListing, error)

	// GetFeaturedListings retrieves featured/promoted listings.
	GetFeaturedListings(ctx context.Context, tenantID uuid.UUID, limit int) ([]*MarketplaceListing, error)
}

// MarketplaceListing represents an item for sale in the marketplace.
type MarketplaceListing struct {
	ID          uuid.UUID `json:"id"`
	TenantID    uuid.UUID `json:"tenant_id"`
	SellerID    uuid.UUID `json:"seller_id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Type        string    `json:"type"` // course, badge, item, etc.
	Price       int64     `json:"price"`
	Currency    string    `json:"currency"`
	ImageURL    string    `json:"image_url"`
	ContentID   uuid.UUID `json:"content_id,omitempty"` // Reference to course, badge, etc.
	Status      string    `json:"status"`               // active, sold, expired
	Featured    bool      `json:"featured"`
	CreatedAt   string    `json:"created_at"`
	UpdatedAt   string    `json:"updated_at"`
}

// ListingFilters contains filtering options for listing queries.
type ListingFilters struct {
	Type     string `json:"type"`
	Status   string `json:"status"`
	MinPrice *int64 `json:"min_price"`
	MaxPrice *int64 `json:"max_price"`
	SellerID string `json:"seller_id"`
	Search   string `json:"search"`
	Page     int    `json:"page"`
	Limit    int    `json:"limit"`
}

// ListingListResponse contains paginated listing results.
type ListingListResponse struct {
	Listings   []*MarketplaceListing `json:"listings"`
	TotalCount int64                 `json:"total_count"`
	Page       int                   `json:"page"`
	Limit      int                   `json:"limit"`
}

// CreateListingInput contains data for creating a listing.
type CreateListingInput struct {
	Title       string    `json:"title" validate:"required"`
	Description string    `json:"description"`
	Type        string    `json:"type" validate:"required"`
	Price       int64     `json:"price" validate:"required,min=0"`
	Currency    string    `json:"currency"`
	ImageURL    string    `json:"image_url"`
	ContentID   uuid.UUID `json:"content_id"`
}

// UpdateListingInput contains fields that can be updated on a listing.
type UpdateListingInput struct {
	Title       *string `json:"title"`
	Description *string `json:"description"`
	Price       *int64  `json:"price"`
	ImageURL    *string `json:"image_url"`
	Status      *string `json:"status"`
	Featured    *bool   `json:"featured"`
}

// Purchase represents a marketplace purchase.
type Purchase struct {
	ID          uuid.UUID           `json:"id"`
	TenantID    uuid.UUID           `json:"tenant_id"`
	BuyerID     uuid.UUID           `json:"buyer_id"`
	ListingID   uuid.UUID           `json:"listing_id"`
	Listing     *MarketplaceListing `json:"listing,omitempty"`
	Amount      int64               `json:"amount"`
	Currency    string              `json:"currency"`
	Status      string              `json:"status"`
	PurchasedAt string              `json:"purchased_at"`
}

// PurchaseFilters contains filtering options for purchase queries.
type PurchaseFilters struct {
	Status string `json:"status"`
	Page   int    `json:"page"`
	Limit  int    `json:"limit"`
}

// PurchaseListResponse contains paginated purchase results.
type PurchaseListResponse struct {
	Purchases  []*Purchase `json:"purchases"`
	TotalCount int64       `json:"total_count"`
	Page       int         `json:"page"`
	Limit      int         `json:"limit"`
}
