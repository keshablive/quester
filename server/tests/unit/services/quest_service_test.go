package services_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/keshablive/quester/internal/mocks"
	"github.com/keshablive/quester/internal/models"
	"github.com/keshablive/quester/internal/framework/service"
)

// TestQuestService_CreateQuest tests the CreateQuest method
func TestQuestService_CreateQuest(t *testing.T) {
	// Arrange
	mockQuestRepo := new(mocks.QuestRepository)
	// mockUserRepo will be created in T029-T033
	questService := service.NewQuestService(nil, nil, nil, mockQuestRepo, nil, nil, nil) // Simplified for now

	tenantID := uuid.New()
	quest := &models.Quest{
		Title:       "Test Quest",
		Description: "Test Description",
		Type:        models.QuestTypeDaily,
		Status:      models.QuestStatusActive,
		Points:      100,
	}

	// Setup mock expectations
	mockQuestRepo.On("Create", mock.Anything, mock.MatchedBy(func(q *models.Quest) bool {
		return q.TenantID == tenantID
	})).Return(nil)

	// Act
	result, err := questService.CreateQuest(context.Background(), tenantID, quest)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, tenantID, result.TenantID)
	mockQuestRepo.AssertExpectations(t)
}

// TestQuestService_GetQuest tests the GetQuest method
func TestQuestService_GetQuest(t *testing.T) {
	// Arrange
	mockQuestRepo := new(mocks.QuestRepository)
	questService := service.NewQuestService(nil, nil, nil, mockQuestRepo, nil, nil, nil)

	tenantID := uuid.New()
	questID := uuid.New()
	expectedQuest := &models.Quest{
		TenantID:    tenantID,
		Title:       "Test Quest",
		Description: "Test Description",
		Points:      100,
	}

	// Setup mock expectations
	mockQuestRepo.On("FindByID", mock.Anything, tenantID, questID).Return(expectedQuest, nil)

	// Act
	result, err := questService.GetQuest(context.Background(), tenantID, questID)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, expectedQuest.Title, result.Title)
	mockQuestRepo.AssertExpectations(t)
}

// TestQuestService_ListQuests tests the ListQuests method
func TestQuestService_ListQuests(t *testing.T) {
	// Arrange
	mockQuestRepo := new(mocks.QuestRepository)
	questService := service.NewQuestService(nil, nil, nil, mockQuestRepo, nil, nil, nil)

	tenantID := uuid.New()
	filters := map[string]interface{}{
		"status": models.QuestStatusActive,
	}
	expectedQuests := []models.Quest{
		{Title: "Quest 1", Points: 100},
		{Title: "Quest 2", Points: 200},
	}

	// Setup mock expectations
	mockQuestRepo.On("FindAll", mock.Anything, tenantID, filters).Return(expectedQuests, nil)

	// Act
	result, err := questService.ListQuests(context.Background(), tenantID, filters)

	// Assert
	assert.NoError(t, err)
	assert.Len(t, result, 2)
	assert.Equal(t, "Quest 1", result[0].Title)
	mockQuestRepo.AssertExpectations(t)
}

// TestQuestService_UpdateQuest tests the UpdateQuest method
func TestQuestService_UpdateQuest(t *testing.T) {
	// Arrange
	mockQuestRepo := new(mocks.QuestRepository)
	questService := service.NewQuestService(nil, nil, nil, mockQuestRepo, nil, nil, nil)

	tenantID := uuid.New()
	questID := uuid.New()
	existingQuest := &models.Quest{
		TenantID: tenantID,
		Title:    "Old Title",
		Points:   100,
	}
	updates := &models.Quest{
		Title:  "New Title",
		Points: 200,
	}

	// Setup mock expectations
	mockQuestRepo.On("FindByID", mock.Anything, tenantID, questID).Return(existingQuest, nil)
	mockQuestRepo.On("Update", mock.Anything, mock.MatchedBy(func(q *models.Quest) bool {
		return q.Title == "New Title" && q.Points == 200
	})).Return(nil)

	// Act
	result, err := questService.UpdateQuest(context.Background(), tenantID, questID, updates)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "New Title", result.Title)
	assert.Equal(t, 200, result.Points)
	mockQuestRepo.AssertExpectations(t)
}

// TestQuestService_DeleteQuest tests the DeleteQuest method
func TestQuestService_DeleteQuest(t *testing.T) {
	// Arrange
	mockQuestRepo := new(mocks.QuestRepository)
	questService := service.NewQuestService(nil, nil, nil, mockQuestRepo, nil, nil, nil)

	tenantID := uuid.New()
	questID := uuid.New()

	// Setup mock expectations
	mockQuestRepo.On("Delete", mock.Anything, tenantID, questID).Return(nil)

	// Act
	err := questService.DeleteQuest(context.Background(), tenantID, questID)

	// Assert
	assert.NoError(t, err)
	mockQuestRepo.AssertExpectations(t)
}

// TestQuestService_GetActiveQuests tests the GetActiveQuests method
func TestQuestService_GetActiveQuests(t *testing.T) {
	// Arrange
	mockQuestRepo := new(mocks.QuestRepository)
	questService := service.NewQuestService(nil, nil, nil, mockQuestRepo, nil, nil, nil)

	tenantID := uuid.New()
	expectedQuests := []models.Quest{
		{Title: "Active Quest 1", Status: models.QuestStatusActive},
		{Title: "Active Quest 2", Status: models.QuestStatusActive},
	}

	// Setup mock expectations
	mockQuestRepo.On("GetActiveQuests", mock.Anything, tenantID).Return(expectedQuests, nil)

	// Act
	result, err := questService.GetActiveQuests(context.Background(), tenantID)

	// Assert
	assert.NoError(t, err)
	assert.Len(t, result, 2)
	assert.Equal(t, models.QuestStatusActive, result[0].Status)
	mockQuestRepo.AssertExpectations(t)
}
