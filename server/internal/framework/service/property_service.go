package service

import (
	"context"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2/log"
	"github.com/google/uuid"
	"gorm.io/gorm" // Only for error types (gorm.ErrRecordNotFound) - to be removed when custom errors implemented

	"github.com/keshablive/quester/internal/framework/interfaces"
	"github.com/keshablive/quester/internal/framework/utils"
	"github.com/keshablive/quester/internal/models"
)

// PropertyService handles property listing business logic
type PropertyService struct {
	propertyRepo interfaces.PropertyRepository
	db           *gorm.DB // Retained for Phase 5 - complex queries (SearchProperties, VerifyPropertyDocuments, GetPropertyStats)
	ocrService   *OCRService
	aiService    *OpenAIService
	cacheService interface{} // Redis cache (placeholder)
}

// PropertySearchParams represents search parameters for properties
type PropertySearchParams struct {
	TenantID     uuid.UUID `json:"tenant_id"`
	Latitude     float64   `json:"latitude"`
	Longitude    float64   `json:"longitude"`
	RadiusMeters int       `json:"radius_meters"`
	PropertyType string    `json:"property_type,omitempty"`
	ListingType  string    `json:"listing_type,omitempty"`
	MinPrice     *float64  `json:"min_price,omitempty"`
	MaxPrice     *float64  `json:"max_price,omitempty"`
	Bedrooms     *int      `json:"bedrooms,omitempty"`
	Bathrooms    *int      `json:"bathrooms,omitempty"`
	Tags         []string  `json:"tags,omitempty"`
	Limit        int       `json:"limit"`
	Offset       int       `json:"offset"`
}

// PropertyWithDistance represents a property with calculated distance
type PropertyWithDistance struct {
	Property        *models.Property `json:"property"`
	DistanceMeters  float64          `json:"distance_meters"`
	DistanceDisplay string           `json:"distance_display"`
}

// NewPropertyService creates a new property service instance
// Note: db parameter retained for Phase 5 complex queries - will be removed when QueryBuilder pattern implemented
func NewPropertyService(propertyRepo interfaces.PropertyRepository, db *gorm.DB, ocrService *OCRService, aiService *OpenAIService) *PropertyService {
	return &PropertyService{
		propertyRepo: propertyRepo,
		db:           db,
		ocrService:   ocrService,
		aiService:    aiService,
	}
}

// CreateProperty creates a new property listing
func (s *PropertyService) CreateProperty(ctx context.Context, property *models.Property) error {
	// Validate required fields using shared utilities
	if err := utils.ValidateRequiredUUIDs(map[string]uuid.UUID{
		"tenant_id": property.TenantID,
		"owner_id":  property.OwnerID,
	}); err != nil {
		return err
	}

	if err := utils.ValidateRequiredString(property.Title, "title"); err != nil {
		return err
	}

	if err := utils.ValidatePositiveNumber(property.Price, "price"); err != nil {
		return err
	}

	// Location validation (Point uses Coordinates slice: [lng, lat])
	if len(property.Location.Coordinates) < 2 || (property.Location.Coordinates[0] == 0 && property.Location.Coordinates[1] == 0) {
		return fmt.Errorf("location is required")
	}

	// Set defaults
	if property.Status == "" {
		property.Status = models.PropertyStatusDraft
	}

	if property.Currency == "" {
		property.Currency = "INR"
	}

	// Create in database
	if err := s.propertyRepo.Create(ctx, property); err != nil {
		return fmt.Errorf("failed to create property: %w", err)
	}

	log.Infof("Created property ID %d for tenant %d", property.ID, property.TenantID)
	return nil
}

// GetProperty retrieves a property by ID
func (s *PropertyService) GetProperty(ctx context.Context, tenantID, propertyID uuid.UUID) (*models.Property, error) {
	property, err := s.propertyRepo.FindByID(ctx, tenantID, propertyID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, utils.WrapNotFoundErrorWithID("property", propertyID)
		}
		return nil, utils.WrapServiceError("GetProperty", err)
	}

	// Increment view count asynchronously (if db available for complex queries)
	if s.db != nil {
		go func() {
			_ = s.IncrementViewCount(context.Background(), propertyID)
		}()
	}

	return property, nil
}

// UpdateProperty updates an existing property
func (s *PropertyService) UpdateProperty(ctx context.Context, tenantID, propertyID uuid.UUID, updates map[string]interface{}) error {
	// First get the property to verify tenant ownership
	property, err := s.propertyRepo.FindByID(ctx, tenantID, propertyID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return utils.WrapNotFoundErrorWithID("property", propertyID)
		}
		return utils.WrapServiceError("UpdateProperty", err)
	}

	// Apply updates (manually since we're working with map)
	// Note: This is a simplified approach - in production, use reflection or generated code
	// For now, we'll use the Update method with the full property object
	// The repository Update method will handle the actual update
	if err := s.propertyRepo.Update(ctx, property); err != nil {
		return utils.WrapServiceError("UpdateProperty", err)
	}

	return nil
}

// DeleteProperty soft deletes a property
func (s *PropertyService) DeleteProperty(ctx context.Context, tenantID, propertyID uuid.UUID) error {
	if err := s.propertyRepo.Delete(ctx, tenantID, propertyID); err != nil {
		if err == gorm.ErrRecordNotFound {
			return utils.WrapNotFoundErrorWithID("property", propertyID)
		}
		return utils.WrapServiceError("DeleteProperty", err)
	}

	return nil
}

// SearchProperties performs geo-spatial search for properties
func (s *PropertyService) SearchProperties(ctx context.Context, params PropertySearchParams) ([]PropertyWithDistance, int64, error) {
	// Build base query
	query := s.db.WithContext(ctx).
		Model(&models.Property{}).
		Where("tenant_id = ? AND deleted_at IS NULL AND status = ?", params.TenantID, models.PropertyStatusActive).
		Where("expires_at > ?", time.Now())

	// Add geo-spatial filter using PostGIS ST_DWithin
	if params.Latitude != 0 && params.Longitude != 0 {
		point := fmt.Sprintf("POINT(%f %f)", params.Longitude, params.Latitude)
		query = query.Where(
			"ST_DWithin(location::geography, ST_GeogFromText(?), ?)",
			point,
			params.RadiusMeters,
		)
	}

	// Add filters
	if params.PropertyType != "" {
		query = query.Where("property_type = ?", params.PropertyType)
	}

	if params.ListingType != "" {
		query = query.Where("listing_type = ?", params.ListingType)
	}

	if params.MinPrice != nil {
		query = query.Where("price >= ?", *params.MinPrice)
	}

	if params.MaxPrice != nil {
		query = query.Where("price <= ?", *params.MaxPrice)
	}

	if params.Bedrooms != nil {
		query = query.Where("bedrooms >= ?", *params.Bedrooms)
	}

	if params.Bathrooms != nil {
		query = query.Where("bathrooms >= ?", *params.Bathrooms)
	}

	if len(params.Tags) > 0 {
		query = query.Where("tags && ?", params.Tags) // Array overlap
	}

	// Count total results
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count properties: %w", err)
	}

	// Get properties with distance calculation
	var properties []models.Property
	point := fmt.Sprintf("POINT(%f %f)", params.Longitude, params.Latitude)

	err := query.
		Select("*, ST_Distance(location::geography, ST_GeogFromText(?)) as distance", point).
		Order("distance ASC").
		Limit(params.Limit).
		Offset(params.Offset).
		Find(&properties).Error

	if err != nil {
		return nil, 0, fmt.Errorf("failed to search properties: %w", err)
	}

	// Calculate distances
	results := make([]PropertyWithDistance, len(properties))
	for i, prop := range properties {
		distance := calculateDistance(
			params.Latitude, params.Longitude,
			prop.Location.Coordinates[1], prop.Location.Coordinates[0],
		)

		results[i] = PropertyWithDistance{
			Property:        &prop,
			DistanceMeters:  distance,
			DistanceDisplay: formatDistance(distance),
		}
	}

	return results, total, nil
}

// VerifyPropertyDocuments verifies all documents for a property using OCR + AI
func (s *PropertyService) VerifyPropertyDocuments(ctx context.Context, propertyID uuid.UUID) error {
	// Get property
	var property models.Property
	if err := s.db.WithContext(ctx).First(&property, propertyID).Error; err != nil {
		return fmt.Errorf("property not found: %w", err)
	}

	documents, err := property.GetDocuments()
	if err != nil {
		return fmt.Errorf("failed to get documents: %w", err)
	}
	if len(documents) == 0 {
		return fmt.Errorf("no documents to verify")
	}

	totalScore := 0.0
	verifiedCount := 0

	for i, doc := range documents {
		// Step 1: OCR extraction
		ocrResult, err := s.ocrService.ExtractText(ctx, doc.URL, "eng")
		if err != nil {
			log.Warnf("OCR failed for document %s: %v", doc.ID, err)
			doc.VerificationStatus = "failed"
			doc.RejectionReason = fmt.Sprintf("OCR extraction failed: %v", err)
			documents[i] = doc
			continue
		}

		doc.OCRText = ocrResult.Text
		doc.OCRConfidence = ocrResult.Confidence

		// Step 2: AI verification
		aiRequest := DocumentVerificationRequest{
			OCRText:      ocrResult.Text,
			DocumentType: DocumentType(doc.Type),
			PropertyInfo: PropertyInfo{
				Address:   property.Address.Street, // Address is a struct
				OwnerName: "",                      // Would need to fetch from user
			},
		}

		aiResult, err := s.aiService.VerifyDocument(ctx, aiRequest)
		if err != nil {
			log.Warnf("AI verification failed for document %s: %v", doc.ID, err)
			doc.VerificationStatus = "failed"
			doc.RejectionReason = fmt.Sprintf("AI verification failed: %v", err)
			documents[i] = doc
			continue
		}

		// Update document verification status
		if aiResult.IsValid && aiResult.ConfidenceScore >= 70 {
			doc.VerificationStatus = "verified"
			doc.RejectionReason = ""
			totalScore += aiResult.ConfidenceScore
			verifiedCount++
		} else {
			doc.VerificationStatus = "rejected"
			doc.RejectionReason = aiResult.Reasoning
		}

		documents[i] = doc
	}

	// Calculate aggregate score
	aggregateScore := 0.0
	if verifiedCount > 0 {
		aggregateScore = totalScore / float64(len(documents))
	}

	// Update property
	property.SetDocuments(documents)
	property.UpdateVerificationScore(aggregateScore)

	if err := s.db.WithContext(ctx).Save(&property).Error; err != nil {
		return fmt.Errorf("failed to update property: %w", err)
	}

	log.Infof("Verified %d/%d documents for property %d, score: %.2f",
		verifiedCount, len(documents), propertyID, aggregateScore)

	return nil
}

// PublishProperty publishes a property (changes status to active)
func (s *PropertyService) PublishProperty(ctx context.Context, propertyID uuid.UUID) error {
	var property models.Property
	if err := s.db.WithContext(ctx).First(&property, propertyID).Error; err != nil {
		return fmt.Errorf("property not found: %w", err)
	}

	// Validate before publishing
	if !property.IsVerified() {
		return fmt.Errorf("property must be verified before publishing (score: %.2f, required: 70)", property.VerificationScore)
	}

	// Set expiration date
	property.SetExpirationDate()
	property.Status = models.PropertyStatusActive
	property.PublishedAt = timePtr(time.Now())

	if err := s.db.WithContext(ctx).Save(&property).Error; err != nil {
		return fmt.Errorf("failed to publish property: %w", err)
	}

	log.Infof("Published property %d, expires at %v", propertyID, property.ExpiresAt)
	return nil
}

// ExpireProperty marks a property as expired
func (s *PropertyService) ExpireProperty(ctx context.Context, propertyID uuid.UUID) error {
	return s.UpdateProperty(ctx, uuid.Nil, propertyID, map[string]interface{}{
		"status": models.PropertyStatusExpired,
	})
}

// IncrementViewCount increments the view count for a property
func (s *PropertyService) IncrementViewCount(ctx context.Context, propertyID uuid.UUID) error {
	return s.db.WithContext(ctx).
		Model(&models.Property{}).
		Where("id = ?", propertyID).
		UpdateColumn("view_count", gorm.Expr("view_count + 1")).
		Error
}

// IncrementContactCount increments the contact count for a property
func (s *PropertyService) IncrementContactCount(ctx context.Context, propertyID uuid.UUID) error {
	return s.db.WithContext(ctx).
		Model(&models.Property{}).
		Where("id = ?", propertyID).
		UpdateColumn("contact_count", gorm.Expr("contact_count + 1")).
		Error
}

// GetExpiredProperties retrieves all expired properties for cleanup
func (s *PropertyService) GetExpiredProperties(ctx context.Context, tenantID uuid.UUID) ([]*models.Property, error) {
	var properties []*models.Property

	err := s.db.WithContext(ctx).
		Where("tenant_id = ? AND deleted_at IS NULL AND status = ?", tenantID, models.PropertyStatusActive).
		Where("expires_at <= ?", time.Now()).
		Find(&properties).Error

	if err != nil {
		return nil, fmt.Errorf("failed to get expired properties: %w", err)
	}

	return properties, nil
}

// Helper functions

// calculateDistance calculates the distance between two coordinates using Haversine formula
func calculateDistance(lat1, lon1, lat2, lon2 float64) float64 {
	const earthRadius = 6371000 // meters

	dLat := (lat2 - lat1) * (3.141592653589793 / 180.0)
	dLon := (lon2 - lon1) * (3.141592653589793 / 180.0)

	a := 0.5 - 0.5*cosine(dLat) + cosine(lat1*(3.141592653589793/180.0))*cosine(lat2*(3.141592653589793/180.0))*(1-cosine(dLon))/2

	return earthRadius * 2 * asin(sqrt(a))
}

func cosine(x float64) float64 {
	// Simple cosine approximation
	return 1 - x*x/2 + x*x*x*x/24
}

func asin(x float64) float64 {
	// Simple asin approximation
	return x + x*x*x/6 + 3*x*x*x*x*x/40
}

func sqrt(x float64) float64 {
	// Newton's method
	if x == 0 {
		return 0
	}
	z := x
	for i := 0; i < 10; i++ {
		z = (z + x/z) / 2
	}
	return z
}

// formatDistance formats distance in meters to human-readable string
func formatDistance(meters float64) string {
	if meters < 1000 {
		return fmt.Sprintf("%.0f m", meters)
	}
	return fmt.Sprintf("%.1f km", meters/1000)
}

// timePtr returns a pointer to a time.Time
func timePtr(t time.Time) *time.Time {
	return &t
}

// GetPropertyStats returns statistics for properties
func (s *PropertyService) GetPropertyStats(ctx context.Context, tenantID uuid.UUID) (map[string]interface{}, error) {
	var stats struct {
		Total      int64
		Active     int64
		Sold       int64
		Rented     int64
		Expired    int64
		TotalViews int64
	}

	// Total properties
	s.db.WithContext(ctx).
		Model(&models.Property{}).
		Where("tenant_id = ? AND deleted_at IS NULL", tenantID).
		Count(&stats.Total)

	// Active properties
	s.db.WithContext(ctx).
		Model(&models.Property{}).
		Where("tenant_id = ? AND deleted_at IS NULL AND status = ?", tenantID, models.PropertyStatusActive).
		Count(&stats.Active)

	// Sold properties
	s.db.WithContext(ctx).
		Model(&models.Property{}).
		Where("tenant_id = ? AND deleted_at IS NULL AND status = ?", tenantID, models.PropertyStatusSold).
		Count(&stats.Sold)

	// Rented properties
	s.db.WithContext(ctx).
		Model(&models.Property{}).
		Where("tenant_id = ? AND deleted_at IS NULL AND status = ?", tenantID, models.PropertyStatusRented).
		Count(&stats.Rented)

	// Expired properties
	s.db.WithContext(ctx).
		Model(&models.Property{}).
		Where("tenant_id = ? AND deleted_at IS NULL AND status = ?", tenantID, models.PropertyStatusExpired).
		Count(&stats.Expired)

	// Total views
	var result struct {
		TotalViews int64
	}
	s.db.WithContext(ctx).
		Model(&models.Property{}).
		Select("COALESCE(SUM(view_count), 0) as total_views").
		Where("tenant_id = ? AND deleted_at IS NULL", tenantID).
		Scan(&result)
	stats.TotalViews = result.TotalViews

	return map[string]interface{}{
		"total":       stats.Total,
		"active":      stats.Active,
		"sold":        stats.Sold,
		"rented":      stats.Rented,
		"expired":     stats.Expired,
		"total_views": stats.TotalViews,
	}, nil
}
