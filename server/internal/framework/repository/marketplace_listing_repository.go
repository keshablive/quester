package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/models"

	"gorm.io/gorm"
)

// MarketplaceListingRepository handles database operations for marketplace listings
type MarketplaceListingRepository struct {
	db *gorm.DB
}

// NewMarketplaceListingRepository creates a new marketplace listing repository
func NewMarketplaceListingRepository(db *gorm.DB) *MarketplaceListingRepository {
	return &MarketplaceListingRepository{db: db}
}

// Create creates a new listing
func (r *MarketplaceListingRepository) Create(ctx context.Context, listing *models.MarketplaceListing) error {
	return r.db.WithContext(ctx).Create(listing).Error
}

// FindByID finds a listing by ID
func (r *MarketplaceListingRepository) FindByID(ctx context.Context, tenantID uuid.UUID, listingID uuid.UUID) (*models.MarketplaceListing, error) {
	var listing models.MarketplaceListing
	err := r.db.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", listingID, tenantID).
		Preload("Seller").
		Preload("Course").
		Preload("Quest").
		Preload("Badge").
		First(&listing).Error

	return &listing, err
}

// Search searches listings with filters and pagination
func (r *MarketplaceListingRepository) Search(ctx context.Context, tenantID uuid.UUID, filters map[string]interface{}, page int, pageSize int) ([]*models.MarketplaceListing, int64, error) {
	offset := (page - 1) * pageSize

	query := r.db.WithContext(ctx).
		Where("tenant_id = ?", tenantID).
		Preload("Seller")

	// Apply filters
	if sellerID, ok := filters["seller_id"].(uint); ok {
		query = query.Where("seller_id = ?", sellerID)
	}

	if listingType, ok := filters["listing_type"].(string); ok && listingType != "" {
		query = query.Where("listing_type = ?", listingType)
	}

	if status, ok := filters["status"].(string); ok && status != "" {
		query = query.Where("status = ?", status)
	} else {
		// Default to active listings only
		query = query.Where("status = ?", models.ListingStatusActive)
	}

	if minPrice, ok := filters["min_price"].(float64); ok && minPrice > 0 {
		query = query.Where("price >= ?", minPrice)
	}

	if maxPrice, ok := filters["max_price"].(float64); ok && maxPrice > 0 {
		query = query.Where("price <= ?", maxPrice)
	}

	if searchQuery, ok := filters["search"].(string); ok && searchQuery != "" {
		query = query.Where("to_tsvector('english', title || ' ' || COALESCE(description, '')) @@ plainto_tsquery('english', ?)", searchQuery)
	}

	if tags, ok := filters["tags"].([]string); ok && len(tags) > 0 {
		query = query.Where("tags ?| array[?]", tags)
	}

	// Get total count
	var total int64
	if err := query.Model(&models.MarketplaceListing{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Apply sorting
	sortBy := "created_at"
	sortOrder := "DESC"

	if sort, ok := filters["sort_by"].(string); ok && sort != "" {
		sortBy = sort
	}

	if order, ok := filters["sort_order"].(string); ok && order != "" {
		sortOrder = order
	}

	orderClause := fmt.Sprintf("%s %s", sortBy, sortOrder)

	// Get paginated results
	var listings []*models.MarketplaceListing
	if err := query.
		Order(orderClause).
		Offset(offset).
		Limit(pageSize).
		Find(&listings).Error; err != nil {
		return nil, 0, err
	}

	return listings, total, nil
}

// Update updates a listing
func (r *MarketplaceListingRepository) Update(ctx context.Context, listing *models.MarketplaceListing, updates map[string]interface{}) error {
	return r.db.WithContext(ctx).Model(listing).Updates(updates).Error
}

// Delete soft deletes a listing
func (r *MarketplaceListingRepository) Delete(ctx context.Context, listing *models.MarketplaceListing) error {
	return r.db.WithContext(ctx).Delete(listing).Error
}

// GetFeaturedListings retrieves featured listings (highest rated, most sold)
func (r *MarketplaceListingRepository) GetFeaturedListings(ctx context.Context, tenantID uuid.UUID, limit int) ([]*models.MarketplaceListing, error) {
	var listings []*models.MarketplaceListing

	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND status = ?", tenantID, models.ListingStatusActive).
		Order("average_rating DESC, sold_count DESC, created_at DESC").
		Limit(limit).
		Preload("Seller").
		Find(&listings).Error

	return listings, err
}

// GetPopularListings retrieves popular listings (most sold)
func (r *MarketplaceListingRepository) GetPopularListings(ctx context.Context, tenantID uuid.UUID, limit int) ([]*models.MarketplaceListing, error) {
	var listings []*models.MarketplaceListing

	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND status = ?", tenantID, models.ListingStatusActive).
		Order("sold_count DESC, created_at DESC").
		Limit(limit).
		Preload("Seller").
		Find(&listings).Error

	return listings, err
}

// GetNewListings retrieves newest listings
func (r *MarketplaceListingRepository) GetNewListings(ctx context.Context, tenantID uint, limit int) ([]*models.MarketplaceListing, error) {
	var listings []*models.MarketplaceListing

	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND status = ?", tenantID, models.ListingStatusActive).
		Order("published_at DESC").
		Limit(limit).
		Preload("Seller").
		Find(&listings).Error

	return listings, err
}
