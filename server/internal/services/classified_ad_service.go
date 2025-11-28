package services

import (
	"context"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2/log"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/keshablive/quester/internal/models"
)

// ClassifiedAdService handles classified ad business logic
type ClassifiedAdService struct {
	db *gorm.DB
}

// ClassifiedAdSearchParams represents search parameters for classified ads
type ClassifiedAdSearchParams struct {
	TenantID     uuid.UUID `json:"tenant_id"`
	AdType       string    `json:"ad_type,omitempty"`
	Status       string    `json:"status,omitempty"`
	Latitude     float64   `json:"latitude,omitempty"`
	Longitude    float64   `json:"longitude,omitempty"`
	RadiusMeters int       `json:"radius_meters,omitempty"`
	MinPrice     *float64  `json:"min_price,omitempty"`
	MaxPrice     *float64  `json:"max_price,omitempty"`
	Keywords     []string  `json:"keywords,omitempty"`
	Tags         []string  `json:"tags,omitempty"`
	Limit        int       `json:"limit"`
	Offset       int       `json:"offset"`
}

// ClassifiedAdWithDistance represents a classified ad with calculated distance
type ClassifiedAdWithDistance struct {
	Ad              *models.ClassifiedAd `json:"ad"`
	DistanceMeters  *float64             `json:"distance_meters,omitempty"`
	DistanceDisplay string               `json:"distance_display,omitempty"`
}

// NewClassifiedAdService creates a new classified ad service instance
func NewClassifiedAdService(db *gorm.DB) *ClassifiedAdService {
	return &ClassifiedAdService{
		db: db,
	}
}

// CreateAd creates a new classified ad
func (s *ClassifiedAdService) CreateAd(ctx context.Context, ad *models.ClassifiedAd) error {
	// Validate required fields
	if ad.TenantID == uuid.Nil || ad.PosterID == uuid.Nil {
		return fmt.Errorf("tenant_id and poster_id are required")
	}

	if ad.Title == "" {
		return fmt.Errorf("title is required")
	}

	if ad.AdType == "" {
		return fmt.Errorf("ad_type is required")
	}

	if ad.ContactMethod == "" {
		return fmt.Errorf("contact_method is required")
	}

	// Set defaults
	if ad.Status == "" {
		ad.Status = models.AdStatusDraft
	}

	if ad.Currency == "" && ad.Price != nil {
		ad.Currency = "INR"
	}

	// Create in database
	if err := s.db.WithContext(ctx).Create(ad).Error; err != nil {
		return fmt.Errorf("failed to create classified ad: %w", err)
	}

	log.Infof("Created classified ad ID %d for tenant %d", ad.ID, ad.TenantID)
	return nil
}

// GetAd retrieves a classified ad by ID
func (s *ClassifiedAdService) GetAd(ctx context.Context, tenantID, adID uuid.UUID) (*models.ClassifiedAd, error) {
	var ad models.ClassifiedAd

	err := s.db.WithContext(ctx).
		Where("id = ? AND tenant_id = ? AND deleted_at IS NULL", adID, tenantID).
		First(&ad).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("classified ad not found")
		}
		return nil, fmt.Errorf("failed to get classified ad: %w", err)
	}

	// Increment view count asynchronously
	go func() {
		_ = s.IncrementViewCount(context.Background(), adID)
	}()

	return &ad, nil
}

// UpdateAd updates an existing classified ad
func (s *ClassifiedAdService) UpdateAd(ctx context.Context, tenantID, adID uuid.UUID, updates map[string]interface{}) error {
	result := s.db.WithContext(ctx).
		Model(&models.ClassifiedAd{}).
		Where("id = ? AND tenant_id = ? AND deleted_at IS NULL", adID, tenantID).
		Updates(updates)

	if result.Error != nil {
		return fmt.Errorf("failed to update classified ad: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("classified ad not found")
	}

	return nil
}

// DeleteAd soft deletes a classified ad
func (s *ClassifiedAdService) DeleteAd(ctx context.Context, tenantID, adID uuid.UUID) error {
	result := s.db.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", adID, tenantID).
		Delete(&models.ClassifiedAd{})

	if result.Error != nil {
		return fmt.Errorf("failed to delete classified ad: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("classified ad not found")
	}

	return nil
}

// SearchAds performs search for classified ads
func (s *ClassifiedAdService) SearchAds(ctx context.Context, params ClassifiedAdSearchParams) ([]ClassifiedAdWithDistance, int64, error) {
	// Build base query
	query := s.db.WithContext(ctx).
		Model(&models.ClassifiedAd{}).
		Where("tenant_id = ? AND deleted_at IS NULL", params.TenantID)

	// Filter by status (default to active)
	if params.Status != "" {
		query = query.Where("status = ?", params.Status)
	} else {
		query = query.Where("status = ? AND expires_at > ?", models.AdStatusActive, time.Now())
	}

	// Add geo-spatial filter if coordinates provided
	if params.Latitude != 0 && params.Longitude != 0 && params.RadiusMeters > 0 {
		point := fmt.Sprintf("POINT(%f %f)", params.Longitude, params.Latitude)
		query = query.Where(
			"location IS NOT NULL AND ST_DWithin(location::geography, ST_GeogFromText(?), ?)",
			point,
			params.RadiusMeters,
		)
	}

	// Add filters
	if params.AdType != "" {
		query = query.Where("ad_type = ?", params.AdType)
	}

	if params.MinPrice != nil {
		query = query.Where("price >= ?", *params.MinPrice)
	}

	if params.MaxPrice != nil {
		query = query.Where("price <= ?", *params.MaxPrice)
	}

	if len(params.Keywords) > 0 {
		query = query.Where("keywords && ?", params.Keywords) // Array overlap
	}

	if len(params.Tags) > 0 {
		query = query.Where("tags && ?", params.Tags) // Array overlap
	}

	// Count total results
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count classified ads: %w", err)
	}

	// Get ads
	var ads []models.ClassifiedAd
	queryBuilder := query.Limit(params.Limit).Offset(params.Offset)

	// Order by distance if geo-search
	if params.Latitude != 0 && params.Longitude != 0 && params.RadiusMeters > 0 {
		point := fmt.Sprintf("POINT(%f %f)", params.Longitude, params.Latitude)
		queryBuilder = queryBuilder.
			Select("*, ST_Distance(location::geography, ST_GeogFromText(?)) as distance", point).
			Order("distance ASC")
	} else {
		queryBuilder = queryBuilder.Order("created_at DESC")
	}

	err := queryBuilder.Find(&ads).Error
	if err != nil {
		return nil, 0, fmt.Errorf("failed to search classified ads: %w", err)
	}

	// Calculate distances if applicable
	results := make([]ClassifiedAdWithDistance, len(ads))
	for i, ad := range ads {
		result := ClassifiedAdWithDistance{
			Ad: &ad,
		}

		if params.Latitude != 0 && params.Longitude != 0 && ad.Location != nil {
			distance := calculateDistance(
				params.Latitude, params.Longitude,
				ad.Location.Coordinates[1], ad.Location.Coordinates[0],
			)
			result.DistanceMeters = &distance
			result.DistanceDisplay = formatDistance(distance)
		}

		results[i] = result
	}

	return results, total, nil
}

// PublishAd publishes a classified ad (changes status to active)
func (s *ClassifiedAdService) PublishAd(ctx context.Context, adID uuid.UUID) error {
	var ad models.ClassifiedAd
	if err := s.db.WithContext(ctx).First(&ad, adID).Error; err != nil {
		return fmt.Errorf("classified ad not found: %w", err)
	}

	// Set expiration date
	ad.SetExpirationDate()
	ad.Status = models.AdStatusActive
	ad.PublishedAt = timePtr(time.Now())

	if err := s.db.WithContext(ctx).Save(&ad).Error; err != nil {
		return fmt.Errorf("failed to publish classified ad: %w", err)
	}

	log.Infof("Published classified ad %d, expires at %v", adID, ad.ExpiresAt)
	return nil
}

// RenewAd renews a classified ad (extends expiration by 30 days)
func (s *ClassifiedAdService) RenewAd(ctx context.Context, tenantID, adID uuid.UUID) error {
	var ad models.ClassifiedAd
	if err := s.db.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", adID, tenantID).
		First(&ad).Error; err != nil {
		return fmt.Errorf("classified ad not found: %w", err)
	}

	if !ad.CanBeRenewed() {
		return fmt.Errorf("ad can only be renewed within 7 days of expiration")
	}

	ad.RenewAd()

	if err := s.db.WithContext(ctx).Save(&ad).Error; err != nil {
		return fmt.Errorf("failed to renew classified ad: %w", err)
	}

	log.Infof("Renewed classified ad %d, new expiration: %v", adID, ad.ExpiresAt)
	return nil
}

// MarkAsSold marks a classified ad as sold
func (s *ClassifiedAdService) MarkAsSold(ctx context.Context, tenantID, adID uuid.UUID) error {
	var ad models.ClassifiedAd
	if err := s.db.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", adID, tenantID).
		First(&ad).Error; err != nil {
		return fmt.Errorf("classified ad not found: %w", err)
	}

	ad.MarkAsSold()

	if err := s.db.WithContext(ctx).Save(&ad).Error; err != nil {
		return fmt.Errorf("failed to mark ad as sold: %w", err)
	}

	log.Infof("Marked classified ad %d as sold", adID)
	return nil
}

// ExpireAd marks a classified ad as expired
func (s *ClassifiedAdService) ExpireAd(ctx context.Context, adID uuid.UUID) error {
	return s.UpdateAd(ctx, uuid.Nil, adID, map[string]interface{}{
		"status": models.AdStatusExpired,
	})
}

// IncrementViewCount increments the view count for a classified ad
func (s *ClassifiedAdService) IncrementViewCount(ctx context.Context, adID uuid.UUID) error {
	return s.db.WithContext(ctx).
		Model(&models.ClassifiedAd{}).
		Where("id = ?", adID).
		UpdateColumn("view_count", gorm.Expr("view_count + 1")).
		Error
}

// IncrementResponseCount increments the response count for a classified ad
func (s *ClassifiedAdService) IncrementResponseCount(ctx context.Context, adID uuid.UUID) error {
	return s.db.WithContext(ctx).
		Model(&models.ClassifiedAd{}).
		Where("id = ?", adID).
		UpdateColumn("response_count", gorm.Expr("response_count + 1")).
		Error
}

// GetExpiredAds retrieves all expired classified ads for cleanup
func (s *ClassifiedAdService) GetExpiredAds(ctx context.Context, tenantID uuid.UUID) ([]*models.ClassifiedAd, error) {
	var ads []*models.ClassifiedAd

	err := s.db.WithContext(ctx).
		Where("tenant_id = ? AND deleted_at IS NULL AND status = ?", tenantID, models.AdStatusActive).
		Where("expires_at <= ?", time.Now()).
		Find(&ads).Error

	if err != nil {
		return nil, fmt.Errorf("failed to get expired ads: %w", err)
	}

	return ads, nil
}

// GetAdsByPoster retrieves all ads posted by a specific user
func (s *ClassifiedAdService) GetAdsByPoster(ctx context.Context, tenantID, posterID uuid.UUID) ([]*models.ClassifiedAd, error) {
	var ads []*models.ClassifiedAd

	err := s.db.WithContext(ctx).
		Where("tenant_id = ? AND poster_id = ? AND deleted_at IS NULL", tenantID, posterID).
		Order("created_at DESC").
		Find(&ads).Error

	if err != nil {
		return nil, fmt.Errorf("failed to get ads by poster: %w", err)
	}

	return ads, nil
}

// GetAdStats returns statistics for classified ads
func (s *ClassifiedAdService) GetAdStats(ctx context.Context, tenantID uuid.UUID) (map[string]interface{}, error) {
	var stats struct {
		Total          int64
		Active         int64
		Sold           int64
		Expired        int64
		TotalViews     int64
		TotalResponses int64
	}

	// Total ads
	s.db.WithContext(ctx).
		Model(&models.ClassifiedAd{}).
		Where("tenant_id = ? AND deleted_at IS NULL", tenantID).
		Count(&stats.Total)

	// Active ads
	s.db.WithContext(ctx).
		Model(&models.ClassifiedAd{}).
		Where("tenant_id = ? AND deleted_at IS NULL AND status = ?", tenantID, models.AdStatusActive).
		Count(&stats.Active)

	// Sold ads
	s.db.WithContext(ctx).
		Model(&models.ClassifiedAd{}).
		Where("tenant_id = ? AND deleted_at IS NULL AND status = ?", tenantID, models.AdStatusSold).
		Count(&stats.Sold)

	// Expired ads
	s.db.WithContext(ctx).
		Model(&models.ClassifiedAd{}).
		Where("tenant_id = ? AND deleted_at IS NULL AND status = ?", tenantID, models.AdStatusExpired).
		Count(&stats.Expired)

	// Total views
	var viewResult struct {
		TotalViews int64
	}
	s.db.WithContext(ctx).
		Model(&models.ClassifiedAd{}).
		Select("COALESCE(SUM(view_count), 0) as total_views").
		Where("tenant_id = ? AND deleted_at IS NULL", tenantID).
		Scan(&viewResult)
	stats.TotalViews = viewResult.TotalViews

	// Total responses
	var responseResult struct {
		TotalResponses int64
	}
	s.db.WithContext(ctx).
		Model(&models.ClassifiedAd{}).
		Select("COALESCE(SUM(response_count), 0) as total_responses").
		Where("tenant_id = ? AND deleted_at IS NULL", tenantID).
		Scan(&responseResult)
	stats.TotalResponses = responseResult.TotalResponses

	// Breakdown by type
	var typeBreakdown []struct {
		AdType string
		Count  int64
	}
	s.db.WithContext(ctx).
		Model(&models.ClassifiedAd{}).
		Select("ad_type, COUNT(*) as count").
		Where("tenant_id = ? AND deleted_at IS NULL", tenantID).
		Group("ad_type").
		Scan(&typeBreakdown)

	typeStats := make(map[string]int64)
	for _, item := range typeBreakdown {
		typeStats[item.AdType] = item.Count
	}

	return map[string]interface{}{
		"total":           stats.Total,
		"active":          stats.Active,
		"sold":            stats.Sold,
		"expired":         stats.Expired,
		"total_views":     stats.TotalViews,
		"total_responses": stats.TotalResponses,
		"by_type":         typeStats,
	}, nil
}

// GetRecentAds retrieves the most recent classified ads
func (s *ClassifiedAdService) GetRecentAds(ctx context.Context, tenantID uuid.UUID, limit int) ([]*models.ClassifiedAd, error) {
	var ads []*models.ClassifiedAd

	err := s.db.WithContext(ctx).
		Where("tenant_id = ? AND deleted_at IS NULL AND status = ?", tenantID, models.AdStatusActive).
		Where("expires_at > ?", time.Now()).
		Order("created_at DESC").
		Limit(limit).
		Find(&ads).Error

	if err != nil {
		return nil, fmt.Errorf("failed to get recent ads: %w", err)
	}

	return ads, nil
}

// GetPopularAds retrieves the most viewed classified ads
func (s *ClassifiedAdService) GetPopularAds(ctx context.Context, tenantID uuid.UUID, limit int) ([]*models.ClassifiedAd, error) {
	var ads []*models.ClassifiedAd

	err := s.db.WithContext(ctx).
		Where("tenant_id = ? AND deleted_at IS NULL AND status = ?", tenantID, models.AdStatusActive).
		Where("expires_at > ?", time.Now()).
		Order("view_count DESC").
		Limit(limit).
		Find(&ads).Error

	if err != nil {
		return nil, fmt.Errorf("failed to get popular ads: %w", err)
	}

	return ads, nil
}
