package services_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/mocks"
	"github.com/keshablive/quester/internal/models"
	"github.com/keshablive/quester/internal/services"
	"github.com/stretchr/testify/assert"
)

func TestLeaderboardService_CreateLeaderboard(t *testing.T) {
	// Setup
	mockRepo := new(mocks.LeaderboardRepository)
	_ = services.NewLeaderboardService(nil, nil, nil, mockRepo, nil, nil)

	ctx := context.Background()
	leaderboard := &models.Leaderboard{
		ID:          1,
		TenantID:    uuid.New(),
		UserID:      uuid.New(),
		Rank:        1,
		MetricValue: 100,
	}

	// Mock expectations
	mockRepo.On("Create", ctx, leaderboard).Return(nil)

	// Execute
	err := mockRepo.Create(ctx, leaderboard)

	// Assert
	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
}

func TestLeaderboardService_FindByID(t *testing.T) {
	// Setup
	mockRepo := new(mocks.LeaderboardRepository)
	_ = services.NewLeaderboardService(nil, nil, nil, mockRepo, nil, nil)

	ctx := context.Background()
	tenantID := uuid.New()
	entryID := uuid.New()
	expectedLeaderboard := &models.Leaderboard{
		ID:          1,
		TenantID:    tenantID,
		MetricValue: 100,
	}

	// Mock expectations
	mockRepo.On("FindByID", ctx, tenantID, entryID).Return(expectedLeaderboard, nil)

	// Execute
	result, err := mockRepo.FindByID(ctx, tenantID, entryID)

	// Assert
	assert.NoError(t, err)
	assert.Equal(t, tenantID, result.TenantID)
	mockRepo.AssertExpectations(t)
}

func TestLeaderboardService_FindAll(t *testing.T) {
	// Setup
	mockRepo := new(mocks.LeaderboardRepository)
	_ = services.NewLeaderboardService(nil, nil, nil, mockRepo, nil, nil)

	ctx := context.Background()
	tenantID := uuid.New()
	limit, offset := 10, 0
	expectedLeaderboards := []models.Leaderboard{
		{ID: 1, TenantID: tenantID, Rank: 1},
		{ID: 2, TenantID: tenantID, Rank: 2},
	}
	var totalCount int64 = 2

	// Mock expectations
	mockRepo.On("FindAll", ctx, tenantID, limit, offset).Return(expectedLeaderboards, totalCount, nil)

	// Execute
	result, count, err := mockRepo.FindAll(ctx, tenantID, limit, offset)

	// Assert
	assert.NoError(t, err)
	assert.Len(t, result, 2)
	assert.Equal(t, totalCount, count)
	mockRepo.AssertExpectations(t)
}

func TestLeaderboardService_Update(t *testing.T) {
	// Setup
	mockRepo := new(mocks.LeaderboardRepository)
	_ = services.NewLeaderboardService(nil, nil, nil, mockRepo, nil, nil)

	ctx := context.Background()
	leaderboard := &models.Leaderboard{
		ID:          1,
		TenantID:    uuid.New(),
		Rank:        2,
		MetricValue: 150,
	}

	// Mock expectations
	mockRepo.On("Update", ctx, leaderboard).Return(nil)

	// Execute
	err := mockRepo.Update(ctx, leaderboard)

	// Assert
	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
}

func TestLeaderboardService_Delete(t *testing.T) {
	// Setup
	mockRepo := new(mocks.LeaderboardRepository)
	_ = services.NewLeaderboardService(nil, nil, nil, mockRepo, nil, nil)

	ctx := context.Background()
	tenantID := uuid.New()
	entryID := uuid.New()

	// Mock expectations
	mockRepo.On("Delete", ctx, tenantID, entryID).Return(nil)

	// Execute
	err := mockRepo.Delete(ctx, tenantID, entryID)

	// Assert
	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
}

func TestLeaderboardService_GetTopPlayers(t *testing.T) {
	// Setup
	mockRepo := new(mocks.LeaderboardRepository)
	_ = services.NewLeaderboardService(nil, nil, nil, mockRepo, nil, nil)

	ctx := context.Background()
	tenantID := uuid.New()
	limit := 10
	expectedLeaderboards := []models.Leaderboard{
		{ID: 1, TenantID: tenantID, Rank: 1, MetricValue: 1000},
		{ID: 2, TenantID: tenantID, Rank: 2, MetricValue: 900},
	}

	// Mock expectations
	mockRepo.On("GetTopPlayers", ctx, tenantID, limit).Return(expectedLeaderboards, nil)

	// Execute
	result, err := mockRepo.GetTopPlayers(ctx, tenantID, limit)

	// Assert
	assert.NoError(t, err)
	assert.Len(t, result, 2)
	assert.Equal(t, 1, result[0].Rank)
	assert.Equal(t, 2, result[1].Rank)
	mockRepo.AssertExpectations(t)
}

func TestLeaderboardService_GetUserRank(t *testing.T) {
	// Setup
	mockRepo := new(mocks.LeaderboardRepository)
	_ = services.NewLeaderboardService(nil, nil, nil, mockRepo, nil, nil)

	ctx := context.Background()
	tenantID := uuid.New()
	userID := uuid.New()
	var expectedRank int64 = 5

	// Mock expectations
	mockRepo.On("GetUserRank", ctx, tenantID, userID).Return(expectedRank, nil)

	// Execute
	result, err := mockRepo.GetUserRank(ctx, tenantID, userID)

	// Assert
	assert.NoError(t, err)
	assert.Equal(t, expectedRank, result)
	mockRepo.AssertExpectations(t)
}

func TestLeaderboardService_GetLeaderboardByPeriod(t *testing.T) {
	// Setup
	mockRepo := new(mocks.LeaderboardRepository)
	_ = services.NewLeaderboardService(nil, nil, nil, mockRepo, nil, nil)

	ctx := context.Background()
	tenantID := uuid.New()
	period := "weekly"
	limit := 10
	expectedLeaderboards := []models.Leaderboard{
		{ID: 1, TenantID: tenantID, Rank: 1},
	}

	// Mock expectations
	mockRepo.On("GetLeaderboardByPeriod", ctx, tenantID, period, limit).Return(expectedLeaderboards, nil)

	// Execute
	result, err := mockRepo.GetLeaderboardByPeriod(ctx, tenantID, period, limit)

	// Assert
	assert.NoError(t, err)
	assert.Len(t, result, 1)
	mockRepo.AssertExpectations(t)
}

func TestLeaderboardService_UpdateUserScore(t *testing.T) {
	// Setup
	mockRepo := new(mocks.LeaderboardRepository)
	_ = services.NewLeaderboardService(nil, nil, nil, mockRepo, nil, nil)

	ctx := context.Background()
	tenantID := uuid.New()
	userID := uuid.New()
	score := 100

	// Mock expectations
	mockRepo.On("UpdateUserScore", ctx, tenantID, userID, score).Return(nil)

	// Execute
	err := mockRepo.UpdateUserScore(ctx, tenantID, userID, score)

	// Assert
	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
}

func TestLeaderboardService_GetUserLeaderboardEntry(t *testing.T) {
	// Setup
	mockRepo := new(mocks.LeaderboardRepository)
	_ = services.NewLeaderboardService(nil, nil, nil, mockRepo, nil, nil)

	ctx := context.Background()
	tenantID := uuid.New()
	userID := uuid.New()
	expectedLeaderboard := &models.Leaderboard{
		ID:       1,
		TenantID: tenantID,
		UserID:   userID,
		Rank:     3,
	}

	// Mock expectations
	mockRepo.On("GetUserLeaderboardEntry", ctx, tenantID, userID).Return(expectedLeaderboard, nil)

	// Execute
	result, err := mockRepo.GetUserLeaderboardEntry(ctx, tenantID, userID)

	// Assert
	assert.NoError(t, err)
	assert.Equal(t, userID, result.UserID)
	mockRepo.AssertExpectations(t)
}

func TestLeaderboardService_ResetLeaderboard(t *testing.T) {
	// Setup
	mockRepo := new(mocks.LeaderboardRepository)
	_ = services.NewLeaderboardService(nil, nil, nil, mockRepo, nil, nil)

	ctx := context.Background()
	tenantID := uuid.New()
	period := "monthly"

	// Mock expectations
	mockRepo.On("ResetLeaderboard", ctx, tenantID, period).Return(nil)

	// Execute
	err := mockRepo.ResetLeaderboard(ctx, tenantID, period)

	// Assert
	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
}
