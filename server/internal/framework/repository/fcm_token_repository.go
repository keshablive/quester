package repository

import (
	"context"

	"gorm.io/gorm"

	"github.com/keshablive/quester/internal/models"
)

// FCMTokenRepository handles FCM token data access
type FCMTokenRepository struct {
	db *gorm.DB
}

// NewFCMTokenRepository creates a new FCM token repository
func NewFCMTokenRepository(db *gorm.DB) *FCMTokenRepository {
	return &FCMTokenRepository{db: db}
}

// Create creates a new FCM token
func (r *FCMTokenRepository) Create(ctx context.Context, token *models.FCMToken) error {
	return r.db.WithContext(ctx).Create(token).Error
}

// FindByID finds an FCM token by ID
func (r *FCMTokenRepository) FindByID(ctx context.Context, id string) (*models.FCMToken, error) {
	var token models.FCMToken
	err := r.db.WithContext(ctx).
		Preload("User").
		First(&token, "id = ?", id).Error
	return &token, err
}

// FindByToken finds an FCM token by token string
func (r *FCMTokenRepository) FindByToken(ctx context.Context, token string) (*models.FCMToken, error) {
	var fcmToken models.FCMToken
	err := r.db.WithContext(ctx).
		Where("token = ?", token).
		First(&fcmToken).Error
	return &fcmToken, err
}

// Update updates an FCM token
func (r *FCMTokenRepository) Update(ctx context.Context, token *models.FCMToken) error {
	return r.db.WithContext(ctx).Save(token).Error
}

// Delete soft deletes an FCM token
func (r *FCMTokenRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&models.FCMToken{}, "id = ?", id).Error
}

// FindByUser finds all FCM tokens for a user
func (r *FCMTokenRepository) FindByUser(ctx context.Context, tenantID, userID string, activeOnly bool) ([]*models.FCMToken, error) {
	var tokens []*models.FCMToken

	query := r.db.WithContext(ctx).
		Where("tenant_id = ? AND user_id = ?", tenantID, userID)

	if activeOnly {
		query = query.Where("is_active = ?", true)
	}

	err := query.
		Order("created_at DESC").
		Find(&tokens).Error

	return tokens, err
}

// FindByDevice finds an FCM token by device ID
func (r *FCMTokenRepository) FindByDevice(ctx context.Context, deviceID string) (*models.FCMToken, error) {
	var token models.FCMToken
	err := r.db.WithContext(ctx).
		Where("device_id = ? AND is_active = ?", deviceID, true).
		First(&token).Error
	return &token, err
}

// DeactivateOldTokens deactivates all old tokens for a user except the current one
func (r *FCMTokenRepository) DeactivateOldTokens(ctx context.Context, userID, currentTokenID string) error {
	return r.db.WithContext(ctx).
		Model(&models.FCMToken{}).
		Where("user_id = ? AND id != ? AND is_active = ?", userID, currentTokenID, true).
		Update("is_active", false).Error
}
