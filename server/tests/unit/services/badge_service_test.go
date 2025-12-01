package services_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/mocks"
	"github.com/keshablive/quester/internal/models"
	"github.com/keshablive/quester/internal/framework/service"
	"github.com/stretchr/testify/assert"
)

func TestBadgeService_Create(t *testing.T) {
	// Setup
	mockRepo := new(mocks.BadgeRepository)
	_ = service.NewBadgeService(nil, nil, mockRepo, nil, nil, nil)

	ctx := context.Background()
	badge := &models.Badge{
		TenantID:    uuid.New(),
		Name:        "Test Badge",
		Description: "A test badge",
		Category:    "achievement",
		Tier:        "bronze",
	}

	// Mock expectations
	mockRepo.On("Create", ctx, badge).Return(nil)

	// Execute
	err := mockRepo.Create(ctx, badge)

	// Assert
	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
}

func TestBadgeService_FindByID(t *testing.T) {
	// Setup
	mockRepo := new(mocks.BadgeRepository)
	_ = service.NewBadgeService(nil, nil, mockRepo, nil, nil, nil)

	ctx := context.Background()
	tenantID := uuid.New()
	badgeID := uuid.New()
	expectedBadge := &models.Badge{
		ID:       badgeID,
		TenantID: tenantID,
		Name:     "Test Badge",
	}

	// Mock expectations
	mockRepo.On("FindByID", ctx, tenantID, badgeID).Return(expectedBadge, nil)

	// Execute
	result, err := mockRepo.FindByID(ctx, tenantID, badgeID)

	// Assert
	assert.NoError(t, err)
	assert.Equal(t, badgeID, result.ID)
	assert.Equal(t, "Test Badge", result.Name)
	mockRepo.AssertExpectations(t)
}

func TestBadgeService_FindAll(t *testing.T) {
	// Setup
	mockRepo := new(mocks.BadgeRepository)
	_ = service.NewBadgeService(nil, nil, mockRepo, nil, nil, nil)

	ctx := context.Background()
	tenantID := uuid.New()
	expectedBadges := []models.Badge{
		{ID: uuid.New(), TenantID: tenantID, Name: "Badge 1"},
		{ID: uuid.New(), TenantID: tenantID, Name: "Badge 2"},
	}

	// Mock expectations
	mockRepo.On("FindAll", ctx, tenantID).Return(expectedBadges, nil)

	// Execute
	result, err := mockRepo.FindAll(ctx, tenantID)

	// Assert
	assert.NoError(t, err)
	assert.Len(t, result, 2)
	mockRepo.AssertExpectations(t)
}

func TestBadgeService_Update(t *testing.T) {
	// Setup
	mockRepo := new(mocks.BadgeRepository)
	_ = service.NewBadgeService(nil, nil, mockRepo, nil, nil, nil)

	ctx := context.Background()
	badge := &models.Badge{
		ID:          uuid.New(),
		TenantID:    uuid.New(),
		Name:        "Updated Badge",
		Description: "Updated description",
	}

	// Mock expectations
	mockRepo.On("Update", ctx, badge).Return(nil)

	// Execute
	err := mockRepo.Update(ctx, badge)

	// Assert
	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
}

func TestBadgeService_Delete(t *testing.T) {
	// Setup
	mockRepo := new(mocks.BadgeRepository)
	_ = service.NewBadgeService(nil, nil, mockRepo, nil, nil, nil)

	ctx := context.Background()
	tenantID := uuid.New()
	badgeID := uuid.New()

	// Mock expectations
	mockRepo.On("Delete", ctx, tenantID, badgeID).Return(nil)

	// Execute
	err := mockRepo.Delete(ctx, tenantID, badgeID)

	// Assert
	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
}

func TestBadgeService_GetBadgesByType(t *testing.T) {
	// Setup
	mockRepo := new(mocks.BadgeRepository)
	_ = service.NewBadgeService(nil, nil, mockRepo, nil, nil, nil)

	ctx := context.Background()
	tenantID := uuid.New()
	badgeType := "achievement"
	expectedBadges := []models.Badge{
		{ID: uuid.New(), TenantID: tenantID, Category: models.BadgeCategory(badgeType)},
		{ID: uuid.New(), TenantID: tenantID, Category: models.BadgeCategory(badgeType)},
	}

	// Mock expectations
	mockRepo.On("GetBadgesByType", ctx, tenantID, badgeType).Return(expectedBadges, nil)

	// Execute
	result, err := mockRepo.GetBadgesByType(ctx, tenantID, badgeType)

	// Assert
	assert.NoError(t, err)
	assert.Len(t, result, 2)
	for _, badge := range result {
		assert.Equal(t, models.BadgeCategory(badgeType), badge.Category)
	}
	mockRepo.AssertExpectations(t)
}

func TestBadgeService_GetUserBadges(t *testing.T) {
	// Setup
	mockRepo := new(mocks.BadgeRepository)
	_ = service.NewBadgeService(nil, nil, mockRepo, nil, nil, nil)

	ctx := context.Background()
	tenantID := uuid.New()
	userID := uuid.New()
	expectedUserBadges := []models.UserBadge{
		{ID: uuid.New(), TenantID: tenantID, UserID: userID},
		{ID: uuid.New(), TenantID: tenantID, UserID: userID},
	}

	// Mock expectations
	mockRepo.On("GetUserBadges", ctx, tenantID, userID).Return(expectedUserBadges, nil)

	// Execute
	result, err := mockRepo.GetUserBadges(ctx, tenantID, userID)

	// Assert
	assert.NoError(t, err)
	assert.Len(t, result, 2)
	mockRepo.AssertExpectations(t)
}

func TestBadgeService_AwardBadgeToUser(t *testing.T) {
	// Setup
	mockRepo := new(mocks.BadgeRepository)
	_ = service.NewBadgeService(nil, nil, mockRepo, nil, nil, nil)

	ctx := context.Background()
	userBadge := &models.UserBadge{
		TenantID: uuid.New(),
		UserID:   uuid.New(),
		BadgeID:  uuid.New(),
	}

	// Mock expectations
	mockRepo.On("AwardBadgeToUser", ctx, userBadge).Return(nil)

	// Execute
	err := mockRepo.AwardBadgeToUser(ctx, userBadge)

	// Assert
	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
}

func TestBadgeService_HasUserEarnedBadge(t *testing.T) {
	// Setup
	mockRepo := new(mocks.BadgeRepository)
	_ = service.NewBadgeService(nil, nil, mockRepo, nil, nil, nil)

	ctx := context.Background()
	tenantID := uuid.New()
	userID := uuid.New()
	badgeID := uuid.New()

	// Mock expectations
	mockRepo.On("HasUserEarnedBadge", ctx, tenantID, userID, badgeID).Return(true, nil)

	// Execute
	result, err := mockRepo.HasUserEarnedBadge(ctx, tenantID, userID, badgeID)

	// Assert
	assert.NoError(t, err)
	assert.True(t, result)
	mockRepo.AssertExpectations(t)
}

func TestBadgeService_GetBadgeEarnCount(t *testing.T) {
	// Setup
	mockRepo := new(mocks.BadgeRepository)
	_ = service.NewBadgeService(nil, nil, mockRepo, nil, nil, nil)

	ctx := context.Background()
	tenantID := uuid.New()
	badgeID := uuid.New()
	expectedCount := int64(42)

	// Mock expectations
	mockRepo.On("GetBadgeEarnCount", ctx, tenantID, badgeID).Return(expectedCount, nil)

	// Execute
	result, err := mockRepo.GetBadgeEarnCount(ctx, tenantID, badgeID)

	// Assert
	assert.NoError(t, err)
	assert.Equal(t, expectedCount, result)
	mockRepo.AssertExpectations(t)
}

func TestBadgeService_RevokeBadgeFromUser(t *testing.T) {
	// Setup
	mockRepo := new(mocks.BadgeRepository)
	_ = service.NewBadgeService(nil, nil, mockRepo, nil, nil, nil)

	ctx := context.Background()
	tenantID := uuid.New()
	userID := uuid.New()
	badgeID := uuid.New()

	// Mock expectations
	mockRepo.On("RevokeBadgeFromUser", ctx, tenantID, userID, badgeID).Return(nil)

	// Execute
	err := mockRepo.RevokeBadgeFromUser(ctx, tenantID, userID, badgeID)

	// Assert
	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
}
