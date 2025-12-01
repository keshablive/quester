package repository

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/models"
	"gorm.io/gorm"
)

// RefreshTokenRepository handles refresh token CRUD operations
type RefreshTokenRepository struct {
	db *gorm.DB
}

// NewRefreshTokenRepository creates a new refresh token repository
func NewRefreshTokenRepository(db *gorm.DB) *RefreshTokenRepository {
	return &RefreshTokenRepository{db: db}
}

// CreateToken creates a new refresh token in the database
func (r *RefreshTokenRepository) CreateToken(ctx context.Context, token *models.RefreshToken) error {
	if token == nil {
		return errors.New("token cannot be nil")
	}

	result := r.db.WithContext(ctx).Create(token)
	if result.Error != nil {
		return result.Error
	}

	return nil
}

// FindByToken retrieves a refresh token by its hash
func (r *RefreshTokenRepository) FindByToken(ctx context.Context, tokenHash string) (*models.RefreshToken, error) {
	if tokenHash == "" {
		return nil, errors.New("token hash cannot be empty")
	}

	var token models.RefreshToken
	result := r.db.WithContext(ctx).
		Where("token_hash = ?", tokenHash).
		First(&token)

	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, errors.New("refresh token not found")
		}
		return nil, result.Error
	}

	return &token, nil
}

// RevokeToken marks a refresh token as revoked
func (r *RefreshTokenRepository) RevokeToken(ctx context.Context, tokenHash string) error {
	if tokenHash == "" {
		return errors.New("token hash cannot be empty")
	}

	now := time.Now()
	result := r.db.WithContext(ctx).
		Model(&models.RefreshToken{}).
		Where("token_hash = ?", tokenHash).
		Update("revoked_at", now)

	if result.Error != nil {
		return result.Error
	}

	if result.RowsAffected == 0 {
		return errors.New("refresh token not found")
	}

	return nil
}

// DeleteExpiredTokens removes all expired AND revoked refresh tokens from the database
// This ensures we only cleanup tokens that are both expired and explicitly revoked
// Batch processing limits to 1000 tokens per run to avoid long-running transactions
func (r *RefreshTokenRepository) DeleteExpiredTokens(ctx context.Context) (int64, error) {
	now := time.Now()
	result := r.db.WithContext(ctx).
		Where("expires_at < ?", now).
		Where("revoked_at IS NOT NULL"). // Only delete explicitly revoked tokens
		Limit(1000).                     // Batch processing limit (T082)
		Delete(&models.RefreshToken{})

	if result.Error != nil {
		return 0, result.Error
	}

	return result.RowsAffected, nil
}

// DeleteUserTokens deletes all refresh tokens for a specific user
func (r *RefreshTokenRepository) DeleteUserTokens(ctx context.Context, userID uuid.UUID) error {
	if userID == uuid.Nil {
		return errors.New("user ID cannot be nil")
	}

	result := r.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Delete(&models.RefreshToken{})

	if result.Error != nil {
		return result.Error
	}

	return nil
}

// RevokeAllByUserID revokes all active refresh tokens for a specific user
func (r *RefreshTokenRepository) RevokeAllByUserID(ctx context.Context, userID uuid.UUID) (int, error) {
	if userID == uuid.Nil {
		return 0, errors.New("user ID cannot be nil")
	}

	now := time.Now()
	result := r.db.WithContext(ctx).
		Model(&models.RefreshToken{}).
		Where("user_id = ? AND revoked_at IS NULL", userID).
		Update("revoked_at", now)

	if result.Error != nil {
		return 0, result.Error
	}

	return int(result.RowsAffected), nil
}

// GetActiveTokens retrieves active (not expired, not revoked) refresh tokens for a user (T085, FR-032)
// Returns paginated results ordered by created_at DESC (newest first)
func (r *RefreshTokenRepository) GetActiveTokens(ctx context.Context, userID uuid.UUID, limit, offset int) ([]models.RefreshToken, int64, error) {
	if userID == uuid.Nil {
		return nil, 0, errors.New("user ID cannot be nil")
	}

	var tokens []models.RefreshToken
	var total int64

	now := time.Now()

	// Count total active tokens for this user
	countQuery := r.db.WithContext(ctx).
		Model(&models.RefreshToken{}).
		Where("user_id = ?", userID).
		Where("revoked_at IS NULL").
		Where("expires_at > ?", now)

	if err := countQuery.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	query := r.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Where("revoked_at IS NULL").
		Where("expires_at > ?", now).
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&tokens)

	if query.Error != nil {
		return nil, 0, query.Error
	}

	return tokens, total, nil
}
