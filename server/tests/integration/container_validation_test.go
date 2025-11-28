// Integration tests for DI container validation
package integration

import (
	"testing"

	"github.com/keshablive/quester/internal/repositories"
	"github.com/stretchr/testify/assert"
	"gorm.io/gorm"
)

// TestRepositoryConstructors_NilValidation verifies that repository constructors
// panic with descriptive errors when given nil database connections
func TestRepositoryConstructors_NilValidation(t *testing.T) {
	tests := []struct {
		name        string
		constructor func(*gorm.DB) interface{}
		repoName    string
	}{
		{
			name: "PropertyRepository panics on nil DB",
			constructor: func(db *gorm.DB) interface{} {
				return repositories.NewPropertyRepository(db)
			},
			repoName: "PropertyRepository",
		},
		{
			name: "QuestRepository panics on nil DB",
			constructor: func(db *gorm.DB) interface{} {
				return repositories.NewQuestRepository(db)
			},
			repoName: "QuestRepository",
		},
		{
			name: "UserRepository panics on nil DB",
			constructor: func(db *gorm.DB) interface{} {
				return repositories.NewUserRepository(db)
			},
			repoName: "UserRepository",
		},
		{
			name: "TransactionRepository panics on nil DB",
			constructor: func(db *gorm.DB) interface{} {
				return repositories.NewTransactionRepository(db)
			},
			repoName: "TransactionRepository",
		},
		{
			name: "BadgeRepository panics on nil DB",
			constructor: func(db *gorm.DB) interface{} {
				return repositories.NewBadgeRepository(db)
			},
			repoName: "BadgeRepository",
		},
		{
			name: "LeaderboardRepository panics on nil DB",
			constructor: func(db *gorm.DB) interface{} {
				return repositories.NewLeaderboardRepository(db)
			},
			repoName: "LeaderboardRepository",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Verify panic occurs
			assert.Panics(t, func() {
				tt.constructor(nil)
			}, "Expected panic when passing nil database")

			// Verify panic message contains repository name
			defer func() {
				if r := recover(); r != nil {
					errMsg := r.(string)
					assert.Contains(t, errMsg, tt.repoName,
						"Panic message should contain repository name for debugging")
					assert.Contains(t, errMsg, "database connection is nil",
						"Panic message should clearly indicate nil database")
				}
			}()
			
			// Trigger the panic
			tt.constructor(nil)
		})
	}
}

// TestRepositoryConstructors_ValidDB verifies that repository constructors
// succeed when given valid database connections
func TestRepositoryConstructors_ValidDB(t *testing.T) {
	// Create a mock/dummy GORM DB (doesn't need to be connected for this test)
	db := &gorm.DB{}

	tests := []struct {
		name        string
		constructor func(*gorm.DB) interface{}
	}{
		{
			name: "PropertyRepository accepts valid DB",
			constructor: func(db *gorm.DB) interface{} {
				return repositories.NewPropertyRepository(db)
			},
		},
		{
			name: "QuestRepository accepts valid DB",
			constructor: func(db *gorm.DB) interface{} {
				return repositories.NewQuestRepository(db)
			},
		},
		{
			name: "UserRepository accepts valid DB",
			constructor: func(db *gorm.DB) interface{} {
				return repositories.NewUserRepository(db)
			},
		},
		{
			name: "TransactionRepository accepts valid DB",
			constructor: func(db *gorm.DB) interface{} {
				return repositories.NewTransactionRepository(db)
			},
		},
		{
			name: "BadgeRepository accepts valid DB",
			constructor: func(db *gorm.DB) interface{} {
				return repositories.NewBadgeRepository(db)
			},
		},
		{
			name: "LeaderboardRepository accepts valid DB",
			constructor: func(db *gorm.DB) interface{} {
				return repositories.NewLeaderboardRepository(db)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Should not panic with valid (non-nil) DB
			assert.NotPanics(t, func() {
				repo := tt.constructor(db)
				assert.NotNil(t, repo, "Repository should be created successfully")
			})
		})
	}
}
