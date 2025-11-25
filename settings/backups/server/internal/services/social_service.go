package services

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"

	"github.com/yourusername/quester/internal/models"
	"github.com/yourusername/quester/internal/repositories"
)

// SocialService handles social interaction business logic (likes, comments, shares)
type SocialService struct {
	likeRepo     *repositories.LikeRepository
	commentRepo  *repositories.CommentRepository
	postRepo     *repositories.PostRepository
	activityRepo *repositories.ActivityRepository
	userRepo     *repositories.UserRepository
	notifService *NotificationService
}

// NewSocialService creates a new SocialService
func NewSocialService(
	likeRepo *repositories.LikeRepository,
	commentRepo *repositories.CommentRepository,
	postRepo *repositories.PostRepository,
	activityRepo *repositories.ActivityRepository,
	userRepo *repositories.UserRepository,
	notifService *NotificationService,
) *SocialService {
	return &SocialService{
		likeRepo:     likeRepo,
		commentRepo:  commentRepo,
		postRepo:     postRepo,
		activityRepo: activityRepo,
		userRepo:     userRepo,
		notifService: notifService,
	}
}

// LikePost adds a like to a post
func (s *SocialService) LikePost(ctx context.Context, userID, postID, tenantID uuid.UUID) error {
	// Check if already liked
	isLiked, err := s.likeRepo.IsLiked(ctx, userID, postID, tenantID)
	if err != nil {
		return err
	}
	if isLiked {
		return errors.New("already liked this post")
	}

	// Get post to get author ID
	post, err := s.postRepo.FindByID(ctx, postID, tenantID)
	if err != nil {
		return err
	}
	// Create like
	like := &models.Like{
		ID:        uuid.New(),
		TenantID:  tenantID,
		UserID:    userID,
		PostID:    postID,
		CreatedAt: time.Now(),
	}

	if err := s.likeRepo.Create(ctx, like); err != nil {
		return err
	}

	// Increment post like count
	_ = s.postRepo.IncrementLikeCount(ctx, postID, tenantID)

	// Create activity entry
	activity := &models.Activity{
		ID:           uuid.New(),
		TenantID:     tenantID,
		UserID:       userID,
		ActivityType: models.ActivityPostLiked,
		EntityType:   "post",
		EntityID:     postID,
		CreatedAt:    time.Now(),
	}
	_ = s.activityRepo.Create(ctx, activity)

	// Send notification to post author (if not self-like)
	if s.notifService != nil && userID != post.UserID {
		// Get user name for notification
		actorName := "Someone"
		if user, err := s.userRepo.FindByID(ctx, userID); err == nil && user != nil {
			actorName = user.Username
		}

		go func() {
			// Use background context to avoid cancellation when request completes
			bgCtx := context.Background()
			if err := s.notifService.SendSocialNotification(bgCtx, tenantID, post.UserID, actorName, "like", "post", uint(postID.ID())); err != nil {
				// Log error but don't fail the like operation
			}
		}()
	}

	return nil
}

// UnlikePost removes a like from a post
func (s *SocialService) UnlikePost(ctx context.Context, userID, postID, tenantID uuid.UUID) error {
	// Check if liked
	isLiked, err := s.likeRepo.IsLiked(ctx, userID, postID, tenantID)
	if err != nil {
		return err
	}
	if !isLiked {
		return errors.New("post not liked")
	}

	// Delete like
	if err := s.likeRepo.Delete(ctx, userID, postID, tenantID); err != nil {
		return err
	}

	// Decrement post like count
	_ = s.postRepo.DecrementLikeCount(ctx, postID, tenantID)

	return nil
}

// IsPostLiked checks if a user has liked a post
func (s *SocialService) IsPostLiked(ctx context.Context, userID, postID, tenantID uuid.UUID) (bool, error) {
	return s.likeRepo.IsLiked(ctx, userID, postID, tenantID)
}

// GetPostLikes gets users who liked a post
func (s *SocialService) GetPostLikes(ctx context.Context, postID, tenantID uuid.UUID, page, limit int) ([]models.User, int64, error) {
	return s.likeRepo.GetLikers(ctx, postID, tenantID, page, limit)
}

// AddComment adds a comment to a post
func (s *SocialService) AddComment(ctx context.Context, userID, postID, tenantID uuid.UUID, content string, parentID *uuid.UUID) (*models.Comment, error) {
	if content == "" {
		return nil, errors.New("comment content required")
	}

	// Get post to get author ID
	post, err := s.postRepo.FindByID(ctx, postID, tenantID)
	if err != nil {
		return nil, err
	}
	// If replying, verify parent comment exists
	if parentID != nil {
		_, err := s.commentRepo.FindByID(ctx, *parentID, tenantID)
		if err != nil {
			return nil, errors.New("parent comment not found")
		}
	}

	// Create comment
	comment := &models.Comment{
		ID:        uuid.New(),
		TenantID:  tenantID,
		PostID:    postID,
		UserID:    userID,
		ParentID:  parentID,
		Content:   content,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := s.commentRepo.Create(ctx, comment); err != nil {
		return nil, err
	}

	// Increment post comment count (only for top-level comments)
	if parentID == nil {
		_ = s.postRepo.IncrementCommentCount(ctx, postID, tenantID)
	}

	// Create activity entry
	activity := &models.Activity{
		ID:           uuid.New(),
		TenantID:     tenantID,
		UserID:       userID,
		ActivityType: models.ActivityPostCommented,
		EntityType:   "post",
		EntityID:     postID,
		Metadata: map[string]interface{}{
			"content": content,
		},
		CreatedAt: time.Now(),
	}
	_ = s.activityRepo.Create(ctx, activity)

	// Send notification to post author (if not self-comment)
	if s.notifService != nil && userID != post.UserID {
		actorName := "Someone"
		if user, err := s.userRepo.FindByID(ctx, userID); err == nil && user != nil {
			actorName = user.Username
		}

		go func() {
			bgCtx := context.Background()
			if err := s.notifService.SendSocialNotification(bgCtx, tenantID, post.UserID, actorName, "comment", "post", uint(postID.ID())); err != nil {
				// Log error but don't fail the comment operation
			}
		}()
	}

	return comment, nil
}

// UpdateComment updates a comment
func (s *SocialService) UpdateComment(ctx context.Context, commentID, userID, tenantID uuid.UUID, content string) (*models.Comment, error) {
	if content == "" {
		return nil, errors.New("comment content required")
	}

	// Get comment to check ownership
	comment, err := s.commentRepo.FindByID(ctx, commentID, tenantID)
	if err != nil {
		return nil, err
	}

	// Check ownership
	if comment.UserID != userID {
		return nil, errors.New("unauthorized")
	}

	// Update comment
	comment.Content = content
	comment.UpdatedAt = time.Now()

	if err := s.commentRepo.Update(ctx, comment); err != nil {
		return nil, err
	}

	return comment, nil
}

// DeleteComment deletes a comment
func (s *SocialService) DeleteComment(ctx context.Context, commentID, userID, tenantID uuid.UUID) error {
	// Get comment to check ownership
	comment, err := s.commentRepo.FindByID(ctx, commentID, tenantID)
	if err != nil {
		return err
	}

	// Check ownership
	if comment.UserID != userID {
		return errors.New("unauthorized")
	}

	// Delete comment
	if err := s.commentRepo.Delete(ctx, commentID, tenantID); err != nil {
		return err
	}

	// Decrement post comment count (only for top-level comments)
	if comment.ParentID == nil {
		_ = s.postRepo.DecrementCommentCount(ctx, comment.PostID, tenantID)
	}

	return nil
}

// GetPostComments gets top-level comments for a post
func (s *SocialService) GetPostComments(ctx context.Context, postID, tenantID uuid.UUID, page, limit int) ([]models.Comment, int64, error) {
	return s.commentRepo.GetPostComments(ctx, postID, tenantID, page, limit)
}

// GetCommentReplies gets replies to a comment
func (s *SocialService) GetCommentReplies(ctx context.Context, commentID, tenantID uuid.UUID, page, limit int) ([]models.Comment, int64, error) {
	return s.commentRepo.GetCommentReplies(ctx, commentID, tenantID, page, limit)
}

// SharePost increments the share count for a post
func (s *SocialService) SharePost(ctx context.Context, userID, postID, tenantID uuid.UUID) error {
	// Get post
	post, err := s.postRepo.FindByID(ctx, postID, tenantID)
	if err != nil {
		return err
	}
	// Increment share count
	if err := s.postRepo.IncrementShareCount(ctx, postID, tenantID); err != nil {
		return err
	}

	// Create activity entry
	activity := &models.Activity{
		ID:           uuid.New(),
		TenantID:     tenantID,
		UserID:       userID,
		ActivityType: models.ActivityPostShared,
		EntityType:   "post",
		EntityID:     postID,
		CreatedAt:    time.Now(),
	}
	_ = s.activityRepo.Create(ctx, activity)

	// Send notification to post author (if not self-share)
	if s.notifService != nil && userID != post.UserID {
		actorName := "Someone"
		if user, err := s.userRepo.FindByID(ctx, userID); err == nil && user != nil {
			actorName = user.Username
		}

		go func() {
			bgCtx := context.Background()
			if err := s.notifService.SendSocialNotification(bgCtx, tenantID, post.UserID, actorName, "share", "post", uint(postID.ID())); err != nil {
				// Log error but don't fail the share operation
			}
		}()
	}

	return nil
}
