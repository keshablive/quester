// Integration tests for mock injection feature (T040)
// Tests USE_MOCKS environment variable toggle and mock/real service switching
package integration

import (
	"testing"

	"github.com/keshablive/quester/internal/framework/container"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// MockPaymentService is a mock implementation for testing
type MockPaymentService struct {
	Name string
}

func (m *MockPaymentService) ProcessPayment(amount float64) error {
	return nil
}

// RealPaymentService is a real implementation for testing
type RealPaymentService struct {
	APIKey string
}

func (r *RealPaymentService) ProcessPayment(amount float64) error {
	return nil
}

// TestMockInjection_MockModeDisabled verifies real services are used when USE_MOCKS=false
func TestMockInjection_MockModeDisabled(t *testing.T) {
	c := container.New()

	// Mock mode is disabled by default
	assert.False(t, c.UseMocks(), "Mock mode should be disabled by default")

	// Register service with both real and mock factories
	err := c.RegisterSingletonWithMock("PaymentService",
		func(c *container.Container) (interface{}, error) {
			return &RealPaymentService{APIKey: "real-key"}, nil
		},
		func(c *container.Container) (interface{}, error) {
			return &MockPaymentService{Name: "mock"}, nil
		},
	)
	require.NoError(t, err)

	// Resolve should return real service
	service, err := c.Resolve("PaymentService")
	require.NoError(t, err)

	realService, ok := service.(*RealPaymentService)
	assert.True(t, ok, "Should resolve to RealPaymentService when mock mode is disabled")
	assert.Equal(t, "real-key", realService.APIKey)
}

// TestMockInjection_MockModeEnabled verifies mock services are used when USE_MOCKS=true
func TestMockInjection_MockModeEnabled(t *testing.T) {
	c := container.New()

	// Enable mock mode
	c.SetUseMocks(true)
	assert.True(t, c.UseMocks(), "Mock mode should be enabled")

	// Register service with both real and mock factories
	err := c.RegisterSingletonWithMock("PaymentService",
		func(c *container.Container) (interface{}, error) {
			return &RealPaymentService{APIKey: "real-key"}, nil
		},
		func(c *container.Container) (interface{}, error) {
			return &MockPaymentService{Name: "mock"}, nil
		},
	)
	require.NoError(t, err)

	// Resolve should return mock service
	service, err := c.Resolve("PaymentService")
	require.NoError(t, err)

	mockService, ok := service.(*MockPaymentService)
	assert.True(t, ok, "Should resolve to MockPaymentService when mock mode is enabled")
	assert.Equal(t, "mock", mockService.Name)
}

// TestMockInjection_FallbackToRealWhenNoMock verifies real service is used when no mock is registered
func TestMockInjection_FallbackToRealWhenNoMock(t *testing.T) {
	c := container.New()

	// Enable mock mode
	c.SetUseMocks(true)

	// Register only real service (no mock)
	err := c.RegisterSingleton("DatabaseService", func(c *container.Container) (interface{}, error) {
		return &RealPaymentService{APIKey: "db-connection"}, nil
	})
	require.NoError(t, err)

	// Should fall back to real service when no mock is registered
	service, err := c.Resolve("DatabaseService")
	require.NoError(t, err)
	assert.NotNil(t, service, "Should resolve to real service when no mock is registered")
}

// TestMockInjection_ToggleModeAtRuntime verifies mock mode can be toggled
func TestMockInjection_ToggleModeAtRuntime(t *testing.T) {
	c := container.New()

	// Start with mock mode disabled
	assert.False(t, c.UseMocks())

	// Enable mock mode
	c.SetUseMocks(true)
	assert.True(t, c.UseMocks())

	// Disable mock mode
	c.SetUseMocks(false)
	assert.False(t, c.UseMocks())
}

// TestMockInjection_MustResolveUsesMocks verifies MustResolve respects mock mode
func TestMockInjection_MustResolveUsesMocks(t *testing.T) {
	c := container.New()
	c.SetUseMocks(true)

	// Register service with mock factory
	err := c.RegisterSingletonWithMock("AuthService",
		func(c *container.Container) (interface{}, error) {
			return &RealPaymentService{APIKey: "real-auth"}, nil
		},
		func(c *container.Container) (interface{}, error) {
			return &MockPaymentService{Name: "mock-auth"}, nil
		},
	)
	require.NoError(t, err)

	// MustResolve should return mock
	service := c.MustResolve("AuthService")
	mockService, ok := service.(*MockPaymentService)
	assert.True(t, ok, "MustResolve should return mock service when mock mode is enabled")
	assert.Equal(t, "mock-auth", mockService.Name)
}

// TestMockInjection_OptionalResolveUsesMocks verifies OptionalResolve respects mock mode
func TestMockInjection_OptionalResolveUsesMocks(t *testing.T) {
	c := container.New()
	c.SetUseMocks(true)

	// Register service with mock factory
	err := c.RegisterSingletonWithMock("CacheService",
		func(c *container.Container) (interface{}, error) {
			return &RealPaymentService{APIKey: "real-cache"}, nil
		},
		func(c *container.Container) (interface{}, error) {
			return &MockPaymentService{Name: "mock-cache"}, nil
		},
	)
	require.NoError(t, err)

	// OptionalResolve should return mock
	service := c.OptionalResolve("CacheService")
	require.NotNil(t, service)

	mockService, ok := service.(*MockPaymentService)
	assert.True(t, ok, "OptionalResolve should return mock service when mock mode is enabled")
	assert.Equal(t, "mock-cache", mockService.Name)
}

// TestMockInjection_RegisterMockFactorySeparately verifies adding mock factory after registration
func TestMockInjection_RegisterMockFactorySeparately(t *testing.T) {
	c := container.New()

	// Register real service first
	err := c.RegisterSingleton("EmailService", func(c *container.Container) (interface{}, error) {
		return &RealPaymentService{APIKey: "real-email"}, nil
	})
	require.NoError(t, err)

	// Add mock factory separately
	c.RegisterMockFactory("EmailService", func(c *container.Container) (interface{}, error) {
		return &MockPaymentService{Name: "mock-email"}, nil
	})

	// Without mock mode, should return real
	service, err := c.Resolve("EmailService")
	require.NoError(t, err)
	realService, ok := service.(*RealPaymentService)
	assert.True(t, ok, "Should resolve to real service when mock mode is disabled")
	assert.Equal(t, "real-email", realService.APIKey)

	// Enable mock mode - need a new container since singleton is already resolved
	c2 := container.New()
	c2.SetUseMocks(true)

	err = c2.RegisterSingleton("EmailService", func(c *container.Container) (interface{}, error) {
		return &RealPaymentService{APIKey: "real-email"}, nil
	})
	require.NoError(t, err)

	c2.RegisterMockFactory("EmailService", func(c *container.Container) (interface{}, error) {
		return &MockPaymentService{Name: "mock-email"}, nil
	})

	service2, err := c2.Resolve("EmailService")
	require.NoError(t, err)
	mockService, ok := service2.(*MockPaymentService)
	assert.True(t, ok, "Should resolve to mock service when mock mode is enabled")
	assert.Equal(t, "mock-email", mockService.Name)
}
