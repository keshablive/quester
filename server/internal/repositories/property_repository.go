package repositories

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/models"
	"gorm.io/gorm"
)

// PropertyRepositoryImpl implements the PropertyRepository interface using GORM
type PropertyRepositoryImpl struct {
	db *gorm.DB
}

// NewPropertyRepository creates a new PropertyRepositoryImpl
func NewPropertyRepository(db *gorm.DB) *PropertyRepositoryImpl {
	ValidateDB(db, "PropertyRepository")
	return &PropertyRepositoryImpl{db: db}
}

// Create inserts a new property into the database
func (r *PropertyRepositoryImpl) Create(ctx context.Context, property *models.Property) error {
	if err := r.db.WithContext(ctx).Create(property).Error; err != nil {
		return fmt.Errorf("failed to create property: %w", err)
	}
	return nil
}

// FindByID retrieves a property by ID (tenant-scoped)
func (r *PropertyRepositoryImpl) FindByID(ctx context.Context, tenantID uuid.UUID, propertyID uuid.UUID) (*models.Property, error) {
	var property models.Property
	if err := r.db.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", propertyID, tenantID).
		First(&property).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("property not found: %w", err)
		}
		return nil, fmt.Errorf("failed to find property: %w", err)
	}
	return &property, nil
}

// FindAll retrieves all properties for a tenant with pagination
func (r *PropertyRepositoryImpl) FindAll(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]models.Property, int64, error) {
	var properties []models.Property
	var total int64

	// Get total count
	if err := r.db.WithContext(ctx).
		Model(&models.Property{}).
		Where("tenant_id = ?", tenantID).
		Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count properties: %w", err)
	}

	// Get paginated results
	if err := r.db.WithContext(ctx).
		Where("tenant_id = ?", tenantID).
		Limit(limit).
		Offset(offset).
		Find(&properties).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to find properties: %w", err)
	}

	return properties, total, nil
}

// Update updates an existing property's fields
func (r *PropertyRepositoryImpl) Update(ctx context.Context, property *models.Property) error {
	if err := r.db.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", property.ID, property.TenantID).
		Updates(property).Error; err != nil {
		return fmt.Errorf("failed to update property: %w", err)
	}
	return nil
}

// Delete soft-deletes a property by ID (tenant-scoped)
func (r *PropertyRepositoryImpl) Delete(ctx context.Context, tenantID uuid.UUID, propertyID uuid.UUID) error {
	if err := r.db.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", propertyID, tenantID).
		Delete(&models.Property{}).Error; err != nil {
		return fmt.Errorf("failed to delete property: %w", err)
	}
	return nil
}

// SearchNearby searches for properties within a radius of a given location
// Uses PostGIS ST_DWithin for efficient geospatial queries
// radiusMeters: search radius in meters
func (r *PropertyRepositoryImpl) SearchNearby(ctx context.Context, tenantID uuid.UUID, latitude, longitude float64, radiusMeters float64) ([]models.Property, error) {
	var properties []models.Property

	// Using PostGIS ST_DWithin for geospatial search
	// ST_DWithin returns true if geometries are within specified distance
	// geography type automatically handles meters as distance unit
	query := `
		SELECT * FROM properties 
		WHERE tenant_id = ? 
		AND ST_DWithin(
			location::geography,
			ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography,
			?
		)
		AND deleted_at IS NULL
	`

	if err := r.db.WithContext(ctx).
		Raw(query, tenantID, longitude, latitude, radiusMeters).
		Scan(&properties).Error; err != nil {
		return nil, fmt.Errorf("failed to search nearby properties: %w", err)
	}

	return properties, nil
}

// GetPropertiesByOwnerID retrieves all properties owned by a specific user
func (r *PropertyRepositoryImpl) GetPropertiesByOwnerID(ctx context.Context, tenantID uuid.UUID, ownerID uuid.UUID) ([]models.Property, error) {
	var properties []models.Property

	if err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND owner_id = ?", tenantID, ownerID).
		Find(&properties).Error; err != nil {
		return nil, fmt.Errorf("failed to get properties by owner: %w", err)
	}

	return properties, nil
}

// GetPropertiesByStatus retrieves all properties with a specific status
func (r *PropertyRepositoryImpl) GetPropertiesByStatus(ctx context.Context, tenantID uuid.UUID, status string) ([]models.Property, error) {
	var properties []models.Property

	if err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND status = ?", tenantID, status).
		Find(&properties).Error; err != nil {
		return nil, fmt.Errorf("failed to get properties by status: %w", err)
	}

	return properties, nil
}

// UpdatePropertyLocation updates the geospatial coordinates of a property
func (r *PropertyRepositoryImpl) UpdatePropertyLocation(ctx context.Context, propertyID uuid.UUID, latitude, longitude float64) error {
	// Using PostGIS ST_SetSRID and ST_MakePoint to create a proper geometry
	query := `
		UPDATE properties 
		SET location = ST_SetSRID(ST_MakePoint(?, ?), 4326)
		WHERE id = ?
	`

	if err := r.db.WithContext(ctx).Exec(query, longitude, latitude, propertyID).Error; err != nil {
		return fmt.Errorf("failed to update property location: %w", err)
	}

	return nil
}
