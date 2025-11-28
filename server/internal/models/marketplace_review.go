package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// MarketplaceReview represents a review for a marketplace listing
type MarketplaceReview struct {
	ID       uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID uuid.UUID `gorm:"type:uuid;not null;index:idx_marketplace_reviews_tenant" json:"tenant_id"`

	// References
	ListingID     uuid.UUID           `gorm:"type:uuid;not null;index:idx_marketplace_reviews_listing" json:"listing_id"`
	Listing       *MarketplaceListing `gorm:"foreignKey:ListingID" json:"listing,omitempty"`
	TransactionID uuid.UUID           `gorm:"type:uuid;not null;uniqueIndex:uq_marketplace_reviews_transaction" json:"transaction_id"`
	Transaction   *Transaction        `gorm:"foreignKey:TransactionID" json:"transaction,omitempty"`
	ReviewerID    uuid.UUID           `gorm:"type:uuid;not null;index:idx_marketplace_reviews_reviewer" json:"reviewer_id"`
	Reviewer      *User               `gorm:"foreignKey:ReviewerID" json:"reviewer,omitempty"`

	// Review details
	Rating     int    `gorm:"not null;check:rating >= 1 AND rating <= 5" json:"rating"`
	Title      string `gorm:"type:varchar(255)" json:"title,omitempty"`
	ReviewText string `gorm:"type:text" json:"review_text,omitempty"`

	// Seller response
	SellerResponse    string     `gorm:"type:text" json:"seller_response,omitempty"`
	SellerRespondedAt *time.Time `json:"seller_responded_at,omitempty"`

	// Timestamps
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
}

// TableName overrides the table name
func (MarketplaceReview) TableName() string {
	return "marketplace_reviews"
}

// BeforeCreate hook to validate rating
func (mr *MarketplaceReview) BeforeCreate(tx *gorm.DB) error {
	if mr.Rating < 1 || mr.Rating > 5 {
		return gorm.ErrInvalidData
	}
	return nil
}

// BeforeUpdate hook to validate rating
func (mr *MarketplaceReview) BeforeUpdate(tx *gorm.DB) error {
	if mr.Rating < 1 || mr.Rating > 5 {
		return gorm.ErrInvalidData
	}
	return nil
}

// AddSellerResponse adds a seller response to the review
func (mr *MarketplaceReview) AddSellerResponse(tx *gorm.DB, response string) error {
	now := time.Now()
	mr.SellerResponse = response
	mr.SellerRespondedAt = &now

	return tx.Save(mr).Error
}
