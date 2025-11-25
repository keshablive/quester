package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

// AdType represents the type of classified ad
type AdType string

const (
	AdTypeJob     AdType = "job"
	AdTypeService AdType = "service"
	AdTypeItem    AdType = "item"
	AdTypeHousing AdType = "housing"
	AdTypeEvent   AdType = "event"
)

// AdStatus represents the current status of a classified ad
type AdStatus string

const (
	AdStatusDraft     AdStatus = "draft"
	AdStatusActive    AdStatus = "active"
	AdStatusSold      AdStatus = "sold"
	AdStatusExpired   AdStatus = "expired"
	AdStatusSuspended AdStatus = "suspended"
)

// ContactMethod represents how users can contact the ad poster
type ContactMethod string

const (
	ContactMethodEmail ContactMethod = "email"
	ContactMethodPhone ContactMethod = "phone"
	ContactMethodChat  ContactMethod = "chat"
)

// ClassifiedAd represents a classified advertisement listing
type ClassifiedAd struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID    uuid.UUID `gorm:"type:uuid;not null;index:idx_classifiedAd_tenant" json:"tenant_id"`
	PosterID    uuid.UUID `gorm:"type:uuid;not null;index:idx_classifiedAd_poster" json:"poster_id"`
	Title       string    `gorm:"not null;type:varchar(200)" json:"title"`
	Description string    `gorm:"type:text" json:"description"`
	AdType      AdType    `gorm:"not null;type:varchar(50);index:idx_classified_type" json:"ad_type"`
	Status      AdStatus  `gorm:"not null;default:'draft';index:idx_classified_status" json:"status"`

	// Pricing (optional for some ad types like events)
	Price     *float64 `json:"price,omitempty"`
	Currency  string   `gorm:"default:'INR';type:varchar(3)" json:"currency"`
	PriceType string   `gorm:"type:varchar(50)" json:"price_type"` // fixed, negotiable, free, hourly, monthly

	// Location (optional, can be null for remote jobs/services)
	Location     *Point `gorm:"type:geography(POINT,4326);index:,type:gist" json:"location,omitempty"`
	LocationText string `gorm:"type:varchar(200)" json:"location_text"` // Human-readable location

	// Images
	Images pq.StringArray `gorm:"type:text[]" json:"images"`

	// Contact Information
	ContactMethod ContactMethod `gorm:"not null;type:varchar(50)" json:"contact_method"`
	ContactInfo   string        `gorm:"type:varchar(200)" json:"contact_info"` // Encrypted phone/email

	// Category-specific fields (stored in JSONB for flexibility)
	CategoryData json.RawMessage `gorm:"type:jsonb" json:"category_data"`
	// Examples:
	// Job: {experience_level, employment_type, salary_range, company_name}
	// Service: {service_category, hourly_rate, availability}
	// Item: {condition, brand, model, warranty}

	// Metadata
	Tags     pq.StringArray `gorm:"type:text[]" json:"tags"`
	Keywords pq.StringArray `gorm:"type:text[]" json:"keywords"` // For search optimization

	// Statistics
	ViewCount     int `gorm:"default:0" json:"view_count"`
	ResponseCount int `gorm:"default:0" json:"response_count"`

	// Expiration
	PublishedAt *time.Time `json:"published_at,omitempty"`
	ExpiresAt   *time.Time `gorm:"index:idx_classified_expires" json:"expires_at,omitempty"` // 30 days from publish

	// Relationships
	Poster *User `gorm:"foreignKey:PosterID" json:"poster,omitempty"`

	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
	DeletedAt *time.Time `gorm:"index" json:"deleted_at,omitempty"`
}

// TableName overrides the table name
func (ClassifiedAd) TableName() string {
	return "classified_ads"
}

// IsExpired checks if the ad has expired
func (c *ClassifiedAd) IsExpired() bool {
	if c.ExpiresAt == nil {
		return false
	}
	return time.Now().After(*c.ExpiresAt)
}

// SetExpirationDate sets expiration to 30 days from now
func (c *ClassifiedAd) SetExpirationDate() {
	expiresAt := time.Now().Add(30 * 24 * time.Hour)
	c.ExpiresAt = &expiresAt
}

// IncrementViewCount increments the view counter
func (c *ClassifiedAd) IncrementViewCount() {
	c.ViewCount++
}

// IncrementResponseCount increments the response counter
func (c *ClassifiedAd) IncrementResponseCount() {
	c.ResponseCount++
}

// GetCategoryData parses and returns the category-specific data
func (c *ClassifiedAd) GetCategoryData() (map[string]interface{}, error) {
	var data map[string]interface{}
	if len(c.CategoryData) == 0 {
		return data, nil
	}
	err := json.Unmarshal(c.CategoryData, &data)
	return data, err
}

// SetCategoryData sets the category-specific data
func (c *ClassifiedAd) SetCategoryData(data map[string]interface{}) error {
	jsonData, err := json.Marshal(data)
	if err != nil {
		return err
	}
	c.CategoryData = jsonData
	return nil
}

// CanBeRenewed checks if the ad can be renewed (within 7 days of expiration)
func (c *ClassifiedAd) CanBeRenewed() bool {
	if c.ExpiresAt == nil {
		return false
	}
	daysUntilExpiration := time.Until(*c.ExpiresAt).Hours() / 24
	return daysUntilExpiration <= 7 && daysUntilExpiration >= 0
}

// RenewAd extends the expiration date by 30 days
func (c *ClassifiedAd) RenewAd() {
	if c.ExpiresAt == nil {
		c.SetExpirationDate()
	} else {
		newExpiration := c.ExpiresAt.Add(30 * 24 * time.Hour)
		c.ExpiresAt = &newExpiration
	}
}

// MarkAsSold marks the ad as sold/closed
func (c *ClassifiedAd) MarkAsSold() {
	c.Status = AdStatusSold
}
