package services_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"gorm.io/gorm"

	"github.com/keshablive/quester/internal/mocks"
	"github.com/keshablive/quester/internal/models"
	"github.com/keshablive/quester/internal/framework/service"
)

// TestPropertyService_CreateProperty tests the CreateProperty method
func TestPropertyService_CreateProperty(t *testing.T) {
	// Arrange
	mockRepo := new(mocks.PropertyRepository)
	propertyService := service.NewPropertyService(mockRepo, nil, nil, nil)

	tenantID := uuid.New()
	ownerID := uuid.New()

	property := &models.Property{
		TenantID: tenantID,
		OwnerID:  ownerID,
		Title:    "Test Property",
		Price:    100000,
		Location: models.Point{
			Coordinates: []float64{77.5946, 12.9716}, // Bangalore coordinates [lng, lat]
		},
		Status:   models.PropertyStatusDraft,
		Currency: "INR",
	}

	// Mock expectations
	mockRepo.On("Create", mock.Anything, property).Return(nil)

	// Act
	err := propertyService.CreateProperty(context.Background(), property)

	// Assert
	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
}

// TestPropertyService_CreateProperty_ValidationError tests validation errors
func TestPropertyService_CreateProperty_ValidationError(t *testing.T) {
	tests := []struct {
		name     string
		property *models.Property
		wantErr  bool
	}{
		{
			name: "missing tenant_id",
			property: &models.Property{
				OwnerID: uuid.New(),
				Title:   "Test",
				Price:   100000,
				Location: models.Point{
					Coordinates: []float64{77.5946, 12.9716},
				},
			},
			wantErr: true,
		},
		{
			name: "missing owner_id",
			property: &models.Property{
				TenantID: uuid.New(),
				Title:    "Test",
				Price:    100000,
				Location: models.Point{
					Coordinates: []float64{77.5946, 12.9716},
				},
			},
			wantErr: true,
		},
		{
			name: "missing title",
			property: &models.Property{
				TenantID: uuid.New(),
				OwnerID:  uuid.New(),
				Price:    100000,
				Location: models.Point{
					Coordinates: []float64{77.5946, 12.9716},
				},
			},
			wantErr: true,
		},
		{
			name: "invalid price",
			property: &models.Property{
				TenantID: uuid.New(),
				OwnerID:  uuid.New(),
				Title:    "Test",
				Price:    -100,
				Location: models.Point{
					Coordinates: []float64{77.5946, 12.9716},
				},
			},
			wantErr: true,
		},
		{
			name: "missing location",
			property: &models.Property{
				TenantID: uuid.New(),
				OwnerID:  uuid.New(),
				Title:    "Test",
				Price:    100000,
				Location: models.Point{
					Coordinates: []float64{0, 0},
				},
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Arrange
			mockRepo := new(mocks.PropertyRepository)
			propertyService := service.NewPropertyService(mockRepo, nil, nil, nil)

			// Act
			err := propertyService.CreateProperty(context.Background(), tt.property)

			// Assert
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

// TestPropertyService_GetProperty tests the GetProperty method
func TestPropertyService_GetProperty(t *testing.T) {
	// Arrange
	mockRepo := new(mocks.PropertyRepository)
	propertyService := service.NewPropertyService(mockRepo, nil, nil, nil)

	tenantID := uuid.New()
	propertyID := uuid.New()

	expectedProperty := &models.Property{
		ID:       propertyID,
		TenantID: tenantID,
		Title:    "Test Property",
		Price:    100000,
	}

	// Mock expectations
	mockRepo.On("FindByID", mock.Anything, tenantID, propertyID).Return(expectedProperty, nil)

	// Act
	property, err := propertyService.GetProperty(context.Background(), tenantID, propertyID)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, property)
	assert.Equal(t, propertyID, property.ID)
	assert.Equal(t, tenantID, property.TenantID)
	mockRepo.AssertExpectations(t)
}

// TestPropertyService_GetProperty_NotFound tests not found scenario
func TestPropertyService_GetProperty_NotFound(t *testing.T) {
	// Arrange
	mockRepo := new(mocks.PropertyRepository)
	propertyService := service.NewPropertyService(mockRepo, nil, nil, nil)

	tenantID := uuid.New()
	propertyID := uuid.New()

	// Mock expectations - return gorm.ErrRecordNotFound
	mockRepo.On("FindByID", mock.Anything, tenantID, propertyID).Return(nil, gorm.ErrRecordNotFound)

	// Act
	property, err := propertyService.GetProperty(context.Background(), tenantID, propertyID)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, property)
	mockRepo.AssertExpectations(t)
}

// TestPropertyService_UpdateProperty tests the UpdateProperty method
func TestPropertyService_UpdateProperty(t *testing.T) {
	// Arrange
	mockRepo := new(mocks.PropertyRepository)
	propertyService := service.NewPropertyService(mockRepo, nil, nil, nil)

	tenantID := uuid.New()
	propertyID := uuid.New()

	existingProperty := &models.Property{
		ID:       propertyID,
		TenantID: tenantID,
		Title:    "Test Property",
		Price:    100000,
	}

	updates := map[string]interface{}{
		"title": "Updated Property",
		"price": 150000,
	}

	// Mock expectations
	mockRepo.On("FindByID", mock.Anything, tenantID, propertyID).Return(existingProperty, nil)
	mockRepo.On("Update", mock.Anything, existingProperty).Return(nil)

	// Act
	err := propertyService.UpdateProperty(context.Background(), tenantID, propertyID, updates)

	// Assert
	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
}

// TestPropertyService_UpdateProperty_NotFound tests update on non-existent property
func TestPropertyService_UpdateProperty_NotFound(t *testing.T) {
	// Arrange
	mockRepo := new(mocks.PropertyRepository)
	propertyService := service.NewPropertyService(mockRepo, nil, nil, nil)

	tenantID := uuid.New()
	propertyID := uuid.New()

	updates := map[string]interface{}{
		"title": "Updated Property",
	}

	// Mock expectations - property not found
	mockRepo.On("FindByID", mock.Anything, tenantID, propertyID).Return(nil, gorm.ErrRecordNotFound)

	// Act
	err := propertyService.UpdateProperty(context.Background(), tenantID, propertyID, updates)

	// Assert
	assert.Error(t, err)
	mockRepo.AssertExpectations(t)
}

// TestPropertyService_DeleteProperty tests the DeleteProperty method
func TestPropertyService_DeleteProperty(t *testing.T) {
	// Arrange
	mockRepo := new(mocks.PropertyRepository)
	propertyService := service.NewPropertyService(mockRepo, nil, nil, nil)

	tenantID := uuid.New()
	propertyID := uuid.New()

	// Mock expectations
	mockRepo.On("Delete", mock.Anything, tenantID, propertyID).Return(nil)

	// Act
	err := propertyService.DeleteProperty(context.Background(), tenantID, propertyID)

	// Assert
	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
}

// TestPropertyService_DeleteProperty_NotFound tests delete on non-existent property
func TestPropertyService_DeleteProperty_NotFound(t *testing.T) {
	// Arrange
	mockRepo := new(mocks.PropertyRepository)
	propertyService := service.NewPropertyService(mockRepo, nil, nil, nil)

	tenantID := uuid.New()
	propertyID := uuid.New()

	// Mock expectations - property not found
	mockRepo.On("Delete", mock.Anything, tenantID, propertyID).Return(gorm.ErrRecordNotFound)

	// Act
	err := propertyService.DeleteProperty(context.Background(), tenantID, propertyID)

	// Assert
	assert.Error(t, err)
	mockRepo.AssertExpectations(t)
}
