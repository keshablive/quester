package models

import (
	"database/sql/driver"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

// PropertyType represents the type of property
type PropertyType string

const (
	PropertyTypeResidential PropertyType = "residential"
	PropertyTypeCommercial  PropertyType = "commercial"
	PropertyTypeLand        PropertyType = "land"
	PropertyTypeIndustrial  PropertyType = "industrial"
)

// PropertyStatus represents the current status of a property listing
type PropertyStatus string

const (
	PropertyStatusDraft     PropertyStatus = "draft"
	PropertyStatusActive    PropertyStatus = "active"
	PropertyStatusSold      PropertyStatus = "sold"
	PropertyStatusRented    PropertyStatus = "rented"
	PropertyStatusExpired   PropertyStatus = "expired"
	PropertyStatusSuspended PropertyStatus = "suspended"
)

// Point represents a geographic coordinate (GeoJSON format for PostGIS)
type Point struct {
	Type        string    `json:"type"`
	Coordinates []float64 `json:"coordinates"` // [longitude, latitude]
}

// Scan implements sql.Scanner for PostGIS GEOGRAPHY type
func (p *Point) Scan(value interface{}) error {
	if value == nil {
		return nil
	}
	// PostGIS returns WKB (Well-Known Binary) format
	// This is a simplified implementation - in production, use paulmach/orb or twpayne/go-geom
	return nil
}

// Value implements driver.Valuer for PostGIS GEOGRAPHY type
func (p Point) Value() (driver.Value, error) {
	// Convert to PostGIS format: ST_GeogFromText('POINT(lng lat)')
	if len(p.Coordinates) != 2 {
		return nil, nil
	}
	return p, nil
}

// Address represents a structured address
type Address struct {
	Street     string `json:"street"`
	City       string `json:"city"`
	State      string `json:"state"`
	PostalCode string `json:"postal_code"`
	Country    string `json:"country"`
}

// Document represents an uploaded document for verification
type Document struct {
	ID                 string    `json:"id"`
	Type               string    `json:"type"` // ownership_proof, id_card, tax_receipt, etc.
	URL                string    `json:"url"`
	UploadedAt         time.Time `json:"uploaded_at"`
	VerificationStatus string    `json:"verification_status"` // pending, verified, rejected
	OCRConfidence      float64   `json:"ocr_confidence"`
	OCRText            string    `json:"ocr_text"`
	RejectionReason    string    `json:"rejection_reason,omitempty"`
}

// Property represents a real estate listing
type Property struct {
	ID           uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID     uuid.UUID      `gorm:"type:uuid;not null;index:idx_property_tenant" json:"tenant_id"`
	OwnerID      uuid.UUID      `gorm:"type:uuid;not null;index:idx_property_owner" json:"owner_id"`
	Title        string         `gorm:"not null;type:varchar(200)" json:"title"`
	Description  string         `gorm:"type:text" json:"description"`
	PropertyType PropertyType   `gorm:"not null;type:varchar(50);index:idx_property_type" json:"property_type"`
	ListingType  ListingType    `gorm:"not null;type:varchar(50)" json:"listing_type"`
	Status       PropertyStatus `gorm:"not null;default:'draft';index:idx_property_status" json:"status"`

	// Location (PostGIS GEOGRAPHY type)
	Location Point   `gorm:"type:geography(POINT,4326);index:,type:gist" json:"location"`
	Address  Address `gorm:"type:jsonb" json:"address"`

	// Pricing
	Price    float64 `gorm:"not null" json:"price"`
	Currency string  `gorm:"not null;default:'INR';type:varchar(3)" json:"currency"`

	// Property Details
	Bedrooms  *int     `json:"bedrooms,omitempty"`
	Bathrooms *int     `json:"bathrooms,omitempty"`
	AreaSqFt  *float64 `json:"area_sqft,omitempty"`
	YearBuilt *int     `json:"year_built,omitempty"`

	// Media
	Images          pq.StringArray `gorm:"type:text[]" json:"images"`
	VirtualTourURLs pq.StringArray `gorm:"type:text[]" json:"virtual_tour_urls"` // 360° photo URLs

	// Documents & Verification
	Documents         json.RawMessage `gorm:"type:jsonb" json:"documents"`         // Array of Document
	VerificationScore float64         `gorm:"default:0" json:"verification_score"` // AI confidence 0-100
	VerifiedAt        *time.Time      `json:"verified_at,omitempty"`

	// Metadata
	Amenities pq.StringArray  `gorm:"type:text[]" json:"amenities"`
	Tags      pq.StringArray  `gorm:"type:text[]" json:"tags"`
	Metadata  json.RawMessage `gorm:"type:jsonb" json:"metadata"`

	// Statistics
	ViewCount     int `gorm:"default:0" json:"view_count"`
	ContactCount  int `gorm:"default:0" json:"contact_count"`
	FavoriteCount int `gorm:"default:0" json:"favorite_count"`

	// Expiration
	PublishedAt *time.Time `json:"published_at,omitempty"`
	ExpiresAt   *time.Time `gorm:"index:idx_property_expires" json:"expires_at,omitempty"` // 90 days from publish

	// Relationships
	Owner *User `gorm:"foreignKey:OwnerID" json:"owner,omitempty"`

	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
	DeletedAt *time.Time `gorm:"index" json:"deleted_at,omitempty"`
}

// TableName overrides the table name
func (Property) TableName() string {
	return "properties"
}

// IsExpired checks if the property listing has expired
func (p *Property) IsExpired() bool {
	if p.ExpiresAt == nil {
		return false
	}
	return time.Now().After(*p.ExpiresAt)
}

// IsVerified checks if documents are verified
func (p *Property) IsVerified() bool {
	return p.VerifiedAt != nil && p.VerificationScore >= 70.0
}

// CalculateDistance calculates distance from given point (in meters)
// This is a placeholder - actual calculation done via PostGIS ST_Distance
func (p *Property) CalculateDistance(lat, lng float64) float64 {
	// Use PostGIS query: ST_Distance(location, ST_GeogFromText('POINT(lng lat)'))
	return 0
}

// SetExpirationDate sets expiration to 90 days from now
func (p *Property) SetExpirationDate() {
	expiresAt := time.Now().Add(90 * 24 * time.Hour)
	p.ExpiresAt = &expiresAt
}

// IncrementViewCount increments the view counter
func (p *Property) IncrementViewCount() {
	p.ViewCount++
}

// IncrementContactCount increments the contact counter
func (p *Property) IncrementContactCount() {
	p.ContactCount++
}

// GetDocuments parses and returns the documents array
func (p *Property) GetDocuments() ([]Document, error) {
	var docs []Document
	if len(p.Documents) == 0 {
		return docs, nil
	}
	err := json.Unmarshal(p.Documents, &docs)
	return docs, err
}

// SetDocuments sets the documents array
func (p *Property) SetDocuments(docs []Document) error {
	data, err := json.Marshal(docs)
	if err != nil {
		return err
	}
	p.Documents = data
	return nil
}

// UpdateVerificationScore updates the verification score based on documents
func (p *Property) UpdateVerificationScore(score float64) {
	p.VerificationScore = score
	if score >= 70.0 {
		now := time.Now()
		p.VerifiedAt = &now
	} else {
		p.VerifiedAt = nil
	}
}
