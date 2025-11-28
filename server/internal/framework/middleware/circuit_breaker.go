package middleware

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

// CircuitState represents the current state of the circuit breaker
type CircuitState int

const (
	// StateClosed normal operation, requests pass through
	StateClosed CircuitState = iota
	// StateOpen circuit is open, requests are rejected immediately
	StateOpen
	// StateHalfOpen testing if service has recovered
	StateHalfOpen
)

func (s CircuitState) String() string {
	switch s {
	case StateClosed:
		return "closed"
	case StateOpen:
		return "open"
	case StateHalfOpen:
		return "half-open"
	default:
		return "unknown"
	}
}

// CircuitBreakerConfig holds configuration for the circuit breaker
type CircuitBreakerConfig struct {
	// Timeout threshold - requests exceeding this duration are aborted
	Timeout time.Duration
	// FailureThreshold number of consecutive failures before opening circuit
	FailureThreshold int
	// SuccessThreshold number of consecutive successes to close circuit from half-open
	SuccessThreshold int
	// OpenTimeout duration to wait before moving from Open to HalfOpen
	OpenTimeout time.Duration
	// MaxConcurrentRequests max concurrent requests allowed in HalfOpen state
	MaxConcurrentRequests int
}

// DefaultCircuitBreakerConfig returns sensible defaults
func DefaultCircuitBreakerConfig() CircuitBreakerConfig {
	return CircuitBreakerConfig{
		Timeout:               5 * time.Second,
		FailureThreshold:      3,
		SuccessThreshold:      2,
		OpenTimeout:           1 * time.Second, // Start with 1s, then exponential backoff
		MaxConcurrentRequests: 1,
	}
}

// CircuitBreaker implements circuit breaker pattern with state machine
type CircuitBreaker struct {
	config CircuitBreakerConfig

	mu                   sync.RWMutex
	state                CircuitState
	consecutiveFailures  int
	consecutiveSuccesses int
	lastStateChange      time.Time
	currentBackoff       time.Duration
	halfOpenRequests     int

	// Prometheus metrics
	stateGauge       prometheus.Gauge
	requestsTotal    *prometheus.CounterVec
	timeoutsTotal    prometheus.Counter
	stateTransitions *prometheus.CounterVec
}

// NewCircuitBreaker creates a new circuit breaker with the given config
func NewCircuitBreaker(config CircuitBreakerConfig) *CircuitBreaker {
	if config.Timeout <= 0 {
		config.Timeout = 5 * time.Second
	}
	if config.FailureThreshold <= 0 {
		config.FailureThreshold = 3
	}
	if config.SuccessThreshold <= 0 {
		config.SuccessThreshold = 2
	}
	if config.OpenTimeout <= 0 {
		config.OpenTimeout = 1 * time.Second
	}
	if config.MaxConcurrentRequests <= 0 {
		config.MaxConcurrentRequests = 1
	}

	cb := &CircuitBreaker{
		config:          config,
		state:           StateClosed,
		lastStateChange: time.Now(),
		currentBackoff:  config.OpenTimeout,

		stateGauge: promauto.NewGauge(prometheus.GaugeOpts{
			Name: "circuit_breaker_state",
			Help: "Current circuit breaker state (0=closed, 1=open, 2=half-open)",
		}),
		requestsTotal: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Name: "circuit_breaker_requests_total",
				Help: "Total number of requests processed by circuit breaker",
			},
			[]string{"state", "result"},
		),
		timeoutsTotal: promauto.NewCounter(prometheus.CounterOpts{
			Name: "circuit_breaker_timeouts_total",
			Help: "Total number of requests that exceeded timeout threshold",
		}),
		stateTransitions: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Name: "circuit_breaker_state_transitions_total",
				Help: "Total number of circuit breaker state transitions",
			},
			[]string{"from", "to"},
		),
	}

	return cb
}

// Middleware returns a Fiber middleware function
func (cb *CircuitBreaker) Middleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Check if circuit is open
		if !cb.canProceed() {
			cb.requestsTotal.WithLabelValues(cb.getState().String(), "rejected").Inc()
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
				"error": "Service temporarily unavailable",
				"type":  "circuit_breaker_open",
			})
		}

		// Create timeout context
		ctx, cancel := context.WithTimeout(c.Context(), cb.config.Timeout)
		defer cancel()

		// Execute request with timeout
		startTime := time.Now()
		done := make(chan error, 1)

		go func() {
			done <- c.Next()
		}()

		select {
		case <-ctx.Done():
			// Request exceeded timeout
			cb.timeoutsTotal.Inc()
			cb.onFailure()
			cb.requestsTotal.WithLabelValues(cb.getState().String(), "timeout").Inc()

			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
				"error":   "Request timeout",
				"type":    "timeout",
				"timeout": cb.config.Timeout.String(),
			})

		case err := <-done:
			// Request completed
			duration := time.Since(startTime)

			if err != nil || c.Response().StatusCode() >= 500 {
				cb.onFailure()
				cb.requestsTotal.WithLabelValues(cb.getState().String(), "failure").Inc()
			} else {
				cb.onSuccess()
				cb.requestsTotal.WithLabelValues(cb.getState().String(), "success").Inc()
			}

			// Log slow requests (even if successful)
			if duration > cb.config.Timeout*80/100 { // 80% of timeout
				fmt.Printf("Slow request: %s took %v (threshold: %v)\n",
					c.Path(), duration, cb.config.Timeout)
			}

			return err
		}
	}
}

// canProceed checks if the request can proceed based on circuit state
func (cb *CircuitBreaker) canProceed() bool {
	cb.mu.Lock()
	defer cb.mu.Unlock()

	switch cb.state {
	case StateClosed:
		return true

	case StateOpen:
		// Check if enough time has passed to try half-open
		if time.Since(cb.lastStateChange) >= cb.currentBackoff {
			cb.transitionTo(StateHalfOpen)
			return true
		}
		return false

	case StateHalfOpen:
		// Allow limited requests through
		if cb.halfOpenRequests < cb.config.MaxConcurrentRequests {
			cb.halfOpenRequests++
			return true
		}
		return false

	default:
		return false
	}
}

// onSuccess handles a successful request
func (cb *CircuitBreaker) onSuccess() {
	cb.mu.Lock()
	defer cb.mu.Unlock()

	switch cb.state {
	case StateClosed:
		// Reset failure count on success
		cb.consecutiveFailures = 0

	case StateHalfOpen:
		cb.consecutiveSuccesses++
		cb.halfOpenRequests--

		if cb.consecutiveSuccesses >= cb.config.SuccessThreshold {
			// Enough successes, close the circuit
			cb.transitionTo(StateClosed)
			cb.consecutiveFailures = 0
			cb.consecutiveSuccesses = 0
			cb.currentBackoff = cb.config.OpenTimeout // Reset backoff
		}

	case StateOpen:
		// Should not happen, but handle gracefully
		cb.halfOpenRequests--
	}
}

// onFailure handles a failed request
func (cb *CircuitBreaker) onFailure() {
	cb.mu.Lock()
	defer cb.mu.Unlock()

	switch cb.state {
	case StateClosed:
		cb.consecutiveFailures++
		cb.consecutiveSuccesses = 0

		if cb.consecutiveFailures >= cb.config.FailureThreshold {
			// Too many failures, open the circuit
			cb.transitionTo(StateOpen)
		}

	case StateHalfOpen:
		cb.halfOpenRequests--
		// Failure in half-open state, go back to open
		cb.transitionTo(StateOpen)
		cb.consecutiveSuccesses = 0

		// Increase backoff (exponential)
		cb.currentBackoff *= 2
		if cb.currentBackoff > 60*time.Second {
			cb.currentBackoff = 60 * time.Second // Cap at 60s
		}

	case StateOpen:
		// Already open, just decrement counter
		cb.halfOpenRequests--
	}
}

// transitionTo transitions circuit to a new state
func (cb *CircuitBreaker) transitionTo(newState CircuitState) {
	if cb.state == newState {
		return
	}

	oldState := cb.state
	cb.state = newState
	cb.lastStateChange = time.Now()
	cb.halfOpenRequests = 0

	// Update metrics
	cb.stateGauge.Set(float64(newState))
	cb.stateTransitions.WithLabelValues(oldState.String(), newState.String()).Inc()

	fmt.Printf("Circuit breaker state transition: %s -> %s (failures: %d, successes: %d, backoff: %v)\n",
		oldState, newState, cb.consecutiveFailures, cb.consecutiveSuccesses, cb.currentBackoff)
}

// getState safely returns current state
func (cb *CircuitBreaker) getState() CircuitState {
	cb.mu.RLock()
	defer cb.mu.RUnlock()
	return cb.state
}

// GetState returns current circuit breaker state (for monitoring)
func (cb *CircuitBreaker) GetState() string {
	return cb.getState().String()
}

// GetStats returns current circuit breaker statistics
func (cb *CircuitBreaker) GetStats() map[string]interface{} {
	cb.mu.RLock()
	defer cb.mu.RUnlock()

	return map[string]interface{}{
		"state":                 cb.state.String(),
		"consecutive_failures":  cb.consecutiveFailures,
		"consecutive_successes": cb.consecutiveSuccesses,
		"current_backoff":       cb.currentBackoff.String(),
		"last_state_change":     cb.lastStateChange.Format(time.RFC3339),
		"time_in_state":         time.Since(cb.lastStateChange).String(),
	}
}

// Reset manually resets the circuit breaker to closed state
func (cb *CircuitBreaker) Reset() {
	cb.mu.Lock()
	defer cb.mu.Unlock()

	cb.transitionTo(StateClosed)
	cb.consecutiveFailures = 0
	cb.consecutiveSuccesses = 0
	cb.currentBackoff = cb.config.OpenTimeout
	cb.halfOpenRequests = 0
}
