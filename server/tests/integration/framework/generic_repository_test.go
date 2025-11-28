// Package framework provides integration tests for framework components.
package framework

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"

	"github.com/keshablive/quester/internal/framework/repository"
)

// TestEntity is a test model for repository testing
type TestEntity struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey"`
	TenantID  uuid.UUID `gorm:"type:uuid;not null;index"`
	Name      string    `gorm:"size:255;not null"`
	Value     int
	CreatedAt time.Time
	UpdatedAt time.Time
}

func (e *TestEntity) GetID() uuid.UUID         { return e.ID }
func (e *TestEntity) GetTenantID() uuid.UUID   { return e.TenantID }
func (e *TestEntity) SetTenantID(id uuid.UUID) { e.TenantID = id }
func (e *TestEntity) TableName() string        { return "test_entities" }

// TestGenericRepository_Create_MissingTenantID tests that Create fails without tenant context
func TestGenericRepository_Create_MissingTenantID(t *testing.T) {
	// This test verifies tenant ID enforcement without a database
	// Arrange - context without tenant ID
	ctx := context.Background()
	entity := &TestEntity{
		ID:   uuid.New(),
		Name: "Test Entity",
	}

	// Create repository with nil DB (will fail on DB operation, but we test tenant check first)
	repo := repository.NewGenericRepository[*TestEntity](nil)

	// Act
	err := repo.Create(ctx, entity)

	// Assert - should fail due to missing tenant ID before DB access
	assert.Error(t, err)
	assert.True(t, repository.IsTenantError(err), "Should be a tenant error")
}

// TestGenericRepository_FindByID_MissingTenantID tests that FindByID fails without tenant context
func TestGenericRepository_FindByID_MissingTenantID(t *testing.T) {
	// Arrange - context without tenant ID
	ctx := context.Background()
	repo := repository.NewGenericRepository[*TestEntity](nil)

	// Act
	_, err := repo.FindByID(ctx, uuid.New())

	// Assert - should fail due to missing tenant ID
	assert.Error(t, err)
	assert.True(t, repository.IsTenantError(err), "Should be a tenant error")
}

// TestGenericRepository_FindAll_MissingTenantID tests that FindAll fails without tenant context
func TestGenericRepository_FindAll_MissingTenantID(t *testing.T) {
	// Arrange - context without tenant ID
	ctx := context.Background()
	repo := repository.NewGenericRepository[*TestEntity](nil)

	// Act
	_, _, err := repo.FindAll(ctx)

	// Assert - should fail due to missing tenant ID
	assert.Error(t, err)
	assert.True(t, repository.IsTenantError(err), "Should be a tenant error")
}

// TestGenericRepository_Update_MissingTenantID tests that Update fails without tenant context
func TestGenericRepository_Update_MissingTenantID(t *testing.T) {
	// Arrange - context without tenant ID
	ctx := context.Background()
	entity := &TestEntity{ID: uuid.New(), Name: "Test"}
	repo := repository.NewGenericRepository[*TestEntity](nil)

	// Act
	err := repo.Update(ctx, entity)

	// Assert - should fail due to missing tenant ID
	assert.Error(t, err)
	assert.True(t, repository.IsTenantError(err), "Should be a tenant error")
}

// TestGenericRepository_Delete_MissingTenantID tests that Delete fails without tenant context
func TestGenericRepository_Delete_MissingTenantID(t *testing.T) {
	// Arrange - context without tenant ID
	ctx := context.Background()
	repo := repository.NewGenericRepository[*TestEntity](nil)

	// Act
	err := repo.Delete(ctx, uuid.New())

	// Assert - should fail due to missing tenant ID
	assert.Error(t, err)
	assert.True(t, repository.IsTenantError(err), "Should be a tenant error")
}

// TestGenericRepository_Count_MissingTenantID tests that Count fails without tenant context
func TestGenericRepository_Count_MissingTenantID(t *testing.T) {
	// Arrange - context without tenant ID
	ctx := context.Background()
	repo := repository.NewGenericRepository[*TestEntity](nil)

	// Act
	_, err := repo.Count(ctx)

	// Assert - should fail due to missing tenant ID
	assert.Error(t, err)
	assert.True(t, repository.IsTenantError(err), "Should be a tenant error")
}

// TestGenericRepository_Exists_MissingTenantID tests that Exists fails without tenant context
func TestGenericRepository_Exists_MissingTenantID(t *testing.T) {
	// Arrange - context without tenant ID
	ctx := context.Background()
	repo := repository.NewGenericRepository[*TestEntity](nil)

	// Act
	_, err := repo.Exists(ctx, uuid.New())

	// Assert - should fail due to missing tenant ID
	assert.Error(t, err)
	assert.True(t, repository.IsTenantError(err), "Should be a tenant error")
}

// TestGenericRepository_FindByCondition_MissingTenantID tests that FindByCondition fails without tenant context
func TestGenericRepository_FindByCondition_MissingTenantID(t *testing.T) {
	// Arrange - context without tenant ID
	ctx := context.Background()
	repo := repository.NewGenericRepository[*TestEntity](nil)

	// Act
	_, err := repo.FindByCondition(ctx, "value > ?", 10)

	// Assert - should fail due to missing tenant ID
	assert.Error(t, err)
	assert.True(t, repository.IsTenantError(err), "Should be a tenant error")
}

// TestGenericRepository_WithTransaction tests that WithTransaction returns new repo
func TestGenericRepository_WithTransaction(t *testing.T) {
	// Arrange
	repo := repository.NewGenericRepository[*TestEntity](nil)

	// Act
	txRepo := repo.WithTransaction(nil)

	// Assert - should return a new repository instance
	assert.NotNil(t, txRepo)
	assert.NotSame(t, repo, txRepo, "Should be different instances")
}

// TestQueryOptions tests the query option functions
func TestQueryOptions(t *testing.T) {
	t.Run("WithPagination defaults", func(t *testing.T) {
		// Just verify the function is callable - actual DB testing done in integration tests
		opt := repository.WithPagination(0, 0)
		assert.NotNil(t, opt)
	})

	t.Run("WithOrder", func(t *testing.T) {
		opt := repository.WithOrder("created_at DESC")
		assert.NotNil(t, opt)
	})

	t.Run("WithPreload", func(t *testing.T) {
		opt := repository.WithPreload("User")
		assert.NotNil(t, opt)
	})

	t.Run("WithWhere", func(t *testing.T) {
		opt := repository.WithWhere("name = ?", "test")
		assert.NotNil(t, opt)
	})

	t.Run("WithSelect", func(t *testing.T) {
		opt := repository.WithSelect("id", "name")
		assert.NotNil(t, opt)
	})
}

// TestRepositoryErrors tests error helper functions
func TestRepositoryErrors(t *testing.T) {
	t.Run("IsNotFound", func(t *testing.T) {
		assert.True(t, repository.IsNotFound(repository.ErrRecordNotFound))
		assert.False(t, repository.IsNotFound(repository.ErrTenantIDMissing))
	})

	t.Run("IsTenantError", func(t *testing.T) {
		assert.True(t, repository.IsTenantError(repository.ErrTenantIDMissing))
		assert.True(t, repository.IsTenantError(repository.ErrTenantIDMismatch))
		assert.True(t, repository.IsTenantError(repository.ErrInvalidTenantID))
		assert.False(t, repository.IsTenantError(repository.ErrRecordNotFound))
	})
}
