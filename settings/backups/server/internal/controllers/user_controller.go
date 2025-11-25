// User CRUD operations
package controllers

import (
	"fmt"
	"path/filepath"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/yourusername/quester/internal/framework/core"
	"github.com/yourusername/quester/internal/framework/responses"
	"github.com/yourusername/quester/internal/framework/storage"
	"github.com/yourusername/quester/internal/repositories"
	"gorm.io/gorm"
)

// UserController handles user profile operations
type UserController struct {
	db       *gorm.DB
	userRepo *repositories.UserRepository
	s3Client *storage.S3Client
}

// NewUserController creates a new user controller
func NewUserController(db *gorm.DB, s3Client *storage.S3Client) *UserController {
	return &UserController{
		db:       db,
		userRepo: repositories.NewUserRepository(db),
		s3Client: s3Client,
	}
}

// GetProfile retrieves the authenticated user's profile
// GET /api/v1/users/me
func (uc *UserController) GetProfile(c *fiber.Ctx) error {
	ctx := c.Context()
	claims := c.Locals("claims").(*core.Claims)

	userID, err := core.GetUserID(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid user ID")
	}

	user, err := uc.userRepo.FindByID(ctx, userID)
	if err != nil {
		return responses.NotFound(c, "User not found")
	}

	return responses.Success(c, fiber.Map{
		"user": user,
	})
}

// UpdateProfile updates the authenticated user's profile
// PUT /api/v1/users/me
func (uc *UserController) UpdateProfile(c *fiber.Ctx) error {
	ctx := c.Context()
	claims := c.Locals("claims").(*core.Claims)

	userID, err := core.GetUserID(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid user ID")
	}

	var req struct {
		Username string `json:"username"`
	}
	if err := c.BodyParser(&req); err != nil {
		return responses.BadRequest(c, "Invalid request body")
	}

	// Get existing user
	user, err := uc.userRepo.FindByID(ctx, userID)
	if err != nil {
		return responses.NotFound(c, "User not found")
	}

	// Update username if provided
	if req.Username != "" {
		user.Username = req.Username
	}

	// Save changes using GORM directly
	if err := uc.db.WithContext(ctx).Save(user).Error; err != nil {
		return responses.InternalError(c, "Failed to update profile")
	}

	return responses.Success(c, fiber.Map{
		"user": user,
	})
}

// UploadAvatar uploads a user's avatar image to S3
// POST /api/v1/users/me/avatar
func (uc *UserController) UploadAvatar(c *fiber.Ctx) error {
	ctx := c.Context()
	claims := c.Locals("claims").(*core.Claims)

	userID, err := core.GetUserID(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid user ID")
	}

	tenantID, err := core.GetTenantIDUUID(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid tenant ID")
	}

	// Get the uploaded file
	file, err := c.FormFile("avatar")
	if err != nil {
		return responses.BadRequest(c, "No avatar file provided")
	}

	// Validate file size (max 5MB)
	if file.Size > 5*1024*1024 {
		return responses.BadRequest(c, "Avatar file size must be less than 5MB")
	}

	// Validate file type
	ext := strings.ToLower(filepath.Ext(file.Filename))
	allowedExts := map[string]bool{
		".jpg":  true,
		".jpeg": true,
		".png":  true,
		".gif":  true,
		".webp": true,
	}
	if !allowedExts[ext] {
		return responses.BadRequest(c, "Avatar must be an image file (jpg, jpeg, png, gif, webp)")
	}

	// Open the file
	fileReader, err := file.Open()
	if err != nil {
		return responses.InternalError(c, "Failed to read avatar file")
	}
	defer fileReader.Close()

	// Generate S3 key: avatars/{tenantID}/{userID}{ext}
	s3Key := fmt.Sprintf("avatars/%s/%s%s", tenantID, userID, ext)

	// Upload to S3
	contentType := file.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "image/jpeg" // Default content type
	}

	err = uc.s3Client.UploadFile(ctx, s3Key, fileReader, contentType, nil)
	if err != nil {
		return responses.InternalError(c, fmt.Sprintf("Failed to upload avatar: %v", err))
	}

	// Store just the S3 key as the avatar (can be converted to full URL when needed)
	// This makes it easier to change S3 configuration without updating all records
	avatarPath := s3Key

	// Update user's avatar field
	user, err := uc.userRepo.FindByID(ctx, userID)
	if err != nil {
		return responses.NotFound(c, "User not found")
	}

	user.Avatar = &avatarPath
	// Save user using GORM directly
	if err := uc.db.WithContext(ctx).Save(user).Error; err != nil {
		return responses.InternalError(c, "Failed to update user avatar")
	}

	return responses.Success(c, fiber.Map{
		"avatar_path": avatarPath,
		"message":     "Avatar uploaded successfully",
	})
}

// DeleteAvatar removes a user's avatar
// DELETE /api/v1/users/me/avatar
func (uc *UserController) DeleteAvatar(c *fiber.Ctx) error {
	ctx := c.Context()
	claims := c.Locals("claims").(*core.Claims)

	userID, err := core.GetUserID(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid user ID")
	}

	// Get user
	user, err := uc.userRepo.FindByID(ctx, userID)
	if err != nil {
		return responses.NotFound(c, "User not found")
	}

	if user.Avatar == nil || *user.Avatar == "" {
		return responses.BadRequest(c, "No avatar to delete")
	}

	// Avatar is stored as S3 key, delete from S3
	s3Key := *user.Avatar

	// Delete from S3
	if err := uc.s3Client.DeleteFile(ctx, s3Key); err != nil {
		// Log error but continue to update database
		// The file might already be deleted or the key might be wrong
	}

	// Remove avatar from user
	user.Avatar = nil
	if err := uc.db.WithContext(ctx).Save(user).Error; err != nil {
		return responses.InternalError(c, "Failed to remove avatar")
	}

	return responses.Success(c, fiber.Map{
		"message": "Avatar deleted successfully",
	})
}
