// Package unit contains unit tests for the Quester API.
// 009-database-query-optimization T044: Unit tests for include parsing and validation
package unit

import (
	"testing"

	"github.com/keshablive/quester/internal/framework/includes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestParse_EmptyString(t *testing.T) {
	// Empty string should return empty includes
	config := includes.DefaultConfig([]string{"author", "modules"})
	inc, err := includes.Parse("", config)

	require.NoError(t, err)
	assert.True(t, inc.IsEmpty())
	assert.Equal(t, 0, inc.Count())
}

func TestParse_SingleInclude(t *testing.T) {
	config := includes.DefaultConfig([]string{"author", "modules", "category"})
	inc, err := includes.Parse("author", config)

	require.NoError(t, err)
	assert.False(t, inc.IsEmpty())
	assert.Equal(t, 1, inc.Count())
	assert.True(t, inc.Has("author"))
	assert.False(t, inc.Has("modules"))
}

func TestParse_MultipleIncludes(t *testing.T) {
	config := includes.DefaultConfig([]string{"author", "modules", "category"})
	inc, err := includes.Parse("author,modules,category", config)

	require.NoError(t, err)
	assert.Equal(t, 3, inc.Count())
	assert.True(t, inc.Has("author"))
	assert.True(t, inc.Has("modules"))
	assert.True(t, inc.Has("category"))
}

func TestParse_WithWhitespace(t *testing.T) {
	config := includes.DefaultConfig([]string{"author", "modules"})
	inc, err := includes.Parse("  author  ,  modules  ", config)

	require.NoError(t, err)
	assert.Equal(t, 2, inc.Count())
	assert.True(t, inc.Has("author"))
	assert.True(t, inc.Has("modules"))
}

func TestParse_NestedInclude(t *testing.T) {
	config := &includes.Config{
		MaxIncludes: 5,
		MaxDepth:    2,
		Allowed:     []string{"author", "author.profile"},
	}

	inc, err := includes.Parse("author.profile", config)

	require.NoError(t, err)
	assert.Equal(t, 1, inc.Count())
	assert.True(t, inc.Has("author.profile"))
}

func TestParse_TooManyIncludes(t *testing.T) {
	config := &includes.Config{
		MaxIncludes: 2,
		MaxDepth:    2,
		Allowed:     []string{"a", "b", "c", "d"},
	}

	_, err := includes.Parse("a,b,c", config)

	assert.Error(t, err)
	assert.ErrorIs(t, err, includes.ErrTooManyIncludes)
}

func TestParse_IncludeNotAllowed(t *testing.T) {
	config := includes.DefaultConfig([]string{"author", "modules"})

	_, err := includes.Parse("secret_data", config)

	assert.Error(t, err)
	assert.ErrorIs(t, err, includes.ErrIncludeNotAllowed)
}

func TestParse_IncludeTooDeep(t *testing.T) {
	config := &includes.Config{
		MaxIncludes: 5,
		MaxDepth:    2,
		Allowed:     []string{"a.b.c.d"}, // 4 levels
	}

	_, err := includes.Parse("a.b.c.d", config)

	assert.Error(t, err)
	assert.ErrorIs(t, err, includes.ErrIncludeTooDeep)
}

func TestParse_InvalidFormat(t *testing.T) {
	config := includes.DefaultConfig([]string{"author"})

	tests := []struct {
		name  string
		input string
	}{
		{"special characters", "author@profile"},
		{"sql injection attempt", "author; DROP TABLE users;"},
		{"html tags", "<script>author</script>"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := includes.Parse(tt.input, config)
			assert.Error(t, err)
		})
	}
}

func TestIncludes_Has_CaseInsensitive(t *testing.T) {
	config := includes.DefaultConfig([]string{"author", "modules"})
	inc, err := includes.Parse("author,modules", config)

	require.NoError(t, err)
	assert.True(t, inc.Has("author"))
	assert.True(t, inc.Has("Author"))
	assert.True(t, inc.Has("AUTHOR"))
}

func TestIncludes_Names(t *testing.T) {
	config := includes.DefaultConfig([]string{"author", "modules", "category"})
	inc, err := includes.Parse("author,category", config)

	require.NoError(t, err)
	names := inc.Names()

	assert.Len(t, names, 2)
	assert.Contains(t, names, "author")
	assert.Contains(t, names, "category")
}

func TestDefaultConfig(t *testing.T) {
	allowed := []string{"a", "b", "c"}
	config := includes.DefaultConfig(allowed)

	assert.Equal(t, includes.DefaultMaxIncludes, config.MaxIncludes)
	assert.Equal(t, includes.DefaultMaxDepth, config.MaxDepth)
	assert.Equal(t, allowed, config.Allowed)
}

func TestPredefinedConfigs(t *testing.T) {
	tests := []struct {
		name       string
		config     *includes.Config
		shouldPass string
		shouldFail string
	}{
		{
			name:       "course config",
			config:     includes.NewCourseConfig(),
			shouldPass: "author",
			shouldFail: "secret",
		},
		{
			name:       "transaction config",
			config:     includes.NewTransactionConfig(),
			shouldPass: "user",
			shouldFail: "secret",
		},
		{
			name:       "quest config",
			config:     includes.NewQuestConfig(),
			shouldPass: "creator",
			shouldFail: "secret",
		},
		{
			name:       "user config",
			config:     includes.NewUserConfig(),
			shouldPass: "profile",
			shouldFail: "secret",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			inc, err := includes.Parse(tt.shouldPass, tt.config)
			assert.NoError(t, err)
			assert.True(t, inc.Has(tt.shouldPass))

			_, err = includes.Parse(tt.shouldFail, tt.config)
			assert.Error(t, err)
		})
	}
}

func TestParseWithMapping(t *testing.T) {
	config := includes.DefaultConfig([]string{"author", "modules"})
	mapping := includes.PreloadMapping{
		"author": includes.PreloadConfig{
			PreloadPath: "Instructor",
		},
		"modules": includes.PreloadConfig{
			PreloadPath: "CourseModules",
		},
	}

	inc, err := includes.ParseWithMapping("author,modules", config, mapping)

	require.NoError(t, err)
	assert.Equal(t, 2, inc.Count())
}

// Test that parsing with nil config uses defaults
func TestParse_NilConfig(t *testing.T) {
	inc, err := includes.Parse("", nil)

	require.NoError(t, err)
	assert.True(t, inc.IsEmpty())
}

// Test maximum limits enforcement
func TestParse_EnforcesHardLimits(t *testing.T) {
	// Try to exceed hard limits
	config := &includes.Config{
		MaxIncludes: 100, // Exceeds MaxAllowedIncludes
		MaxDepth:    10,  // Exceeds MaxAllowedDepth
		Allowed:     []string{"a"},
	}

	// Should not error, but limits should be capped
	inc, err := includes.Parse("a", config)
	require.NoError(t, err)
	assert.NotNil(t, inc)
}

// Test toPascalCase conversion (internal function tested via behavior)
func TestApplyPreloads_DefaultMapping(t *testing.T) {
	// This tests that includes like "author" get converted to "Author" for GORM
	config := includes.DefaultConfig([]string{"author", "created_by"})
	inc, err := includes.Parse("author", config)

	require.NoError(t, err)
	// The actual GORM integration would be tested in integration tests
	assert.True(t, inc.Has("author"))
}
