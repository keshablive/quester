// Package framework provides integration tests for framework components.
package framework

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"

	"github.com/keshablive/quester/internal/framework/repository"
)

// TestTenantModel is a test model implementing TenantModel interface
type TestTenantModel struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey"`
	TenantID  uuid.UUID `gorm:"type:uuid;not null;index"`
	Name      string    `gorm:"size:255;not null"`
	CreatedAt time.Time
	UpdatedAt time.Time
}

func (m *TestTenantModel) GetID() uuid.UUID         { return m.ID }
func (m *TestTenantModel) GetTenantID() uuid.UUID   { return m.TenantID }
func (m *TestTenantModel) SetTenantID(id uuid.UUID) { m.TenantID = id }
func (m *TestTenantModel) TableName() string        { return "test_tenant_models" }

// InvalidModel lacks TenantModel methods - used to test rejection
type InvalidModel struct {
	ID   uuid.UUID `gorm:"type:uuid;primaryKey"`
	Name string
}

func TestTenantModelInterface_ValidModel(t *testing.T) {
	// Arrange
	model := &TestTenantModel{
		ID:       uuid.New(),
		TenantID: uuid.New(),
		Name:     "Test",
	}

	// Act & Assert - compile-time check via type constraint
	var _ repository.TenantModel = model

	// Assert methods work correctly
	assert.NotEqual(t, uuid.Nil, model.GetID())
	assert.NotEqual(t, uuid.Nil, model.GetTenantID())
	assert.Equal(t, "test_tenant_models", model.TableName())
}

func TestTenantModelInterface_SetTenantID(t *testing.T) {
	// Arrange
	model := &TestTenantModel{
		ID:   uuid.New(),
		Name: "Test",
	}
	tenantID := uuid.New()

	// Act
	model.SetTenantID(tenantID)

	// Assert
	assert.Equal(t, tenantID, model.GetTenantID())
}

func TestTenantModelInterface_ZeroTenantIDDetection(t *testing.T) {
	// Arrange
	model := &TestTenantModel{
		ID:   uuid.New(),
		Name: "Test",
		// TenantID is zero value
	}

	// Assert - TenantID should be uuid.Nil when not set
	assert.Equal(t, uuid.Nil, model.GetTenantID())
}

func TestTenantModelInterface_TableName(t *testing.T) {
	// Test that TableName returns the correct database table
	model := &TestTenantModel{}
	assert.Equal(t, "test_tenant_models", model.TableName())
}

// TestContextKeys verifies context keys are properly typed
func TestContextKeys(t *testing.T) {
	// Verify TenantIDKey and UserIDKey are distinct types
	tenantKey := repository.TenantIDKey{}
	userKey := repository.UserIDKey{}

	// They should be different types (compile-time check)
	assert.NotEqual(t, tenantKey, userKey)
}
