package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/keshablive/quester/internal/framework/utils"
	"github.com/keshablive/quester/internal/models"
	"github.com/keshablive/quester/internal/repositories"
)

// SocialService handles social interaction business logic (likes, comments, shares, follows)
type SocialService struct {
	likeRepo     *repositories.LikeRepository
	commentRepo  *repositories.CommentRepository
	postRepo     *repositories.PostRepository
	activityRepo *repositories.ActivityRepository
	userRepo     *repositories.UserRepository
	followRepo   *repositories.FollowRepository
	notifService *NotificationService
	gamifService *SocialGamificationService // Social gamification for XP awards (005-social-feed-gamification)
}

// NewSocialService creates a new SocialService
func NewSocialService(
	likeRepo *repositories.LikeRepository,
	commentRepo *repositories.CommentRepository,
	postRepo *repositories.PostRepository,
	activityRepo *repositories.ActivityRepository,
	userRepo *repositories.UserRepository,
	followRepo *repositories.FollowRepository,
	notifService *NotificationService,
) *SocialService {
	return &SocialService{
		likeRepo:     likeRepo,
		commentRepo:  commentRepo,
		postRepo:     postRepo,
		activityRepo: activityRepo,
		userRepo:     userRepo,
		followRepo:   followRepo,
		notifService: notifService,
	}
}

// SetGamificationService sets the gamification service (for optional dependency injection)
func (s *SocialService) SetGamificationService(gamifService *SocialGamificationService) {
	s.gamifService = gamifService
}

// LikePost adds a like to a post
func (s *SocialService) LikePost(ctx context.Context, userID, postID, tenantID uuid.UUID) error {
	// Check if already liked
	isLiked, err := s.likeRepo.IsLiked(ctx, userID, postID, tenantID)
	if err != nil {
		return err
	}
	if isLiked {
		return utils.WrapAlreadyExistsError("like", postID)
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

	// Award XP for liking (FR-001, T022)
	if s.gamifService != nil {
		go func() {
			bgCtx := context.Background()
			_, _ = s.gamifService.AwardSocialXP(bgCtx, &XPAwardParams{
				TenantID:    tenantID,
				UserID:      userID,
				ActionType:  models.SocialActionLike,
				ContentType: "Post",
				ContentID:   postID,
				Description: fmt.Sprintf("Liked post by user %s", post.UserID),
			})
			// Check content milestones for author (FR-009)
			likeCount := post.LikeCount + 1 // Include this like
			_, _ = s.gamifService.CheckContentMilestones(bgCtx, tenantID, "Post", postID, post.UserID, likeCount)
		}()
	}

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
	// Check if post is actually liked
	isLiked, err := s.likeRepo.IsLiked(ctx, userID, postID, tenantID)
	if err != nil {
		return err
	}
	if !isLiked {
		return utils.WrapNotFoundErrorWithID("like", postID)
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
	if err := utils.ValidateRequiredString(content, "content"); err != nil {
		return nil, err
	}

	// Get post to get author ID
	post, err := s.postRepo.FindByID(ctx, postID, tenantID)
	if err != nil {
		return nil, err
	}
	// If replying, verify parent comment exists
	if parentID != nil {
		_, err := s.commentRepo.FindByID(ctx, tenantID, *parentID)
		if err != nil {
			return nil, utils.WrapNotFoundErrorWithID("parent comment", *parentID)
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

	// Award XP for commenting (FR-001, T023)
	if s.gamifService != nil {
		go func() {
			bgCtx := context.Background()
			_, _ = s.gamifService.AwardSocialXP(bgCtx, &XPAwardParams{
				TenantID:    tenantID,
				UserID:      userID,
				ActionType:  models.SocialActionComment,
				ContentType: "Post",
				ContentID:   postID,
				Description: fmt.Sprintf("Commented on post by user %s", post.UserID),
			})
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
	comment, err := s.commentRepo.FindByID(ctx, tenantID, commentID)
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
	comment, err := s.commentRepo.FindByID(ctx, tenantID, commentID)
	if err != nil {
		return err
	}

	// Check ownership
	if comment.UserID != userID {
		return errors.New("unauthorized")
	}

	// Delete comment
	if err := s.commentRepo.Delete(ctx, tenantID, commentID); err != nil {
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

	// Award XP for sharing (FR-001, T025)
	if s.gamifService != nil {
		go func() {
			bgCtx := context.Background()
			_, _ = s.gamifService.AwardSocialXP(bgCtx, &XPAwardParams{
				TenantID:    tenantID,
				UserID:      userID,
				ActionType:  models.SocialActionShare,
				ContentType: "Post",
				ContentID:   postID,
				Description: fmt.Sprintf("Shared post by user %s", post.UserID),
			})
		}()
	}

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

// FollowUser creates a follow relationship between two users
func (s *SocialService) FollowUser(ctx context.Context, followerID, followingID, tenantID uuid.UUID) error {
	// Prevent self-follow
	if followerID == followingID {
		return errors.New("cannot follow yourself")
	}

	// Check if already following
	isFollowing, err := s.followRepo.IsFollowing(ctx, followerID, followingID, tenantID)
	if err != nil {
		return err
	}
	if isFollowing {
		return errors.New("already following this user")
	}

	// Create follow relationship
	follow := &models.Follow{
		ID:          uuid.New(),
		TenantID:    tenantID,
		FollowerID:  followerID,
		FollowingID: followingID,
		CreatedAt:   time.Now(),
	}

	if err := s.followRepo.Create(ctx, follow); err != nil {
		return err
	}

	// Create activity entry
	activity := &models.Activity{
		ID:           uuid.New(),
		TenantID:     tenantID,
		UserID:       followerID,
		ActivityType: models.ActivityUserFollowed,
		EntityType:   "user",
		EntityID:     followingID,
		CreatedAt:    time.Now(),
	}
	_ = s.activityRepo.Create(ctx, activity) // Log error but don't fail

	// Award XP for following (FR-001, T024)
	if s.gamifService != nil {
		go func() {
			bgCtx := context.Background()
			_, _ = s.gamifService.AwardSocialXP(bgCtx, &XPAwardParams{
				TenantID:    tenantID,
				UserID:      followerID,
				ActionType:  models.SocialActionFollow,
				ContentType: "User",
				ContentID:   followingID,
				Description: fmt.Sprintf("Followed user %s", followingID),
			})
		}()
	}

	// Send notification to followed user
	if s.notifService != nil {
		go s.notifService.SendFollowNotification(context.Background(), followerID, followingID, tenantID)
	}

	return nil
}

// UnfollowUser removes a follow relationship
func (s *SocialService) UnfollowUser(ctx context.Context, followerID, followingID, tenantID uuid.UUID) error {
	// Check if following
	isFollowing, err := s.followRepo.IsFollowing(ctx, followerID, followingID, tenantID)
	if err != nil {
		return err
	}
	if !isFollowing {
		return errors.New("not following this user")
	}

	// Delete follow relationship
	if err := s.followRepo.Delete(ctx, followerID, followingID, tenantID); err != nil {
		return err
	}

	// Delete activity entry
	_ = s.activityRepo.DeleteByEntity(ctx, "user", followingID, tenantID)

	return nil
}

// IsFollowing checks if a user is following another user
func (s *SocialService) IsFollowing(ctx context.Context, followerID, followingID, tenantID uuid.UUID) (bool, error) {
	return s.followRepo.IsFollowing(ctx, followerID, followingID, tenantID)
}

// GetFollowers gets users who follow the specified user
func (s *SocialService) GetFollowers(ctx context.Context, userID, tenantID uuid.UUID, page, limit int) ([]models.User, int64, error) {
	return s.followRepo.GetFollowers(ctx, userID, tenantID, page, limit)
}

// GetFollowing gets users that the specified user follows
func (s *SocialService) GetFollowing(ctx context.Context, userID, tenantID uuid.UUID, page, limit int) ([]models.User, int64, error) {
	return s.followRepo.GetFollowing(ctx, userID, tenantID, page, limit)
}

// GetFollowerCount gets the count of followers for a user
func (s *SocialService) GetFollowerCount(ctx context.Context, userID, tenantID uuid.UUID) (int64, error) {
	return s.followRepo.GetFollowerCount(ctx, userID, tenantID)
}

// GetFollowingCount gets the count of users that a user follows
func (s *SocialService) GetFollowingCount(ctx context.Context, userID, tenantID uuid.UUID) (int64, error) {
	return s.followRepo.GetFollowingCount(ctx, userID, tenantID)
}

// GetMutualFollowers gets users who mutually follow each other
func (s *SocialService) GetMutualFollowers(ctx context.Context, userID, tenantID uuid.UUID, page, limit int) ([]models.User, int64, error) {
	return s.followRepo.GetMutualFollowers(ctx, userID, tenantID, page, limit)
}

// GetFollowStats gets follow statistics for a user
func (s *SocialService) GetFollowStats(ctx context.Context, userID, tenantID uuid.UUID) (map[string]int64, error) {
	followerCount, err := s.followRepo.GetFollowerCount(ctx, userID, tenantID)
	if err != nil {
		return nil, err
	}

	followingCount, err := s.followRepo.GetFollowingCount(ctx, userID, tenantID)
	if err != nil {
		return nil, err
	}

	return map[string]int64{
		"followers": followerCount,
		"following": followingCount,
	}, nil
}

// CreatePost creates a new post
func (s *SocialService) CreatePost(ctx context.Context, userID, tenantID uuid.UUID, content, mediaType, mediaURL, visibility string) (*models.Post, error) {
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

	// Award XP for creating post (FR-001, T021)
	if s.gamifService != nil {
		go func() {
			bgCtx := context.Background()
			_, _ = s.gamifService.AwardSocialXP(bgCtx, &XPAwardParams{
				TenantID:    tenantID,
				UserID:      userID,
				ActionType:  models.SocialActionPost,
				ContentType: "Post",
				ContentID:   post.ID,
				Description: "Created a new post",
			})
		}()
	}

	return post, nil
}

// GetPost gets a post by ID
func (s *SocialService) GetPost(ctx context.Context, postID, tenantID uuid.UUID, viewerID *uuid.UUID) (*models.Post, error) {
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
func (s *SocialService) UpdatePost(ctx context.Context, postID, userID, tenantID uuid.UUID, content, visibility string) (*models.Post, error) {
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
func (s *SocialService) DeletePost(ctx context.Context, postID, userID, tenantID uuid.UUID) error {
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
func (s *SocialService) GetUserPosts(ctx context.Context, userID, tenantID uuid.UUID, page, limit int) ([]models.Post, int64, error) {
	return s.postRepo.GetUserPosts(ctx, userID, tenantID, page, limit)
}

// GetPublicFeed gets all public posts
func (s *SocialService) GetPublicFeed(ctx context.Context, tenantID uuid.UUID, page, limit int) ([]models.Post, int64, error) {
	return s.postRepo.GetPublicPosts(ctx, tenantID, page, limit)
}

// GetFollowingFeed gets posts from users that the specified user follows
func (s *SocialService) GetFollowingFeed(ctx context.Context, userID, tenantID uuid.UUID, page, limit int) ([]models.Post, int64, error) {
	return s.postRepo.GetFollowingPosts(ctx, userID, tenantID, page, limit)
}

// SearchPosts searches posts by content
func (s *SocialService) SearchPosts(ctx context.Context, query string, tenantID uuid.UUID, page, limit int) ([]models.Post, int64, error) {
	if query == "" {
		return nil, 0, errors.New("search query required")
	}
	return s.postRepo.SearchPosts(ctx, query, tenantID, page, limit)
}
