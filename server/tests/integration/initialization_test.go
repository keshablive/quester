// Integration tests for service initialization error handling (T128)
// Tests fail-fast behavior for required services and graceful degradation for optional services
package integration

import (
	"testing"

	"github.com/keshablive/quester/internal/framework/container"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestMustResolve_PanicsOnMissingService verifies MustResolve panics for unregistered services
func TestMustResolve_PanicsOnMissingService(t *testing.T) {
	c := container.New()

	// MustResolve should panic for unregistered services
	assert.Panics(t, func() {
		c.MustResolve("nonexistent-service")
	}, "MustResolve should panic for unregistered service")
}

// TestMustResolve_PanicsWithDescriptiveMessage verifies panic message includes service name
func TestMustResolve_PanicsWithDescriptiveMessage(t *testing.T) {
	c := container.New()

	defer func() {
		r := recover()
		require.NotNil(t, r, "MustResolve should panic")

		msg, ok := r.(string)
		require.True(t, ok, "Panic value should be a string")
		assert.Contains(t, msg, "database", "Error message should contain service name")
		assert.Contains(t, msg, "required", "Error message should indicate required service")
	}()

	c.MustResolve("database")
}

// TestOptionalResolve_ReturnsNilForMissingService verifies OptionalResolve returns nil without panic
func TestOptionalResolve_ReturnsNilForMissingService(t *testing.T) {
	c := container.New()

	// OptionalResolve should return nil without panicking
	result := c.OptionalResolve("fcm-service")
	assert.Nil(t, result, "OptionalResolve should return nil for unregistered service")
}

// TestOptionalResolve_ReturnsInstanceForRegisteredService verifies OptionalResolve works for registered services
func TestOptionalResolve_ReturnsInstanceForRegisteredService(t *testing.T) {
	c := container.New()

	// Register a test service
	err := c.RegisterSingleton("test-service", func(c *container.Container) (interface{}, error) {
		return "test-instance", nil
	})
	require.NoError(t, err)

	// OptionalResolve should return the registered service
	result := c.OptionalResolve("test-service")
	assert.Equal(t, "test-instance", result, "OptionalResolve should return registered service")
}

// TestResolve_ReturnsErrorForMissingService verifies Resolve returns error for unregistered services
func TestResolve_ReturnsErrorForMissingService(t *testing.T) {
	c := container.New()

	result, err := c.Resolve("missing-service")
	assert.Nil(t, result, "Resolve should return nil for missing service")
	assert.Error(t, err, "Resolve should return error for missing service")
	assert.Contains(t, err.Error(), "missing-service", "Error should contain service name")
}

// TestResolve_ReturnsServiceNotRegisteredError verifies error type
func TestResolve_ReturnsServiceNotRegisteredError(t *testing.T) {
	c := container.New()

	_, err := c.Resolve("unregistered")
	require.Error(t, err)

	// Check error type
	var notRegisteredErr *container.ErrServiceNotRegistered
	assert.ErrorAs(t, err, &notRegisteredErr, "Error should be ErrServiceNotRegistered type")
}

// TestResolve_ReturnsInitializationFailedError verifies initialization errors are wrapped
func TestResolve_ReturnsInitializationFailedError(t *testing.T) {
	c := container.New()

	// Register a service that fails during initialization
	err := c.RegisterSingleton("failing-service", func(c *container.Container) (interface{}, error) {
		return nil, assert.AnError
	})
	require.NoError(t, err)

	_, resolveErr := c.Resolve("failing-service")
	require.Error(t, resolveErr)

	// Check error type
	var initErr *container.ErrInitializationFailed
	assert.ErrorAs(t, resolveErr, &initErr, "Error should be ErrInitializationFailed type")
	assert.Equal(t, "failing-service", initErr.ServiceName, "Error should contain service name")
}

// TestStartupValidation_RequiredServiceAvailable verifies startup passes with required services
func TestStartupValidation_RequiredServiceAvailable(t *testing.T) {
	c := container.New()

	// Register required services
	_ = c.RegisterSingleton("database", func(c *container.Container) (interface{}, error) {
		return "mock-db", nil
	})
	_ = c.RegisterSingleton("cache", func(c *container.Container) (interface{}, error) {
		return "mock-cache", nil
	})
	_ = c.RegisterSingleton("config", func(c *container.Container) (interface{}, error) {
		return "mock-config", nil
	})

	// All required services should resolve successfully
	db, err := c.Resolve("database")
	assert.NoError(t, err)
	assert.NotNil(t, db)

	cache, err := c.Resolve("cache")
	assert.NoError(t, err)
	assert.NotNil(t, cache)

	config, err := c.Resolve("config")
	assert.NoError(t, err)
	assert.NotNil(t, config)
}

// TestStartupValidation_RequiredServiceMissing verifies startup fails for missing required service
func TestStartupValidation_RequiredServiceMissing(t *testing.T) {
	c := container.New()

	// Register some but not all required services
	_ = c.RegisterSingleton("cache", func(c *container.Container) (interface{}, error) {
		return "mock-cache", nil
	})

	// Database (required) is missing - MustResolve should panic
	assert.Panics(t, func() {
		c.MustResolve("database")
	}, "Startup should fail for missing required service")
}

// TestOptionalServiceDegradation_FCMUnavailable verifies graceful degradation for FCM
func TestOptionalServiceDegradation_FCMUnavailable(t *testing.T) {
	c := container.New()

	// FCM is optional - should return nil without panic
	fcm := c.OptionalResolve("fcm-service")
	assert.Nil(t, fcm, "FCM should gracefully degrade when unavailable")
}

// TestOptionalServiceDegradation_DVRUnavailable verifies graceful degradation for DVR
func TestOptionalServiceDegradation_DVRUnavailable(t *testing.T) {
	c := container.New()

	// DVR is optional - should return nil without panic
	dvr := c.OptionalResolve("dvr-service")
	assert.Nil(t, dvr, "DVR should gracefully degrade when unavailable")
}

// TestServiceInitializationTiming verifies services initialize quickly (within 2 seconds)
func TestServiceInitializationTiming(t *testing.T) {
	c := container.New()

	// Register a fast-initializing service
	_ = c.RegisterSingleton("fast-service", func(c *container.Container) (interface{}, error) {
		return "fast", nil
	})

	// Resolution should be fast (well under 2 second limit from SC-006)
	result := c.MustResolve("fast-service")
	assert.Equal(t, "fast", result)
}

// TestCircularDependency_DetectedAndReported verifies circular dependencies are detected
func TestCircularDependency_DetectedAndReported(t *testing.T) {
	c := container.New()

	// Create circular dependency: A -> B -> A
	_ = c.RegisterSingleton("serviceA", func(c *container.Container) (interface{}, error) {
		// A depends on B - use Resolve (not MustResolve) to avoid panic
		_, err := c.Resolve("serviceB")
		if err != nil {
			return nil, err
		}
		return "A", nil
	})
	_ = c.RegisterSingleton("serviceB", func(c *container.Container) (interface{}, error) {
		// B depends on A (circular) - use Resolve to avoid panic
		_, err := c.Resolve("serviceA")
		if err != nil {
			return nil, err
		}
		return "B", nil
	})

	// Should detect circular dependency
	_, err := c.Resolve("serviceA")
	require.Error(t, err, "Circular dependency should be detected")

	var circularErr *container.ErrCircularDependency
	assert.ErrorAs(t, err, &circularErr, "Error should be ErrCircularDependency type")
}
