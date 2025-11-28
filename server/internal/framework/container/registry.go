package container

import (
	"sync"
)

// Registry maintains the mapping of service names to their definitions
type Registry struct {
	services map[string]*ServiceDefinition
	mu       sync.RWMutex
}

// NewRegistry creates a new service registry
func NewRegistry() *Registry {
	return &Registry{
		services: make(map[string]*ServiceDefinition),
	}
}

// Register adds a service definition to the registry
func (r *Registry) Register(name string, factory FactoryFunc, lifecycle Lifecycle) error {
	if factory == nil {
		return &ErrInvalidFactory{ServiceName: name}
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	r.services[name] = &ServiceDefinition{
		Name:      name,
		Factory:   factory,
		Lifecycle: lifecycle,
		Instance:  nil,
	}

	return nil
}

// Get retrieves a service definition by name
func (r *Registry) Get(name string) (*ServiceDefinition, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	def, exists := r.services[name]
	return def, exists
}

// Has checks if a service is registered
func (r *Registry) Has(name string) bool {
	r.mu.RLock()
	defer r.mu.RUnlock()

	_, exists := r.services[name]
	return exists
}

// Count returns the number of registered services
func (r *Registry) Count() int {
	r.mu.RLock()
	defer r.mu.RUnlock()

	return len(r.services)
}

// List returns all registered service names
func (r *Registry) List() []string {
	r.mu.RLock()
	defer r.mu.RUnlock()

	names := make([]string, 0, len(r.services))
	for name := range r.services {
		names = append(names, name)
	}
	return names
}
