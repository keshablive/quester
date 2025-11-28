package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/framework/utils"
	"github.com/keshablive/quester/internal/models"
	"github.com/keshablive/quester/internal/repositories"

	"gorm.io/gorm"
)

// MarketplaceService handles marketplace business logic
type MarketplaceService struct {
	db              *gorm.DB
	marketplaceRepo *repositories.MarketplaceListingRepository
	userRepo        *repositories.UserRepository
	courseRepo      *repositories.CourseRepository
	// questRepo: Disabled until QuestRepository is integrated (Phase 3)
	badgeRepo *repositories.BadgeRepository
}

// NewMarketplaceService creates a new marketplace service
func NewMarketplaceService(
	db *gorm.DB,
	marketplaceRepo *repositories.MarketplaceListingRepository,
	userRepo *repositories.UserRepository,
	courseRepo *repositories.CourseRepository,
	// questRepo: Disabled until QuestRepository is integrated (Phase 3)
	badgeRepo *repositories.BadgeRepository,
) *MarketplaceService {
	return &MarketplaceService{
		db:              db,
		marketplaceRepo: marketplaceRepo,
		userRepo:        userRepo,
		courseRepo:      courseRepo,
		// questRepo: Disabled until QuestRepository is integrated (Phase 3)
		badgeRepo: badgeRepo,
	}
}

// CreateListing creates a new marketplace listing
// C2: UUID Migration - sellerID changed from uint to uuid.UUID
func (s *MarketplaceService) CreateListing(ctx context.Context, tenantID uuid.UUID, sellerID uuid.UUID, listing *models.MarketplaceListing) (*models.MarketplaceListing, error) {
	// Validate seller exists
	seller, err := s.userRepo.FindByID(ctx, sellerID)
	if err != nil {
		return nil, fmt.Errorf("seller not found: %w", err)
	}
	if seller == nil {
		return nil, fmt.Errorf("seller not found")
	}

	listing.TenantID = tenantID
	listing.SellerID = sellerID

	// Validate referenced content exists
	if err := s.validateListingReferences(ctx, tenantID, listing); err != nil {
		return nil, err
	}

	// Create listing
	if err := s.marketplaceRepo.Create(ctx, listing); err != nil {
		return nil, fmt.Errorf("failed to create listing: %w", err)
	}

	return listing, nil
}

// GetListing retrieves a marketplace listing by ID
func (s *MarketplaceService) GetListing(ctx context.Context, tenantID uuid.UUID, listingID uuid.UUID) (*models.MarketplaceListing, error) {
	listing, err := s.marketplaceRepo.FindByID(ctx, tenantID, listingID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, utils.WrapNotFoundErrorWithID("listing", listingID)
		}
		return nil, utils.WrapServiceError("GetListing", err)
	}

	return listing, nil
}

// SearchListings searches listings with filters and pagination
func (s *MarketplaceService) SearchListings(ctx context.Context, tenantID uuid.UUID, filters map[string]interface{}, page int, pageSize int) ([]*models.MarketplaceListing, int64, error) {
	// Set default pagination
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	listings, total, err := s.marketplaceRepo.Search(ctx, tenantID, filters, page, pageSize)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to search listings: %w", err)
	}

	return listings, total, nil
}

// UpdateListing updates an existing listing
func (s *MarketplaceService) UpdateListing(ctx context.Context, tenantID uuid.UUID, sellerID uuid.UUID, listingID uuid.UUID, updates map[string]interface{}) (*models.MarketplaceListing, error) {
	// Fetch existing listing
	listing, err := s.marketplaceRepo.FindByID(ctx, tenantID, listingID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("listing not found")
		}
		return nil, fmt.Errorf("failed to fetch listing: %w", err)
	}

	// Verify ownership
	if listing.SellerID != sellerID {
		return nil, fmt.Errorf("forbidden: you can only update your own listings")
	}

	// Update listing
	if err := s.marketplaceRepo.Update(ctx, listing, updates); err != nil {
		return nil, fmt.Errorf("failed to update listing: %w", err)
	}

	return listing, nil
}

// DeleteListing soft-deletes a marketplace listing
func (s *MarketplaceService) DeleteListing(ctx context.Context, tenantID uuid.UUID, sellerID uuid.UUID, listingID uuid.UUID) error {
	// Fetch existing listing
	listing, err := s.marketplaceRepo.FindByID(ctx, tenantID, listingID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("listing not found")
		}
		return fmt.Errorf("failed to fetch listing: %w", err)
	}

	// Verify ownership
	if listing.SellerID != sellerID {
		return fmt.Errorf("forbidden: you can only delete your own listings")
	}

	// Soft delete
	if err := s.marketplaceRepo.Delete(ctx, listing); err != nil {
		return fmt.Errorf("failed to delete listing: %w", err)
	}

	return nil
}

// PublishListing publishes a marketplace listing
func (s *MarketplaceService) PublishListing(ctx context.Context, tenantID uuid.UUID, sellerID uuid.UUID, listingID uuid.UUID) (*models.MarketplaceListing, error) {
	// Fetch existing listing
	listing, err := s.marketplaceRepo.FindByID(ctx, tenantID, listingID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("listing not found")
		}
		return nil, fmt.Errorf("failed to fetch listing: %w", err)
	}

	// Verify ownership
	if listing.SellerID != sellerID {
		return nil, fmt.Errorf("forbidden: you can only publish your own listings")
	}

	// Validate listing is complete
	if listing.Title == "" || listing.Price <= 0 {
		return nil, fmt.Errorf("listing must have title and price to be published")
	}

	// Update status to active
	now := time.Now()
	listing.Status = models.ListingStatusActive
	listing.PublishedAt = &now

	if err := s.marketplaceRepo.Update(ctx, listing, map[string]interface{}{
		"status":       listing.Status,
		"published_at": listing.PublishedAt,
	}); err != nil {
		return nil, fmt.Errorf("failed to publish listing: %w", err)
	}

	return listing, nil
}

// GetSellerListings retrieves all listings for a specific seller
func (s *MarketplaceService) GetSellerListings(ctx context.Context, tenantID uuid.UUID, sellerID uuid.UUID, page int, pageSize int) ([]*models.MarketplaceListing, int64, error) {
	filters := map[string]interface{}{
		"seller_id": sellerID,
	}
	return s.marketplaceRepo.Search(ctx, tenantID, filters, page, pageSize)
}

// validateListingReferences validates that referenced content exists
func (s *MarketplaceService) validateListingReferences(ctx context.Context, tenantID uuid.UUID, listing *models.MarketplaceListing) error {
	// Validate course if referenced
	if listing.CourseID != nil {
		_, err := s.courseRepo.FindByID(ctx, tenantID, *listing.CourseID)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return fmt.Errorf("referenced course not found")
			}
			return fmt.Errorf("failed to validate course reference: %w", err)
		}
	}

	// Validate quest if referenced
	// Note: Quest validation disabled until QuestRepository is integrated (Phase 3)
	// if listing.QuestID != nil {
	// 	_, err := s.questRepo.FindByID(ctx, tenantID, *listing.QuestID)
	// 	if err != nil {
	// 		if errors.Is(err, gorm.ErrRecordNotFound) {
	// 			return fmt.Errorf("referenced quest not found")
	// 		}
	// 		return fmt.Errorf("failed to validate quest reference: %w", err)
	// 	}
	// }

	// Validate badge if referenced
	// Note: Badge validation disabled - type mismatch between MarketplaceListing (uint) and BadgeRepository (uuid.UUID)
	// Will be resolved when ID types are unified across all models
	// if listing.BadgeID != nil {
	// 	_, err := s.badgeRepo.FindByID(ctx, tenantID_as_uuid, badgeID_as_uuid)
	// 	if err != nil {
	// 		if errors.Is(err, gorm.ErrRecordNotFound) {
	// 			return fmt.Errorf("referenced badge not found")
	// 		}
	// 		return fmt.Errorf("failed to validate badge reference: %w", err)
	// 	}
	// }

	return nil
}

// AddReview adds a review to a listing (after purchase)
func (s *MarketplaceService) AddReview(ctx context.Context, tenantID uuid.UUID, listingID uuid.UUID, transactionID uuid.UUID, reviewerID uuid.UUID, rating int, title string, reviewText string) (*models.MarketplaceReview, error) {
	// Validate listing exists
	listing, err := s.marketplaceRepo.FindByID(ctx, tenantID, listingID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("listing not found")
		}
		return nil, fmt.Errorf("failed to fetch listing")
	}

	// Validate rating
	if rating < 1 || rating > 5 {
		return nil, fmt.Errorf("rating must be between 1 and 5")
	}

	// Create review
	review := &models.MarketplaceReview{
		TenantID:      tenantID,
		ListingID:     listing.ID,
		TransactionID: transactionID,
		ReviewerID:    reviewerID,
		Rating:        rating,
		Title:         title,
		ReviewText:    reviewText,
	}

	if err := s.db.WithContext(ctx).Create(review).Error; err != nil {
		// Check for duplicate review (constraint violation)
		if errors.Is(err, gorm.ErrDuplicatedKey) {
			return nil, fmt.Errorf("you have already reviewed this purchase")
		}
		return nil, fmt.Errorf("failed to create review")
	}

	return review, nil
}

// GetListingReviews retrieves all reviews for a listing
func (s *MarketplaceService) GetListingReviews(ctx context.Context, tenantID uuid.UUID, listingID uuid.UUID, page int, pageSize int) ([]*models.MarketplaceReview, int64, error) {
	// Set default pagination
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	offset := (page - 1) * pageSize

	var reviews []*models.MarketplaceReview
	var total int64

	query := s.db.WithContext(ctx).
		Where("tenant_id = ? AND listing_id = ?", tenantID, listingID).
		Preload("Reviewer")

	// Get total count
	if err := query.Model(&models.MarketplaceReview{}).Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count reviews")
	}

	// Get paginated reviews
	if err := query.
		Order("created_at DESC").
		Offset(offset).
		Limit(pageSize).
		Find(&reviews).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to fetch reviews")
	}

	return reviews, total, nil
}

// AddSellerResponse allows a seller to respond to a review
func (s *MarketplaceService) AddSellerResponse(ctx context.Context, tenantID uuid.UUID, sellerID uuid.UUID, reviewID uuid.UUID, response string) (*models.MarketplaceReview, error) {
	var review models.MarketplaceReview

	// Fetch review with listing
	if err := s.db.WithContext(ctx).
		Preload("Listing").
		Where("id = ? AND tenant_id = ?", reviewID, tenantID).
		First(&review).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("review not found")
		}
		return nil, fmt.Errorf("failed to fetch review")
	}

	// Verify ownership
	if review.Listing.SellerID != sellerID {
		return nil, fmt.Errorf("you can only respond to reviews on your own listings")
	}

	// Add response
	if err := review.AddSellerResponse(s.db.WithContext(ctx), response); err != nil {
		return nil, fmt.Errorf("failed to add seller response")
	}

	return &review, nil
}

// GetListingStats retrieves statistics for a listing
func (s *MarketplaceService) GetListingStats(ctx context.Context, tenantID uuid.UUID, listingID uuid.UUID) (map[string]interface{}, error) {
	listing, err := s.marketplaceRepo.FindByID(ctx, tenantID, listingID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("listing not found")
		}
		return nil, fmt.Errorf("failed to fetch listing")
	}

	// Get transaction count
	var transactionCount int64
	if err := s.db.WithContext(ctx).
		Model(&models.Transaction{}).
		Where("tenant_id = ? AND listing_id = ?", tenantID, listingID).
		Count(&transactionCount).Error; err != nil {
		return nil, fmt.Errorf("failed to count transactions")
	}

	// Get total revenue
	var totalRevenue float64
	if err := s.db.WithContext(ctx).
		Model(&models.Transaction{}).
		Where("tenant_id = ? AND listing_id = ? AND status IN ?", tenantID, listingID, []string{"released", "delivered"}).
		Select("COALESCE(SUM(amount), 0)").
		Scan(&totalRevenue).Error; err != nil {
		return nil, fmt.Errorf("failed to calculate revenue")
	}

	stats := map[string]interface{}{
		"listing_id":        listing.ID,
		"sold_count":        listing.SoldCount,
		"transaction_count": transactionCount,
		"total_revenue":     totalRevenue,
		"average_rating":    listing.AverageRating,
		"total_reviews":     listing.TotalReviews,
	}

	return stats, nil
}
