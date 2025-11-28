package services

import (
	"context"
	"errors"
	"fmt"
	"math"
	"math/rand"
	"sync"
	"time"
)

var (
	// ErrMaxRetriesExceeded is returned when max retry attempts are reached
	ErrMaxRetriesExceeded = errors.New("maximum retry attempts exceeded")
	// ErrBudgetExhausted is returned when retry budget is exhausted
	ErrBudgetExhausted = errors.New("retry budget exhausted")
	// ErrContextCancelled is returned when context is cancelled during retry
	ErrContextCancelled = errors.New("retry cancelled: context done")
)

// RetryConfig holds configuration for retry behavior
type RetryConfig struct {
	// MaxAttempts maximum number of retry attempts (default: 3)
	MaxAttempts int
	// InitialBackoff initial backoff duration (default: 1s)
	InitialBackoff time.Duration
	// MaxBackoff maximum backoff duration (default: 60s)
	MaxBackoff time.Duration
	// BackoffMultiplier multiplier for exponential backoff (default: 2.0)
	BackoffMultiplier float64
	// JitterPercent random jitter percentage to prevent thundering herd (default: 0.1 = 10%)
	JitterPercent float64
	// RetryPredicate function to determine if error is retryable
	RetryPredicate func(error) bool
}

// DefaultRetryConfig returns sensible defaults
func DefaultRetryConfig() RetryConfig {
	return RetryConfig{
		MaxAttempts:       3,
		InitialBackoff:    1 * time.Second,
		MaxBackoff:        60 * time.Second,
		BackoffMultiplier: 2.0,
		JitterPercent:     0.1,
		RetryPredicate:    IsTransientError,
	}
}

// RetryService handles retry logic with exponential backoff
type RetryService struct {
	config RetryConfig
	budget *RetryBudget
}

// NewRetryService creates a new retry service
func NewRetryService(config RetryConfig) *RetryService {
	if config.MaxAttempts <= 0 {
		config.MaxAttempts = 3
	}
	if config.InitialBackoff <= 0 {
		config.InitialBackoff = 1 * time.Second
	}
	if config.MaxBackoff <= 0 {
		config.MaxBackoff = 60 * time.Second
	}
	if config.BackoffMultiplier <= 0 {
		config.BackoffMultiplier = 2.0
	}
	if config.JitterPercent < 0 || config.JitterPercent > 1 {
		config.JitterPercent = 0.1
	}
	if config.RetryPredicate == nil {
		config.RetryPredicate = IsTransientError
	}

	return &RetryService{
		config: config,
		budget: NewRetryBudget(100, 2), // 100 token capacity, 2 tokens/sec refill
	}
}

// Do executes the given operation with retry logic
func (rs *RetryService) Do(ctx context.Context, operation func() error) error {
	var lastErr error

	for attempt := 0; attempt < rs.config.MaxAttempts; attempt++ {
		// Check context before attempting
		select {
		case <-ctx.Done():
			return fmt.Errorf("%w: %v", ErrContextCancelled, ctx.Err())
		default:
		}

		// Check retry budget
		if !rs.budget.TryConsume(1) {
			return ErrBudgetExhausted
		}

		// Execute operation
		lastErr = operation()

		if lastErr == nil {
			// Success! Reset backoff for next operation
			return nil
		}

		// Check if error is retryable
		if !rs.config.RetryPredicate(lastErr) {
			return lastErr
		}

		// If this was the last attempt, don't sleep
		if attempt >= rs.config.MaxAttempts-1 {
			break
		}

		// Calculate backoff duration
		backoff := rs.calculateBackoff(attempt)

		fmt.Printf("Retry attempt %d/%d failed: %v. Retrying in %v\n",
			attempt+1, rs.config.MaxAttempts, lastErr, backoff)

		// Wait with context awareness
		select {
		case <-time.After(backoff):
			// Continue to next attempt
		case <-ctx.Done():
			return fmt.Errorf("%w: %v", ErrContextCancelled, ctx.Err())
		}
	}

	return fmt.Errorf("%w after %d attempts: %v", ErrMaxRetriesExceeded, rs.config.MaxAttempts, lastErr)
}

// DoWithCallback executes operation with retry and calls callback on each attempt
func (rs *RetryService) DoWithCallback(
	ctx context.Context,
	operation func() error,
	onRetry func(attempt int, err error, nextBackoff time.Duration),
) error {
	var lastErr error

	for attempt := 0; attempt < rs.config.MaxAttempts; attempt++ {
		select {
		case <-ctx.Done():
			return fmt.Errorf("%w: %v", ErrContextCancelled, ctx.Err())
		default:
		}

		if !rs.budget.TryConsume(1) {
			return ErrBudgetExhausted
		}

		lastErr = operation()

		if lastErr == nil {
			return nil
		}

		if !rs.config.RetryPredicate(lastErr) {
			return lastErr
		}

		if attempt >= rs.config.MaxAttempts-1 {
			break
		}

		backoff := rs.calculateBackoff(attempt)

		if onRetry != nil {
			onRetry(attempt+1, lastErr, backoff)
		}

		select {
		case <-time.After(backoff):
		case <-ctx.Done():
			return fmt.Errorf("%w: %v", ErrContextCancelled, ctx.Err())
		}
	}

	return fmt.Errorf("%w after %d attempts: %v", ErrMaxRetriesExceeded, rs.config.MaxAttempts, lastErr)
}

// calculateBackoff calculates backoff duration with exponential progression and jitter
func (rs *RetryService) calculateBackoff(attempt int) time.Duration {
	// Exponential backoff: initialBackoff * (multiplier ^ attempt)
	backoff := float64(rs.config.InitialBackoff) * math.Pow(rs.config.BackoffMultiplier, float64(attempt))

	// Cap at max backoff
	if backoff > float64(rs.config.MaxBackoff) {
		backoff = float64(rs.config.MaxBackoff)
	}

	// Apply jitter to prevent thundering herd
	jitter := backoff * rs.config.JitterPercent * (2*rand.Float64() - 1)
	backoff += jitter

	// Ensure non-negative
	if backoff < 0 {
		backoff = float64(rs.config.InitialBackoff)
	}

	return time.Duration(backoff)
}

// GetBackoffSequence returns the backoff sequence for visualization/testing
func (rs *RetryService) GetBackoffSequence(attempts int) []time.Duration {
	sequence := make([]time.Duration, attempts)
	for i := 0; i < attempts; i++ {
		// Calculate without jitter for predictable sequence
		backoff := float64(rs.config.InitialBackoff) * math.Pow(rs.config.BackoffMultiplier, float64(i))
		if backoff > float64(rs.config.MaxBackoff) {
			backoff = float64(rs.config.MaxBackoff)
		}
		sequence[i] = time.Duration(backoff)
	}
	return sequence
}

// RetryBudget implements token bucket algorithm for retry limiting
type RetryBudget struct {
	capacity   int
	tokens     int
	refillRate int // tokens per second
	lastRefill time.Time
	mu         *sync.RWMutex
}

// NewRetryBudget creates a new retry budget
func NewRetryBudget(capacity, refillRate int) *RetryBudget {
	return &RetryBudget{
		capacity:   capacity,
		tokens:     capacity,
		refillRate: refillRate,
		lastRefill: time.Now(),
		mu:         &sync.RWMutex{},
	}
}

// TryConsume attempts to consume tokens from the budget
func (rb *RetryBudget) TryConsume(tokens int) bool {
	rb.mu.Lock()
	defer rb.mu.Unlock()

	// Refill tokens based on time elapsed
	rb.refill()

	if rb.tokens >= tokens {
		rb.tokens -= tokens
		return true
	}

	return false
}

// refill adds tokens based on time elapsed
func (rb *RetryBudget) refill() {
	now := time.Now()
	elapsed := now.Sub(rb.lastRefill)

	tokensToAdd := int(elapsed.Seconds()) * rb.refillRate
	if tokensToAdd > 0 {
		rb.tokens += tokensToAdd
		if rb.tokens > rb.capacity {
			rb.tokens = rb.capacity
		}
		rb.lastRefill = now
	}
}

// GetTokens returns current token count
func (rb *RetryBudget) GetTokens() int {
	rb.mu.RLock()
	defer rb.mu.RUnlock()
	return rb.tokens
}

// Reset resets the budget to full capacity
func (rb *RetryBudget) Reset() {
	rb.mu.Lock()
	defer rb.mu.Unlock()
	rb.tokens = rb.capacity
	rb.lastRefill = time.Now()
}

// IsTransientError determines if an error is transient and should be retried
func IsTransientError(err error) bool {
	if err == nil {
		return false
	}

	msg := err.Error()

	// Common transient error patterns
	transientKeywords := []string{
		"timeout",
		"connection refused",
		"connection reset",
		"broken pipe",
		"service unavailable",
		"too many requests",
		"rate limit",
		"temporary failure",
		"try again",
		"503",
		"504",
		"429",
	}

	for _, keyword := range transientKeywords {
		if containsIgnoreCase(msg, keyword) {
			return true
		}
	}

	return false
}

// IsPermanentError determines if an error is permanent and should not be retried
func IsPermanentError(err error) bool {
	if err == nil {
		return false
	}

	msg := err.Error()

	// Common permanent error patterns
	permanentKeywords := []string{
		"invalid credentials",
		"unauthorized",
		"forbidden",
		"not found",
		"bad request",
		"invalid input",
		"validation failed",
		"400",
		"401",
		"403",
		"404",
		"422",
	}

	for _, keyword := range permanentKeywords {
		if containsIgnoreCase(msg, keyword) {
			return true
		}
	}

	return false
}

// containsIgnoreCase checks if string contains substring (case-insensitive)
func containsIgnoreCase(s, substr string) bool {
	sLower := toLower(s)
	substrLower := toLower(substr)
	return contains(sLower, substrLower)
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && indexOf(s, substr) >= 0
}

func indexOf(s, substr string) int {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return i
		}
	}
	return -1
}

func toLower(s string) string {
	result := make([]byte, len(s))
	for i := 0; i < len(s); i++ {
		c := s[i]
		if c >= 'A' && c <= 'Z' {
			result[i] = c + ('a' - 'A')
		} else {
			result[i] = c
		}
	}
	return string(result)
}
