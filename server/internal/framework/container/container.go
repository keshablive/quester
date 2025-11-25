package container

import (
	"context"
	"fmt"
	"log"
	"runtime"
	"strconv"
	"strings"
	"sync"
)

// FactoryFunc is a function that creates a service instance
type FactoryFunc func(c *Container) (interface{}, error)

// MockProvider is an interface for services that can provide mock implementations
// When UseMocks is enabled, the container will call ProvidesMock() to get mock factory
type MockProvider interface {
	ProvidesMock() FactoryFunc
}

// Container is the dependency injection container that manages service lifecycle
type Container struct {
	registry           *Registry
	mu                 sync.RWMutex
	resolutionContexts sync.Map               // map[goroutineID]*ResolutionContext
	useMocks           bool                   // Flag to enable mock injection (set via SetUseMocks)
	mockFactories      map[string]FactoryFunc // Registry of mock factories
}

// New creates a new DI container
func New() *Container {
	return &Container{
		registry:      NewRegistry(),
		mockFactories: make(map[string]FactoryFunc),
	}
}

// SetUseMocks enables or disables mock injection mode
// When enabled, services registered with RegisterWithMock will use their mock factory
func (c *Container) SetUseMocks(enabled bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.useMocks = enabled
	if enabled {
		log.Printf("🧪 Mock injection enabled - using mock implementations")
	}
}

// UseMocks returns whether mock injection is enabled
func (c *Container) UseMocks() bool {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.useMocks
}

// RegisterSingletonWithMock registers a service with both real and mock factories
// When UseMocks is true, the mock factory will be used instead of the real factory
func (c *Container) RegisterSingletonWithMock(name string, realFactory FactoryFunc, mockFactory FactoryFunc) error {
	c.mu.Lock()
	c.mockFactories[name] = mockFactory
	c.mu.Unlock()
	return c.registry.Register(name, realFactory, Singleton)
}

// RegisterTransientWithMock registers a transient service with both real and mock factories
func (c *Container) RegisterTransientWithMock(name string, realFactory FactoryFunc, mockFactory FactoryFunc) error {
	c.mu.Lock()
	c.mockFactories[name] = mockFactory
	c.mu.Unlock()
	return c.registry.Register(name, realFactory, Transient)
}

// RegisterMockFactory registers a mock factory for an existing service
// This allows adding mocks separately from the original registration
func (c *Container) RegisterMockFactory(name string, mockFactory FactoryFunc) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.mockFactories[name] = mockFactory
}

// RegisterSingleton registers a service with singleton lifecycle
// The factory function is called once, and the instance is cached
func (c *Container) RegisterSingleton(name string, factory FactoryFunc) error {
	return c.registry.Register(name, factory, Singleton)
}

// RegisterTransient registers a service with transient lifecycle
// The factory function is called every time the service is resolved
func (c *Container) RegisterTransient(name string, factory FactoryFunc) error {
	return c.registry.Register(name, factory, Transient)
}

// getGoroutineID returns the current goroutine ID for context tracking
func getGoroutineID() uint64 {
	var buf [64]byte
	n := runtime.Stack(buf[:], false)
	// Format: "goroutine 123 [running]:"
	idField := strings.Fields(strings.TrimPrefix(string(buf[:n]), "goroutine "))[0]
	id, _ := strconv.ParseUint(idField, 10, 64)
	return id
}

// getOrCreateContext returns the resolution context for the current goroutine
func (c *Container) getOrCreateContext() *ResolutionContext {
	gid := getGoroutineID()
	if ctx, ok := c.resolutionContexts.Load(gid); ok {
		return ctx.(*ResolutionContext)
	}
	ctx := NewResolutionContext()
	c.resolutionContexts.Store(gid, ctx)
	return ctx
}

// cleanupContext removes the resolution context for the current goroutine
func (c *Container) cleanupContext() {
	gid := getGoroutineID()
	c.resolutionContexts.Delete(gid)
}

// Resolve resolves a service by name and returns it along with any error
func (c *Container) Resolve(name string) (interface{}, error) {
	// Get or create resolution context for this goroutine
	ctx := c.getOrCreateContext()

	// Check if this is the top-level call (empty chain)
	isTopLevel := len(ctx.GetChain()) == 0

	// Perform resolution
	result, err := c.resolveWithContext(name, ctx)

	// Clean up context only if this was the top-level call
	if isTopLevel {
		c.cleanupContext()
	}

	return result, err
}

// MustResolve resolves a service by name and panics if resolution fails
// This should be used for required services during application startup
func (c *Container) MustResolve(name string) interface{} {
	instance, err := c.Resolve(name)
	if err != nil {
		panic(fmt.Sprintf("failed to resolve required service '%s': %v", name, err))
	}
	return instance
}

// OptionalResolve resolves a service by name and returns nil if resolution fails
// This should be used for optional services that can gracefully degrade
// T121: Logs a warning when optional service fails to resolve
func (c *Container) OptionalResolve(name string) interface{} {
	instance, err := c.Resolve(name)
	if err != nil {
		log.Printf("⚠ Optional service '%s' unavailable: %v (degraded mode)", name, err)
		return nil
	}
	return instance
}

// OptionalResolveTyped resolves an optional service by name with type assertion
// Returns zero value and logs warning if resolution fails (T121)
func OptionalResolveTyped[T any](c *Container, name string) T {
	var zero T
	instance := c.OptionalResolve(name)
	if instance == nil {
		return zero
	}

	typed, ok := instance.(T)
	if !ok {
		log.Printf("⚠ Optional service '%s' type assertion failed (degraded mode)", name)
		return zero
	}

	return typed
}

// ResolveTyped resolves a service by name and returns it with type assertion
// This provides type-safe resolution using Go generics (Go 1.18+)
func ResolveTyped[T any](c *Container, name string) (T, error) {
	var zero T
	instance, err := c.Resolve(name)
	if err != nil {
		return zero, err
	}

	typed, ok := instance.(T)
	if !ok {
		return zero, fmt.Errorf("service '%s' cannot be cast to requested type", name)
	}

	return typed, nil
}

// MustResolveTyped resolves a service by name with type assertion and panics on failure
func MustResolveTyped[T any](c *Container, name string) T {
	typed, err := ResolveTyped[T](c, name)
	if err != nil {
		panic(fmt.Sprintf("failed to resolve required service '%s': %v", name, err))
	}
	return typed
}

// resolveWithContext resolves a service with circular dependency detection
func (c *Container) resolveWithContext(name string, ctx *ResolutionContext) (interface{}, error) {
	// Check for circular dependency
	if ctx.Contains(name) {
		return nil, &ErrCircularDependency{
			ServiceName: name,
			Chain:       ctx.GetChain(),
		}
	}

	// Get service definition
	def, exists := c.registry.Get(name)
	if !exists {
		return nil, &ErrServiceNotRegistered{ServiceName: name}
	}

	// For singleton, check if already instantiated
	if def.Lifecycle == Singleton {
		if instance := def.GetInstance(); instance != nil {
			return instance, nil
		}
	}

	// Push to resolution context for circular dependency detection
	ctx.Push(name)
	defer ctx.Pop()

	// Determine which factory to use
	factory := def.Factory

	// If mock mode is enabled and a mock factory exists for this service, use it
	c.mu.RLock()
	if c.useMocks {
		if mockFactory, hasMock := c.mockFactories[name]; hasMock {
			factory = mockFactory
			log.Printf("🧪 Using mock factory for service: %s", name)
		}
	}
	c.mu.RUnlock()

	// Call factory to create instance
	instance, err := factory(c)
	if err != nil {
		return nil, &ErrInitializationFailed{
			ServiceName: name,
			Cause:       err,
		}
	}

	// Cache singleton instances
	if def.Lifecycle == Singleton {
		def.SetInstance(instance)
	}

	return instance, nil
}

// Has checks if a service is registered in the container
func (c *Container) Has(name string) bool {
	return c.registry.Has(name)
}

// Count returns the number of registered services
func (c *Container) Count() int {
	return c.registry.Count()
}

// List returns all registered service names
func (c *Container) List() []string {
	return c.registry.List()
}

// Shutdown gracefully shuts down all singleton services that implement io.Closer
// This should be called during application shutdown
func (c *Container) Shutdown(ctx context.Context) error {
	// TODO: Implement graceful shutdown for services that need cleanup
	// For now, this is a placeholder for future implementation
	return nil
}
