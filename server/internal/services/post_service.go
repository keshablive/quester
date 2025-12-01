package services

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"

	"github.com/keshablive/quester/internal/models"
	"github.com/keshablive/quester/internal/repositories"
)

// PostService handles post-related business logic
type PostService struct {
	postRepo     *repositories.PostRepository
	activityRepo *repositories.ActivityRepository
	followRepo   *repositories.FollowRepository
}

// NewPostService creates a new PostService
func NewPostService(
	postRepo *repositories.PostRepository,
	activityRepo *repositories.ActivityRepository,
	followRepo *repositories.FollowRepository,
) *PostService {
	return &PostService{
		postRepo:     postRepo,
		activityRepo: activityRepo,
		followRepo:   followRepo,
	}
}

// CreatePost creates a new post
func (s *PostService) CreatePost(ctx context.Context, userID, tenantID uuid.UUID, content, mediaType, mediaURL, visibility string) (*models.Post, error) {
	// Validate media type
	if mediaType != string(models.MediaTypeText) && mediaType != string(models.MediaTypeImage) && mediaType != string(models.MediaTypeVideo) {
		return nil, errors.New("invalid media type")
	}

	// Validate visibility
	if visibility != string(models.VisibilityPublic) && visibility != string(models.VisibilityFollowers) && visibility != string(models.VisibilityPrivate) {
		return nil, errors.New("invalid visibility")
	}

	// Validate media URL for image/video posts
	if (mediaType == string(models.MediaTypeImage) || mediaType == string(models.MediaTypeVideo)) && mediaURL == "" {
		return nil, errors.New("media URL required for image/video posts")
	}

	// Create post
	post := &models.Post{
		ID:           uuid.New(),
		TenantID:     tenantID,
		UserID:       userID,
		Content:      content,
		MediaType:    models.MediaType(mediaType),
		MediaURL:     mediaURL,
		Visibility:   models.Visibility(visibility),
		LikeCount:    0,
		CommentCount: 0,
		ShareCount:   0,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if err := s.postRepo.Create(ctx, post); err != nil {
		return nil, err
	}

	// Create activity entry
	activity := &models.Activity{
		ID:           uuid.New(),
		TenantID:     tenantID,
		UserID:       userID,
		ActivityType: models.ActivityPostCreated,
		EntityType:   "post",
		EntityID:     post.ID,
		Metadata: map[string]interface{}{
			"content":    content,
			"media_type": mediaType,
			"visibility": visibility,
		},
		CreatedAt: time.Now(),
	}
	_ = s.activityRepo.Create(ctx, activity) // Log error but don't fail

	return post, nil
}

// GetPost gets a post by ID
func (s *PostService) GetPost(ctx context.Context, postID, tenantID uuid.UUID, viewerID *uuid.UUID) (*models.Post, error) {
	post, err := s.postRepo.FindByID(ctx, postID, tenantID)
	if err != nil {
		return nil, err
	}

	// Check visibility permissions
	if post.Visibility == models.VisibilityPrivate && (viewerID == nil || *viewerID != post.UserID) {
		return nil, errors.New("post not found")
	}

	if post.Visibility == models.VisibilityFollowers && viewerID != nil {
		if *viewerID != post.UserID {
			isFollowing, err := s.followRepo.IsFollowing(ctx, *viewerID, post.UserID, tenantID)
			if err != nil || !isFollowing {
				return nil, errors.New("post not found")
			}
		}
	}

	return post, nil
}

// UpdatePost updates a post
func (s *PostService) UpdatePost(ctx context.Context, postID, userID, tenantID uuid.UUID, content, visibility string) (*models.Post, error) {
	// Get existing post
	post, err := s.postRepo.FindByID(ctx, postID, tenantID)
	if err != nil {
		return nil, err
	}

	// Check ownership
	if post.UserID != userID {
		return nil, errors.New("unauthorized")
	}

	// Update fields
	if content != "" {
		post.Content = content
	}
	if visibility != "" {
		if visibility != string(models.VisibilityPublic) && visibility != string(models.VisibilityFollowers) && visibility != string(models.VisibilityPrivate) {
			return nil, errors.New("invalid visibility")
		}
		post.Visibility = models.Visibility(visibility)
	}
	post.UpdatedAt = time.Now()

	if err := s.postRepo.Update(ctx, post); err != nil {
		return nil, err
	}

	return post, nil
}

// DeletePost deletes a post
func (s *PostService) DeletePost(ctx context.Context, postID, userID, tenantID uuid.UUID) error {
	// Get post to check ownership
	post, err := s.postRepo.FindByID(ctx, postID, tenantID)
	if err != nil {
		return err
	}

	// Check ownership
	if post.UserID != userID {
		return errors.New("unauthorized")
	}

	// Delete post
	if err := s.postRepo.Delete(ctx, postID, tenantID); err != nil {
		return err
	}

	// Delete related activities
	_ = s.activityRepo.DeleteByEntity(ctx, "post", postID, tenantID)

	return nil
}

// GetUserPosts gets all posts by a specific user
func (s *PostService) GetUserPosts(ctx context.Context, userID, tenantID uuid.UUID, page, limit int) ([]models.Post, int64, error) {
	return s.postRepo.GetUserPosts(ctx, userID, tenantID, page, limit)
}

// GetPublicFeed gets all public posts
func (s *PostService) GetPublicFeed(ctx context.Context, tenantID uuid.UUID, page, limit int) ([]models.Post, int64, error) {
	return s.postRepo.GetPublicPosts(ctx, tenantID, page, limit)
}

// GetFollowingFeed gets posts from users that the specified user follows
func (s *PostService) GetFollowingFeed(ctx context.Context, userID, tenantID uuid.UUID, page, limit int) ([]models.Post, int64, error) {
	return s.postRepo.GetFollowingPosts(ctx, userID, tenantID, page, limit)
}

// SearchPosts searches posts by content
func (s *PostService) SearchPosts(ctx context.Context, query string, tenantID uuid.UUID, page, limit int) ([]models.Post, int64, error) {
	if query == "" {
		return nil, 0, errors.New("search query required")
	}
	return s.postRepo.SearchPosts(ctx, query, tenantID, page, limit)
}
