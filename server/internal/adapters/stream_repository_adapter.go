// Stream repository adapter implementing framework StreamRepository interface
package adapters

import (
	"context"
	"fmt"

	"gorm.io/gorm"

	"github.com/keshablive/quester/internal/framework/interfaces"
	"github.com/keshablive/quester/internal/models"
)

// StreamRepositoryAdapter wraps database operations and implements interfaces.StreamRepository
type StreamRepositoryAdapter struct {
	db *gorm.DB
}

// NewStreamRepositoryAdapter creates a new stream repository adapter
func NewStreamRepositoryAdapter(db *gorm.DB) *StreamRepositoryAdapter {
	return &StreamRepositoryAdapter{db: db}
}

// FindByID retrieves a stream by its unique identifier
func (r *StreamRepositoryAdapter) FindByID(ctx context.Context, streamID string) (interfaces.StreamInfo, error) {
	var stream models.VideoStream
	if err := r.db.WithContext(ctx).Where("id = ? AND deleted_at IS NULL", streamID).First(&stream).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("stream not found: %s", streamID)
		}
		return nil, fmt.Errorf("database error: %w", err)
	}
	return &stream, nil
}

// FindByStreamKey retrieves a stream by its stream key
func (r *StreamRepositoryAdapter) FindByStreamKey(ctx context.Context, streamKey string) (interfaces.StreamInfo, error) {
	var stream models.VideoStream
	if err := r.db.WithContext(ctx).Where("stream_key = ? AND deleted_at IS NULL", streamKey).First(&stream).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("stream not found with key")
		}
		return nil, fmt.Errorf("database error: %w", err)
	}
	return &stream, nil
}

// UpdateStatus changes the stream's status
func (r *StreamRepositoryAdapter) UpdateStatus(ctx context.Context, streamID string, status string) error {
	result := r.db.WithContext(ctx).Model(&models.VideoStream{}).
		Where("id = ?", streamID).
		Update("status", status)
	if result.Error != nil {
		return fmt.Errorf("failed to update status: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("stream not found: %s", streamID)
	}
	return nil
}

// Save persists changes to the stream
func (r *StreamRepositoryAdapter) Save(ctx context.Context, stream interfaces.StreamInfo) error {
	// Type assertion to get the underlying VideoStream
	videoStream, ok := stream.(*models.VideoStream)
	if !ok {
		return fmt.Errorf("invalid stream type: expected *models.VideoStream")
	}
	return r.db.WithContext(ctx).Save(videoStream).Error
}
