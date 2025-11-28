// Package unit contains unit tests for the Quester API.
// 009-database-query-optimization T027: Unit tests for cursor-based pagination
package unit

import (
	"testing"

	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/framework/pagination"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestParseCursor_EmptyString(t *testing.T) {
	// Empty string should return a valid cursor for first page
	cursor, err := pagination.ParseCursor("")

	require.NoError(t, err)
	assert.NotNil(t, cursor)
	assert.True(t, cursor.IsEmpty())
	assert.Equal(t, pagination.DirectionForward, cursor.Direction)
}

func TestParseCursor_ValidToken(t *testing.T) {
	// Create a token and then parse it
	original := &pagination.CursorToken{
		ID:        uuid.New(),
		SortValue: "2024-01-15T10:30:00Z",
		Direction: pagination.DirectionForward,
		SortField: "created_at",
	}

	encoded, err := original.Encode()
	require.NoError(t, err)

	parsed, err := pagination.ParseCursor(encoded)
	require.NoError(t, err)

	assert.Equal(t, original.ID, parsed.ID)
	assert.Equal(t, original.SortValue, parsed.SortValue)
	assert.Equal(t, original.Direction, parsed.Direction)
	assert.Equal(t, original.SortField, parsed.SortField)
}

func TestParseCursor_InvalidBase64(t *testing.T) {
	_, err := pagination.ParseCursor("not-valid-base64!!!")

	assert.Error(t, err)
	assert.ErrorIs(t, err, pagination.ErrInvalidCursor)
}

func TestParseCursor_InvalidJSON(t *testing.T) {
	// Valid base64 but invalid JSON
	_, err := pagination.ParseCursor("bm90LWpzb24=") // "not-json" in base64

	assert.Error(t, err)
	assert.ErrorIs(t, err, pagination.ErrInvalidCursor)
}

func TestCursorToken_Encode_Decode_Roundtrip(t *testing.T) {
	testCases := []struct {
		name   string
		cursor pagination.CursorToken
	}{
		{
			name: "forward with all fields",
			cursor: pagination.CursorToken{
				ID:        uuid.New(),
				SortValue: "2024-06-15T12:00:00Z",
				Direction: pagination.DirectionForward,
				SortField: "created_at",
				TenantID:  uuid.New(),
			},
		},
		{
			name: "backward pagination",
			cursor: pagination.CursorToken{
				ID:        uuid.New(),
				SortValue: "test-value",
				Direction: pagination.DirectionBackward,
				SortField: "name",
			},
		},
		{
			name: "minimal cursor",
			cursor: pagination.CursorToken{
				ID:        uuid.New(),
				SortValue: "",
				Direction: pagination.DirectionForward,
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			encoded, err := tc.cursor.Encode()
			require.NoError(t, err)
			assert.NotEmpty(t, encoded)

			decoded, err := pagination.ParseCursor(encoded)
			require.NoError(t, err)

			assert.Equal(t, tc.cursor.ID, decoded.ID)
			assert.Equal(t, tc.cursor.SortValue, decoded.SortValue)
			assert.Equal(t, tc.cursor.Direction, decoded.Direction)
			assert.Equal(t, tc.cursor.SortField, decoded.SortField)
		})
	}
}

func TestCursorToken_IsEmpty(t *testing.T) {
	tests := []struct {
		name     string
		cursor   pagination.CursorToken
		expected bool
	}{
		{
			name:     "empty cursor",
			cursor:   pagination.CursorToken{},
			expected: true,
		},
		{
			name:     "nil UUID with sort value",
			cursor:   pagination.CursorToken{SortValue: "test"},
			expected: false,
		},
		{
			name:     "with UUID no sort value",
			cursor:   pagination.CursorToken{ID: uuid.New()},
			expected: false,
		},
		{
			name:     "full cursor",
			cursor:   pagination.CursorToken{ID: uuid.New(), SortValue: "test"},
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.expected, tt.cursor.IsEmpty())
		})
	}
}

func TestValidatePageSize(t *testing.T) {
	tests := []struct {
		name        string
		input       int
		expected    int
		expectError bool
	}{
		{
			name:     "valid page size",
			input:    20,
			expected: 20,
		},
		{
			name:     "zero uses default",
			input:    0,
			expected: pagination.DefaultPageSize,
		},
		{
			name:     "negative uses default",
			input:    -5,
			expected: pagination.DefaultPageSize,
		},
		{
			name:     "max allowed",
			input:    100,
			expected: 100,
		},
		{
			name:        "exceeds max",
			input:       101,
			expectError: true,
		},
		{
			name:        "way exceeds max",
			input:       1000,
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := pagination.ValidatePageSize(tt.input)

			if tt.expectError {
				assert.Error(t, err)
				assert.ErrorIs(t, err, pagination.ErrInvalidPageSize)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.expected, result)
			}
		})
	}
}

func TestParseDirection(t *testing.T) {
	tests := []struct {
		name        string
		input       string
		expected    pagination.Direction
		expectError bool
	}{
		{
			name:     "empty string",
			input:    "",
			expected: pagination.DirectionForward,
		},
		{
			name:     "forward",
			input:    "forward",
			expected: pagination.DirectionForward,
		},
		{
			name:     "next",
			input:    "next",
			expected: pagination.DirectionForward,
		},
		{
			name:     "backward",
			input:    "backward",
			expected: pagination.DirectionBackward,
		},
		{
			name:     "prev",
			input:    "prev",
			expected: pagination.DirectionBackward,
		},
		{
			name:     "previous",
			input:    "previous",
			expected: pagination.DirectionBackward,
		},
		{
			name:     "case insensitive",
			input:    "FORWARD",
			expected: pagination.DirectionForward,
		},
		{
			name:        "invalid",
			input:       "invalid",
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := pagination.ParseDirection(tt.input)

			if tt.expectError {
				assert.Error(t, err)
				assert.ErrorIs(t, err, pagination.ErrInvalidDirection)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.expected, result)
			}
		})
	}
}

func TestSanitizeSortField(t *testing.T) {
	allowedFields := []string{"created_at", "updated_at", "name", "status"}

	tests := []struct {
		name        string
		input       string
		expected    string
		expectError bool
	}{
		{
			name:     "valid field",
			input:    "created_at",
			expected: "created_at",
		},
		{
			name:     "case insensitive",
			input:    "CREATED_AT",
			expected: "created_at",
		},
		{
			name:     "with whitespace",
			input:    "  name  ",
			expected: "name",
		},
		{
			name:        "invalid field",
			input:       "invalid_field",
			expectError: true,
		},
		{
			name:        "sql injection attempt",
			input:       "created_at; DROP TABLE users;",
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := pagination.SanitizeSortField(tt.input, allowedFields)

			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.expected, result)
			}
		})
	}
}

func TestBuildMetaSimple(t *testing.T) {
	id := uuid.New()

	tests := []struct {
		name          string
		hasMore       bool
		pageSize      int
		lastID        uuid.UUID
		lastSortValue string
		sortField     string
		expectCursor  bool
	}{
		{
			name:          "has more pages",
			hasMore:       true,
			pageSize:      20,
			lastID:        id,
			lastSortValue: "2024-01-01",
			sortField:     "created_at",
			expectCursor:  true,
		},
		{
			name:          "no more pages",
			hasMore:       false,
			pageSize:      20,
			lastID:        id,
			lastSortValue: "2024-01-01",
			sortField:     "created_at",
			expectCursor:  false,
		},
		{
			name:          "nil UUID",
			hasMore:       true,
			pageSize:      20,
			lastID:        uuid.Nil,
			lastSortValue: "",
			sortField:     "created_at",
			expectCursor:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			meta := pagination.BuildMetaSimple(
				tt.hasMore,
				tt.pageSize,
				tt.lastID,
				tt.lastSortValue,
				tt.sortField,
			)

			assert.Equal(t, tt.pageSize, meta.PageSize)
			assert.Equal(t, tt.hasMore, meta.HasMore)

			if tt.expectCursor {
				assert.NotEmpty(t, meta.NextCursor)
			} else {
				assert.Empty(t, meta.NextCursor)
			}
		})
	}
}

// Test that cursor tokens are URL-safe
func TestCursorToken_URLSafe(t *testing.T) {
	cursor := &pagination.CursorToken{
		ID:        uuid.New(),
		SortValue: "2024-06-15T12:00:00+05:30", // Contains special chars
		Direction: pagination.DirectionForward,
		SortField: "created_at",
	}

	encoded, err := cursor.Encode()
	require.NoError(t, err)

	// Should not contain URL-unsafe characters
	assert.NotContains(t, encoded, "+")
	assert.NotContains(t, encoded, "/")

	// Should be decodable
	decoded, err := pagination.ParseCursor(encoded)
	require.NoError(t, err)
	assert.Equal(t, cursor.SortValue, decoded.SortValue)
}
