package framework_test

import (
	"errors"
	"fmt"
	"sync"
	"testing"

	"github.com/keshablive/quester/internal/framework/container"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestRegisterSingleton verifies singleton service registration
func TestRegisterSingleton(t *testing.T) {
	c := container.New()

	// Register a simple singleton service
	err := c.RegisterSingleton("test-service", func(c *container.Container) (interface{}, error) {
		return "test-value", nil
	})
	require.NoError(t, err, "RegisterSingleton should succeed")

	// Verify service is registered
	assert.True(t, c.Has("test-service"), "Container should have registered service")
}

// TestRegisterTransient verifies transient service registration
func TestRegisterTransient(t *testing.T) {
	c := container.New()

	counter := 0
	err := c.RegisterTransient("counter-service", func(c *container.Container) (interface{}, error) {
		counter++
		return counter, nil
	})
	require.NoError(t, err, "RegisterTransient should succeed")

	// Verify service is registered
	assert.True(t, c.Has("counter-service"), "Container should have registered service")
}

// TestResolve verifies basic service resolution
func TestResolve(t *testing.T) {
	c := container.New()

	expectedValue := "resolved-value"
	err := c.RegisterSingleton("service", func(c *container.Container) (interface{}, error) {
		return expectedValue, nil
	})
	require.NoError(t, err)

	// Resolve the service
	value, err := c.Resolve("service")
	require.NoError(t, err, "Resolve should succeed")
	assert.Equal(t, expectedValue, value, "Resolved value should match")
}

// TestMustResolve verifies panic behavior on resolution failure
func TestMustResolve(t *testing.T) {
	c := container.New()

	// Register a service
	err := c.RegisterSingleton("service", func(c *container.Container) (interface{}, error) {
		return "value", nil
	})
	require.NoError(t, err)

	// Test successful resolution
	assert.NotPanics(t, func() {
		value := c.MustResolve("service")
		assert.Equal(t, "value", value)
	}, "MustResolve should not panic on success")

	// Test panic on missing service
	assert.Panics(t, func() {
		c.MustResolve("non-existent")
	}, "MustResolve should panic on missing service")
}

// TestResolveTyped verifies type-safe generic resolution
func TestResolveTyped(t *testing.T) {
	c := container.New()

	// Register a service with specific type
	err := c.RegisterSingleton("string-service", func(c *container.Container) (interface{}, error) {
		return "typed-value", nil
	})
	require.NoError(t, err)

	// Resolve with type parameter
	value, err := container.ResolveTyped[string](c, "string-service")
	require.NoError(t, err, "ResolveTyped should succeed")
	assert.Equal(t, "typed-value", value, "Typed value should match")

	// Test wrong type assertion (should fail gracefully)
	_, err = container.ResolveTyped[int](c, "string-service")
	assert.Error(t, err, "ResolveTyped should fail on type mismatch")
}

// TestSingletonLifecycle verifies singleton caching
func TestSingletonLifecycle(t *testing.T) {
	c := container.New()

	counter := 0
	err := c.RegisterSingleton("counter", func(c *container.Container) (interface{}, error) {
		counter++
		return counter, nil
	})
	require.NoError(t, err)

	// Resolve multiple times
	value1, err := c.Resolve("counter")
	require.NoError(t, err)
	value2, err := c.Resolve("counter")
	require.NoError(t, err)
	value3, err := c.Resolve("counter")
	require.NoError(t, err)

	// Singleton should return the same instance (counter called once)
	assert.Equal(t, value1, value2, "Singleton should return same instance")
	assert.Equal(t, value2, value3, "Singleton should return same instance")
	assert.Equal(t, 1, counter, "Factory should be called only once for singleton")
}

// TestTransientLifecycle verifies transient creates new instances
func TestTransientLifecycle(t *testing.T) {
	c := container.New()

	counter := 0
	err := c.RegisterTransient("counter", func(c *container.Container) (interface{}, error) {
		counter++
		return counter, nil
	})
	require.NoError(t, err)

	// Resolve multiple times
	value1, err := c.Resolve("counter")
	require.NoError(t, err)
	value2, err := c.Resolve("counter")
	require.NoError(t, err)
	value3, err := c.Resolve("counter")
	require.NoError(t, err)

	// Transient should create new instances each time
	assert.NotEqual(t, value1, value2, "Transient should create new instance")
	assert.NotEqual(t, value2, value3, "Transient should create new instance")
	assert.Equal(t, 3, counter, "Factory should be called for each transient resolution")
}

// TestCircularDependencyDetection verifies DFS cycle detection
func TestCircularDependencyDetection(t *testing.T) {
	c := container.New()

	// Register service A that depends on B
	err := c.RegisterSingleton("service-a", func(c *container.Container) (interface{}, error) {
		_, err := c.Resolve("service-b")
		if err != nil {
			return nil, err
		}
		return "service-a", nil
	})
	require.NoError(t, err)

	// Register service B that depends on A (circular dependency)
	err = c.RegisterSingleton("service-b", func(c *container.Container) (interface{}, error) {
		_, err := c.Resolve("service-a")
		if err != nil {
			return nil, err
		}
		return "service-b", nil
	})
	require.NoError(t, err)

	// Attempt to resolve A (should detect cycle)
	_, err = c.Resolve("service-a")
	require.Error(t, err, "Should detect circular dependency")

	// Verify error is ErrCircularDependency
	var circErr *container.ErrCircularDependency
	assert.True(t, errors.As(err, &circErr), "Error should be ErrCircularDependency")
	assert.Contains(t, err.Error(), "circular dependency", "Error message should mention circular dependency")
	assert.Contains(t, err.Error(), "service-a", "Error should mention service-a in chain")
	assert.Contains(t, err.Error(), "service-b", "Error should mention service-b in chain")
}

// TestErrServiceNotRegistered verifies missing service error
func TestErrServiceNotRegistered(t *testing.T) {
	c := container.New()

	_, err := c.Resolve("non-existent")
	require.Error(t, err, "Should error on missing service")

	// Verify error type
	var notFoundErr *container.ErrServiceNotRegistered
	assert.True(t, errors.As(err, &notFoundErr), "Error should be ErrServiceNotRegistered")
	assert.Contains(t, err.Error(), "not registered", "Error message should mention not registered")
	assert.Contains(t, err.Error(), "non-existent", "Error message should mention service name")
}

// TestErrInitializationFailed verifies factory error handling
func TestErrInitializationFailed(t *testing.T) {
	c := container.New()

	factoryErr := errors.New("factory failed")
	err := c.RegisterSingleton("failing-service", func(c *container.Container) (interface{}, error) {
		return nil, factoryErr
	})
	require.NoError(t, err, "Registration should succeed")

	// Attempt resolution (should fail with initialization error)
	_, err = c.Resolve("failing-service")
	require.Error(t, err, "Should error on factory failure")

	// Verify error type
	var initErr *container.ErrInitializationFailed
	assert.True(t, errors.As(err, &initErr), "Error should be ErrInitializationFailed")
	assert.Contains(t, err.Error(), "failed to initialize", "Error message should mention failed to initialize")
	assert.Contains(t, err.Error(), "failing-service", "Error message should mention service name")

	// Verify Unwrap() works
	assert.ErrorIs(t, err, factoryErr, "Should unwrap to original factory error")
}

// TestErrInvalidFactory verifies nil factory validation
func TestErrInvalidFactory(t *testing.T) {
	c := container.New()

	// Attempt to register nil factory
	err := c.RegisterSingleton("invalid", nil)
	require.Error(t, err, "Should error on nil factory")

	// Verify error type
	var invalidErr *container.ErrInvalidFactory
	assert.True(t, errors.As(err, &invalidErr), "Error should be ErrInvalidFactory")
	assert.Contains(t, err.Error(), "invalid factory", "Error message should mention invalid factory")
	assert.Contains(t, err.Error(), "invalid", "Error message should mention service name")
}

// TestDependencyResolution verifies nested service resolution
func TestDependencyResolution(t *testing.T) {
	c := container.New()

	// Register dependency chain: service-c depends on service-b depends on service-a
	err := c.RegisterSingleton("service-a", func(c *container.Container) (interface{}, error) {
		return "a", nil
	})
	require.NoError(t, err)

	err = c.RegisterSingleton("service-b", func(c *container.Container) (interface{}, error) {
		a, err := c.Resolve("service-a")
		if err != nil {
			return nil, err
		}
		return fmt.Sprintf("b(%s)", a), nil
	})
	require.NoError(t, err)

	err = c.RegisterSingleton("service-c", func(c *container.Container) (interface{}, error) {
		b, err := c.Resolve("service-b")
		if err != nil {
			return nil, err
		}
		return fmt.Sprintf("c(%s)", b), nil
	})
	require.NoError(t, err)

	// Resolve service-c (should resolve entire chain)
	value, err := c.Resolve("service-c")
	require.NoError(t, err, "Should resolve nested dependencies")
	assert.Equal(t, "c(b(a))", value, "Should resolve full dependency chain")
}

// TestContainerIntrospection verifies Has, Count, List methods
func TestContainerIntrospection(t *testing.T) {
	c := container.New()

	// Register multiple services
	err := c.RegisterSingleton("service-1", func(c *container.Container) (interface{}, error) {
		return "1", nil
	})
	require.NoError(t, err)

	err = c.RegisterSingleton("service-2", func(c *container.Container) (interface{}, error) {
		return "2", nil
	})
	require.NoError(t, err)

	err = c.RegisterTransient("service-3", func(c *container.Container) (interface{}, error) {
		return "3", nil
	})
	require.NoError(t, err)

	// Test Has()
	assert.True(t, c.Has("service-1"), "Should find service-1")
	assert.True(t, c.Has("service-2"), "Should find service-2")
	assert.True(t, c.Has("service-3"), "Should find service-3")
	assert.False(t, c.Has("non-existent"), "Should not find non-existent service")

	// Test Count()
	assert.Equal(t, 3, c.Count(), "Should count all registered services")

	// Test List()
	services := c.List()
	assert.Len(t, services, 3, "Should list all services")
	assert.Contains(t, services, "service-1", "List should include service-1")
	assert.Contains(t, services, "service-2", "List should include service-2")
	assert.Contains(t, services, "service-3", "List should include service-3")
}

// TestConcurrentRegistration verifies thread-safe registration
func TestConcurrentRegistration(t *testing.T) {
	c := container.New()

	const numGoroutines = 100
	var wg sync.WaitGroup
	wg.Add(numGoroutines)

	// Register services concurrently
	for i := 0; i < numGoroutines; i++ {
		i := i
		go func() {
			defer wg.Done()
			serviceName := fmt.Sprintf("service-%d", i)
			err := c.RegisterSingleton(serviceName, func(c *container.Container) (interface{}, error) {
				return i, nil
			})
			assert.NoError(t, err, "Concurrent registration should succeed")
		}()
	}

	wg.Wait()

	// Verify all services registered
	assert.Equal(t, numGoroutines, c.Count(), "All services should be registered")
}

// TestConcurrentResolution verifies thread-safe resolution
func TestConcurrentResolution(t *testing.T) {
	c := container.New()

	// Register a singleton service
	counter := 0
	err := c.RegisterSingleton("singleton", func(c *container.Container) (interface{}, error) {
		counter++
		return "value", nil
	})
	require.NoError(t, err)

	const numGoroutines = 100
	var wg sync.WaitGroup
	wg.Add(numGoroutines)

	// Resolve concurrently
	for i := 0; i < numGoroutines; i++ {
		go func() {
			defer wg.Done()
			value, err := c.Resolve("singleton")
			assert.NoError(t, err, "Concurrent resolution should succeed")
			assert.Equal(t, "value", value, "Should resolve correct value")
		}()
	}

	wg.Wait()

	// Verify singleton was created only once despite concurrent access
	assert.Equal(t, 1, counter, "Singleton factory should be called only once")
}

// TestDuplicateRegistration verifies behavior when registering same service twice
func TestDuplicateRegistration(t *testing.T) {
	c := container.New()

	// Register service
	err := c.RegisterSingleton("service", func(c *container.Container) (interface{}, error) {
		return "first", nil
	})
	require.NoError(t, err)

	// Register again with different factory (should replace)
	err = c.RegisterSingleton("service", func(c *container.Container) (interface{}, error) {
		return "second", nil
	})
	require.NoError(t, err, "Should allow re-registration (replacement)")

	// Resolve (should get latest registration)
	value, err := c.Resolve("service")
	require.NoError(t, err)
	assert.Equal(t, "second", value, "Should resolve latest registered factory")
}

// TestComplexDependencyChain verifies resolution of complex dependency graph
func TestComplexDependencyChain(t *testing.T) {
	c := container.New()

	// Create a diamond dependency: D depends on B and C, both depend on A
	err := c.RegisterSingleton("A", func(c *container.Container) (interface{}, error) {
		return "A", nil
	})
	require.NoError(t, err)

	err = c.RegisterSingleton("B", func(c *container.Container) (interface{}, error) {
		a, err := c.Resolve("A")
		if err != nil {
			return nil, err
		}
		return fmt.Sprintf("B(%s)", a), nil
	})
	require.NoError(t, err)

	err = c.RegisterSingleton("C", func(c *container.Container) (interface{}, error) {
		a, err := c.Resolve("A")
		if err != nil {
			return nil, err
		}
		return fmt.Sprintf("C(%s)", a), nil
	})
	require.NoError(t, err)

	err = c.RegisterSingleton("D", func(c *container.Container) (interface{}, error) {
		b, err := c.Resolve("B")
		if err != nil {
			return nil, err
		}
		cVal, err := c.Resolve("C")
		if err != nil {
			return nil, err
		}
		return fmt.Sprintf("D(%s,%s)", b, cVal), nil
	})
	require.NoError(t, err)

	// Resolve D (should resolve entire diamond)
	value, err := c.Resolve("D")
	require.NoError(t, err, "Should resolve diamond dependency")
	assert.Equal(t, "D(B(A),C(A))", value, "Should resolve complex dependency graph")
}

// BenchmarkSingletonResolution measures singleton resolution performance
func BenchmarkSingletonResolution(b *testing.B) {
	c := container.New()

	err := c.RegisterSingleton("service", func(c *container.Container) (interface{}, error) {
		return "value", nil
	})
	require.NoError(b, err)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = c.Resolve("service")
	}
}

// BenchmarkTransientResolution measures transient resolution performance
func BenchmarkTransientResolution(b *testing.B) {
	c := container.New()

	err := c.RegisterTransient("service", func(c *container.Container) (interface{}, error) {
		return "value", nil
	})
	require.NoError(b, err)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = c.Resolve("service")
	}
}
