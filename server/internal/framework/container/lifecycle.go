package container

import (
	"sync"
)

// Lifecycle represents a service lifecycle (Singleton, Transient, Scoped)
type Lifecycle int

const (
	// Singleton services are created once and reused
	Singleton Lifecycle = iota
	// Transient services are created on every resolution
	Transient
	// Scoped services are created once per scope (future feature)
	Scoped
)

// ServiceDefinition holds metadata about a registered service
type ServiceDefinition struct {
	Name      string
	Factory   FactoryFunc
	Lifecycle Lifecycle
	Instance  interface{}
	mu        sync.RWMutex
}

// GetInstance returns the cached instance for singleton services
func (sd *ServiceDefinition) GetInstance() interface{} {
	sd.mu.RLock()
	defer sd.mu.RUnlock()
	return sd.Instance
}

// SetInstance sets the cached instance for singleton services
func (sd *ServiceDefinition) SetInstance(instance interface{}) {
	sd.mu.Lock()
	defer sd.mu.Unlock()
	sd.Instance = instance
}

// ResolutionContext tracks the service resolution chain to detect circular dependencies
type ResolutionContext struct {
	Chain []string
	mu    sync.RWMutex
}

// NewResolutionContext creates a new resolution context
func NewResolutionContext() *ResolutionContext {
	return &ResolutionContext{
		Chain: make([]string, 0),
	}
}

// Push adds a service to the resolution chain
func (rc *ResolutionContext) Push(serviceName string) {
	rc.mu.Lock()
	defer rc.mu.Unlock()
	rc.Chain = append(rc.Chain, serviceName)
}

// Pop removes the last service from the resolution chain
func (rc *ResolutionContext) Pop() {
	rc.mu.Lock()
	defer rc.mu.Unlock()
	if len(rc.Chain) > 0 {
		rc.Chain = rc.Chain[:len(rc.Chain)-1]
	}
}

// Contains checks if a service is already in the resolution chain (circular dependency)
func (rc *ResolutionContext) Contains(serviceName string) bool {
	rc.mu.RLock()
	defer rc.mu.RUnlock()
	for _, name := range rc.Chain {
		if name == serviceName {
			return true
		}
	}
	return false
}

// GetChain returns a copy of the current resolution chain
func (rc *ResolutionContext) GetChain() []string {
	rc.mu.RLock()
	defer rc.mu.RUnlock()
	chain := make([]string, len(rc.Chain))
	copy(chain, rc.Chain)
	return chain
}
