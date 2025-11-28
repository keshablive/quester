package framework_test

import (
	"testing"

	"github.com/keshablive/quester/internal/framework/service"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewBaseService_WithDB(t *testing.T) {
	// Test that BaseService requires a DB connection
	base := service.NewBaseService(nil, nil, nil, nil)
	require.NotNil(t, base)
	assert.Nil(t, base.GetDB())
}

func TestBaseService_GetLogger_Default(t *testing.T) {
	// Test that GetLogger returns a logger even without one being provided
	base := service.NewBaseService(nil, nil, nil, nil)
	logger := base.GetLogger()

	// Should return a default logger, not panic
	require.NotNil(t, logger)
}

func TestBaseService_HasCache(t *testing.T) {
	// Test HasCache returns false when no cache provided
	base := service.NewBaseService(nil, nil, nil, nil)
	assert.False(t, base.HasCache())
}

func TestBaseService_GetTxManager(t *testing.T) {
	// Test that GetTxManager returns the transaction manager
	base := service.NewBaseService(nil, nil, nil, nil)

	// Should return the tx manager (could be nil if not provided)
	// But the method should not panic
	txm := base.GetTxManager()
	assert.Nil(t, txm)
}

func TestBaseService_Errors(t *testing.T) {
	// Test service error helpers
	testCases := []struct {
		name     string
		err      error
		checkFn  func(error) bool
		expected bool
	}{
		{
			name:     "IsNotFound_true",
			err:      service.ErrNotFound,
			checkFn:  service.IsNotFound,
			expected: true,
		},
		{
			name:     "IsNotFound_false",
			err:      service.ErrConflict,
			checkFn:  service.IsNotFound,
			expected: false,
		},
		{
			name:     "IsConflict_true",
			err:      service.ErrConflict,
			checkFn:  service.IsConflict,
			expected: true,
		},
		{
			name:     "IsTransactionError_savepointFailed",
			err:      service.ErrSavepointFailed,
			checkFn:  service.IsTransactionError,
			expected: true,
		},
		{
			name:     "IsTransactionError_txFailed",
			err:      service.ErrTransactionFailed,
			checkFn:  service.IsTransactionError,
			expected: true,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result := tc.checkFn(tc.err)
			assert.Equal(t, tc.expected, result)
		})
	}
}
