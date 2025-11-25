package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// ListingType represents the type of marketplace listing
type ListingType string

const (
	ListingTypeCourse       ListingType = "course"
	ListingTypeQuest        ListingType = "quest"
	ListingTypeBadge        ListingType = "badge"
	ListingTypeDigitalGood  ListingType = "digital_good"
	ListingTypePhysicalGood ListingType = "physical_good"
	ListingTypeService      ListingType = "service"
)

// ListingStatus represents the status of a marketplace listing
type ListingStatus string

const (
	ListingStatusDraft     ListingStatus = "draft"
	ListingStatusActive    ListingStatus = "active"
	ListingStatusSoldOut   ListingStatus = "sold_out"
	ListingStatusSuspended ListingStatus = "suspended"
	ListingStatusDeleted   ListingStatus = "deleted"
)

// MarketplaceListing represents a product or service listed in the marketplace
type MarketplaceListing struct {
	ID       uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID uuid.UUID `gorm:"type:uuid;not null;index:idx_marketplace_listings_tenant" json:"tenant_id"`
	SellerID uuid.UUID `gorm:"type:uuid;not null;index:idx_marketplace_listings_seller" json:"seller_id"`
	Seller   *User     `gorm:"foreignKey:SellerID" json:"seller,omitempty"`

	// Listing details
	Title       string        `gorm:"type:varchar(255);not null" json:"title"`
	Description string        `gorm:"type:text" json:"description"`
	ListingType ListingType   `gorm:"type:varchar(50);not null;index:idx_marketplace_listings_type" json:"listing_type"`
	Status      ListingStatus `gorm:"type:varchar(20);not null;default:'draft';index:idx_marketplace_listings_status" json:"status"`

	// Pricing
	Price          float64 `gorm:"type:decimal(10,2);not null" json:"price"`
	Currency       string  `gorm:"type:varchar(3);not null;default:'INR'" json:"currency"`          // ISO 4217 currency code
	CommissionRate float64 `gorm:"type:decimal(5,2);not null;default:10.00" json:"commission_rate"` // Platform commission percentage

	// Inventory (for physical goods)
	Quantity  *int `gorm:"type:int" json:"quantity,omitempty"` // null for digital goods
	SoldCount int  `gorm:"type:int;not null;default:0" json:"sold_count"`

	// References (for linked content)
	CourseID *uuid.UUID `gorm:"type:uuid;index:idx_marketplace_listings_course" json:"course_id,omitempty"`
	Course   *Course    `gorm:"foreignKey:CourseID" json:"course,omitempty"`
	QuestID  *uuid.UUID `gorm:"type:uuid;index:idx_marketplace_listings_quest" json:"quest_id,omitempty"`
	Quest    *Quest     `gorm:"foreignKey:QuestID" json:"quest,omitempty"`
	BadgeID  *uuid.UUID `gorm:"type:uuid;index:idx_marketplace_listings_badge" json:"badge_id,omitempty"`
	Badge    *Badge     `gorm:"foreignKey:BadgeID" json:"badge,omitempty"`

	// Media
	ImageURLs datatypes.JSON `gorm:"type:jsonb" json:"image_urls"` // Array of image URLs
	VideoURL  string         `gorm:"type:varchar(500)" json:"video_url,omitempty"`

	// Metadata
	Tags     datatypes.JSON `gorm:"type:jsonb" json:"tags"`     // Array of tags for search
	Metadata datatypes.JSON `gorm:"type:jsonb" json:"metadata"` // Additional metadata

	// Ratings
	AverageRating float64 `gorm:"type:decimal(3,2);default:0.00" json:"average_rating"`
	TotalReviews  int     `gorm:"type:int;default:0" json:"total_reviews"`

	// Timestamps
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
	PublishedAt *time.Time     `json:"published_at,omitempty"`
}

// TableName overrides the table name
func (MarketplaceListing) TableName() string {
	return "marketplace_listings"
}

// BeforeCreate hook to set defaults
func (ml *MarketplaceListing) BeforeCreate(tx *gorm.DB) error {
	// Set published_at when status is active
	if ml.Status == ListingStatusActive && ml.PublishedAt == nil {
		now := time.Now()
		ml.PublishedAt = &now
	}

	// Set default currency if not provided
	if ml.Currency == "" {
		ml.Currency = "INR"
	}

	// Set default commission rate if not provided
	if ml.CommissionRate == 0 {
		ml.CommissionRate = 10.00
	}

	return nil
}

// BeforeUpdate hook to handle status changes
func (ml *MarketplaceListing) BeforeUpdate(tx *gorm.DB) error {
	// Set published_at when transitioning to active status
	if ml.Status == ListingStatusActive && ml.PublishedAt == nil {
		now := time.Now()
		ml.PublishedAt = &now
	}

	return nil
}

// IsAvailable checks if the listing is available for purchase
func (ml *MarketplaceListing) IsAvailable() bool {
	if ml.Status != ListingStatusActive {
		return false
	}

	// Check inventory for physical goods
	if ml.Quantity != nil && *ml.Quantity <= 0 {
		return false
	}

	return true
}

// CalculateCommission calculates the platform commission amount
func (ml *MarketplaceListing) CalculateCommission() float64 {
	return ml.Price * (ml.CommissionRate / 100.0)
}

// CalculateSellerPayout calculates the amount the seller receives
func (ml *MarketplaceListing) CalculateSellerPayout() float64 {
	return ml.Price - ml.CalculateCommission()
}

// DecrementQuantity decrements the quantity (for physical goods)
func (ml *MarketplaceListing) DecrementQuantity(tx *gorm.DB) error {
	if ml.Quantity == nil {
		return nil // Digital goods have unlimited quantity
	}

	if *ml.Quantity <= 0 {
		return gorm.ErrRecordNotFound
	}

	*ml.Quantity--
	ml.SoldCount++

	// Mark as sold out if quantity reaches zero
	if *ml.Quantity == 0 {
		ml.Status = ListingStatusSoldOut
	}

	return tx.Save(ml).Error
}
