// Package includes provides include-based relationship loading for GORM queries.
// Task Reference: 009-database-query-optimization T002
package includes

import (
	"errors"
	"fmt"
	"strings"

	"gorm.io/gorm"
)

// Default limits for includes
const (
	DefaultMaxIncludes = 5  // Maximum number of includes per request
	DefaultMaxDepth    = 2  // Maximum nesting depth (e.g., "author.profile")
	MaxAllowedIncludes = 10 // Hard limit on includes
	MaxAllowedDepth    = 3  // Hard limit on depth
)

var (
	// ErrTooManyIncludes is returned when too many relationships are requested
	ErrTooManyIncludes = errors.New("too many includes requested")
	// ErrIncludeNotAllowed is returned when a relationship is not in the whitelist
	ErrIncludeNotAllowed = errors.New("include not allowed")
	// ErrIncludeTooDeep is returned when include depth exceeds maximum
	ErrIncludeTooDeep = errors.New("include depth exceeds maximum")
	// ErrInvalidIncludeFormat is returned when include string is malformed
	ErrInvalidIncludeFormat = errors.New("invalid include format")
)

// Config holds include parsing configuration
type Config struct {
	MaxIncludes int      // Maximum number of includes allowed
	MaxDepth    int      // Maximum nesting depth allowed
	Allowed     []string // Whitelist of allowed include names
}

// DefaultConfig returns a Config with sensible defaults
func DefaultConfig(allowed []string) *Config {
	return &Config{
		MaxIncludes: DefaultMaxIncludes,
		MaxDepth:    DefaultMaxDepth,
		Allowed:     allowed,
	}
}

// Includes represents a parsed set of relationship includes
type Includes struct {
	names    []string          // Parsed include names
	preloads map[string]string // Include name to GORM preload mapping
	config   *Config           // Configuration
}

// PreloadMapping maps API include names to GORM preload paths
// This allows decoupling API field names from internal model relationships
type PreloadMapping map[string]PreloadConfig

// PreloadConfig defines how an include should be preloaded
type PreloadConfig struct {
	PreloadPath string                  // GORM preload path (e.g., "Author", "Author.Profile")
	Conditions  func(*gorm.DB) *gorm.DB // Optional conditions for the preload
}

// Parse parses an include string and validates against allowed includes
// Format: "author,modules,author.profile" (comma-separated, dot for nested)
func Parse(includeStr string, config *Config) (*Includes, error) {
	if config == nil {
		config = &Config{
			MaxIncludes: DefaultMaxIncludes,
			MaxDepth:    DefaultMaxDepth,
		}
	}

	// Validate config limits
	if config.MaxIncludes > MaxAllowedIncludes {
		config.MaxIncludes = MaxAllowedIncludes
	}
	if config.MaxDepth > MaxAllowedDepth {
		config.MaxDepth = MaxAllowedDepth
	}

	inc := &Includes{
		names:    []string{},
		preloads: make(map[string]string),
		config:   config,
	}

	if includeStr == "" {
		return inc, nil
	}

	// Parse comma-separated includes
	parts := strings.Split(includeStr, ",")

	if len(parts) > config.MaxIncludes {
		return nil, fmt.Errorf("%w: requested %d, maximum is %d",
			ErrTooManyIncludes, len(parts), config.MaxIncludes)
	}

	allowedSet := make(map[string]bool)
	for _, a := range config.Allowed {
		allowedSet[strings.ToLower(a)] = true
	}

	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}

		// Validate format (alphanumeric, dots, underscores only)
		if !isValidIncludeName(part) {
			return nil, fmt.Errorf("%w: %s", ErrInvalidIncludeFormat, part)
		}

		// Check depth
		depth := strings.Count(part, ".") + 1
		if depth > config.MaxDepth {
			return nil, fmt.Errorf("%w: %s has depth %d, maximum is %d",
				ErrIncludeTooDeep, part, depth, config.MaxDepth)
		}

		// Check if allowed
		if len(config.Allowed) > 0 && !allowedSet[strings.ToLower(part)] {
			return nil, fmt.Errorf("%w: %s", ErrIncludeNotAllowed, part)
		}

		inc.names = append(inc.names, part)
	}

	return inc, nil
}

// ParseWithMapping parses includes and maps them to GORM preload paths
func ParseWithMapping(includeStr string, config *Config, mapping PreloadMapping) (*Includes, error) {
	inc, err := Parse(includeStr, config)
	if err != nil {
		return nil, err
	}

	// Map includes to preload paths
	for _, name := range inc.names {
		if pm, ok := mapping[name]; ok {
			inc.preloads[name] = pm.PreloadPath
		} else {
			// Default: convert to PascalCase for GORM
			inc.preloads[name] = toPascalCase(name)
		}
	}

	return inc, nil
}

// Names returns the list of include names
func (i *Includes) Names() []string {
	return i.names
}

// Has checks if a specific include was requested
func (i *Includes) Has(name string) bool {
	for _, n := range i.names {
		if strings.EqualFold(n, name) {
			return true
		}
	}
	return false
}

// IsEmpty returns true if no includes were requested
func (i *Includes) IsEmpty() bool {
	return len(i.names) == 0
}

// Count returns the number of includes
func (i *Includes) Count() int {
	return len(i.names)
}

// ApplyPreloads applies all includes as GORM Preload calls
// The query should already have tenant scope applied
func (i *Includes) ApplyPreloads(query *gorm.DB) *gorm.DB {
	for _, name := range i.names {
		preloadPath := i.preloads[name]
		if preloadPath == "" {
			preloadPath = toPascalCase(name)
		}
		query = query.Preload(preloadPath)
	}
	return query
}

// ApplyPreloadsWithMapping applies includes using a mapping for custom preload paths
func (i *Includes) ApplyPreloadsWithMapping(query *gorm.DB, mapping PreloadMapping) *gorm.DB {
	for _, name := range i.names {
		if pm, ok := mapping[name]; ok {
			if pm.Conditions != nil {
				query = query.Preload(pm.PreloadPath, pm.Conditions)
			} else {
				query = query.Preload(pm.PreloadPath)
			}
		} else {
			// Default: convert to PascalCase for GORM
			query = query.Preload(toPascalCase(name))
		}
	}
	return query
}

// isValidIncludeName checks if an include name contains only valid characters
func isValidIncludeName(name string) bool {
	for _, r := range name {
		if !((r >= 'a' && r <= 'z') ||
			(r >= 'A' && r <= 'Z') ||
			(r >= '0' && r <= '9') ||
			r == '_' || r == '.') {
			return false
		}
	}
	return len(name) > 0
}

// toPascalCase converts snake_case or kebab-case to PascalCase
// Examples: "author" -> "Author", "created_by" -> "CreatedBy"
func toPascalCase(s string) string {
	// Handle nested includes (dot-separated)
	if strings.Contains(s, ".") {
		parts := strings.Split(s, ".")
		for i, p := range parts {
			parts[i] = toPascalCase(p)
		}
		return strings.Join(parts, ".")
	}

	// Split by underscore or hyphen
	parts := strings.FieldsFunc(s, func(r rune) bool {
		return r == '_' || r == '-'
	})

	var result strings.Builder
	for _, part := range parts {
		if len(part) > 0 {
			result.WriteString(strings.ToUpper(string(part[0])))
			if len(part) > 1 {
				result.WriteString(strings.ToLower(part[1:]))
			}
		}
	}

	// Handle already lowercase single words
	if result.Len() == 0 && len(s) > 0 {
		return strings.ToUpper(string(s[0])) + strings.ToLower(s[1:])
	}

	return result.String()
}

// Predefined include configurations for common entities
// These follow FR-010 maximum 5 eager loads per endpoint

// CourseIncludes defines allowed includes for Course entity
var CourseIncludes = []string{
	"author",
	"modules",
	"enrollments",
	"reviews",
	"category",
}

// TransactionIncludes defines allowed includes for Transaction entity
var TransactionIncludes = []string{
	"user",
	"item",
	"payment_method",
	"refund",
}

// QuestIncludes defines allowed includes for Quest entity
var QuestIncludes = []string{
	"creator",
	"objectives",
	"rewards",
	"participants",
	"category",
}

// UserIncludes defines allowed includes for User entity
var UserIncludes = []string{
	"profile",
	"achievements",
	"enrolled_courses",
	"transactions",
}

// NewCourseConfig returns include config for Course queries
func NewCourseConfig() *Config {
	return DefaultConfig(CourseIncludes)
}

// NewTransactionConfig returns include config for Transaction queries
func NewTransactionConfig() *Config {
	return DefaultConfig(TransactionIncludes)
}

// NewQuestConfig returns include config for Quest queries
func NewQuestConfig() *Config {
	return DefaultConfig(QuestIncludes)
}

// NewUserConfig returns include config for User queries
func NewUserConfig() *Config {
	return DefaultConfig(UserIncludes)
}
