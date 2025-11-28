// Package unit contains unit tests for the Quester API.
// 008-api-response-optimization T017: Unit tests for FieldSelector parsing
package unit

import (
	"testing"

	"github.com/keshablive/quester/internal/framework/responses"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestParseFields_EmptyString(t *testing.T) {
	selector := responses.ParseFields("")

	assert.False(t, selector.HasSelection, "Empty string should not have selection")
	assert.Empty(t, selector.Fields, "Fields should be empty")
	assert.Empty(t, selector.NestedFields, "NestedFields should be empty")
}

func TestParseFields_SimpleFields(t *testing.T) {
	selector := responses.ParseFields("id,title,description")

	require.True(t, selector.HasSelection, "Should have selection")
	assert.ElementsMatch(t, []string{"id", "title", "description"}, selector.Fields)
	assert.Empty(t, selector.NestedFields, "No nested fields")
}

func TestParseFields_WithWhitespace(t *testing.T) {
	selector := responses.ParseFields(" id , title , description ")

	require.True(t, selector.HasSelection, "Should have selection")
	assert.ElementsMatch(t, []string{"id", "title", "description"}, selector.Fields)
}

func TestParseFields_NestedFields(t *testing.T) {
	// FR-002: Support dot notation for nested fields
	selector := responses.ParseFields("id,title,instructor.name,instructor.avatar")

	require.True(t, selector.HasSelection, "Should have selection")
	assert.Contains(t, selector.Fields, "id")
	assert.Contains(t, selector.Fields, "title")
	assert.Contains(t, selector.Fields, "instructor")

	require.Contains(t, selector.NestedFields, "instructor")
	assert.ElementsMatch(t, []string{"name", "avatar"}, selector.NestedFields["instructor"])
}

func TestParseFields_MultipleNestedLevels(t *testing.T) {
	selector := responses.ParseFields("course.instructor.name,course.title")

	require.True(t, selector.HasSelection)
	assert.Contains(t, selector.Fields, "course")
	assert.Contains(t, selector.NestedFields, "course")
	// Note: Deep nesting (course.instructor.name) is treated as course -> instructor.name
	assert.Contains(t, selector.NestedFields["course"], "instructor.name")
	assert.Contains(t, selector.NestedFields["course"], "title")
}

func TestParseFields_DuplicateFields(t *testing.T) {
	selector := responses.ParseFields("id,id,title,title")

	require.True(t, selector.HasSelection)
	// Should deduplicate
	assert.Equal(t, 2, len(selector.Fields))
	assert.Contains(t, selector.Fields, "id")
	assert.Contains(t, selector.Fields, "title")
}

func TestParseFields_EmptySegments(t *testing.T) {
	selector := responses.ParseFields("id,,title,")

	require.True(t, selector.HasSelection)
	assert.ElementsMatch(t, []string{"id", "title"}, selector.Fields)
}

func TestParseFieldsFromSlice(t *testing.T) {
	selector := responses.ParseFieldsFromSlice([]string{"id", "title", "instructor.name"})

	require.True(t, selector.HasSelection)
	assert.Contains(t, selector.Fields, "id")
	assert.Contains(t, selector.Fields, "title")
	assert.Contains(t, selector.Fields, "instructor")
	assert.Contains(t, selector.NestedFields["instructor"], "name")
}

func TestParseFieldsFromSlice_EmptySlice(t *testing.T) {
	selector := responses.ParseFieldsFromSlice([]string{})

	assert.False(t, selector.HasSelection)
}

func TestParseFieldsFromSlice_NilSlice(t *testing.T) {
	selector := responses.ParseFieldsFromSlice(nil)

	assert.False(t, selector.HasSelection)
}

func TestIsSensitiveField(t *testing.T) {
	// Should be sensitive
	sensitiveFields := []string{
		"password",
		"password_hash",
		"hashed_password",
		"totp_secret",
		"api_key",
		"secret",
		"refresh_token",
		"backup_codes",
	}

	for _, field := range sensitiveFields {
		assert.True(t, responses.IsSensitiveField(field), "Field %s should be sensitive", field)
	}

	// Should NOT be sensitive
	normalFields := []string{
		"id",
		"name",
		"email",
		"title",
		"description",
		"created_at",
	}

	for _, field := range normalFields {
		assert.False(t, responses.IsSensitiveField(field), "Field %s should not be sensitive", field)
	}
}

func TestFilterData_NoSelection(t *testing.T) {
	// FR-004: Return full response when fields parameter is omitted
	selector := responses.ParseFields("")

	data := map[string]interface{}{
		"id":    1,
		"title": "Test Course",
		"email": "test@example.com",
	}

	result := selector.FilterData(data)

	// Should return full data
	filtered, ok := result.Data.(map[string]interface{})
	require.True(t, ok)
	assert.Equal(t, 1, filtered["id"])
	assert.Equal(t, "Test Course", filtered["title"])
	assert.Equal(t, "test@example.com", filtered["email"])
}

func TestFilterData_WithSelection(t *testing.T) {
	// FR-001: Support ?fields=field1,field2,field3
	selector := responses.ParseFields("id,title")

	data := map[string]interface{}{
		"id":          1,
		"title":       "Test Course",
		"description": "A test course",
		"email":       "test@example.com",
	}

	result := selector.FilterData(data)

	filtered, ok := result.Data.(map[string]interface{})
	require.True(t, ok)

	// Should only have requested fields
	assert.Equal(t, 1, filtered["id"])
	assert.Equal(t, "Test Course", filtered["title"])
	assert.NotContains(t, filtered, "description")
	assert.NotContains(t, filtered, "email")

	// Metadata
	assert.ElementsMatch(t, []string{"id", "title"}, result.ValidFields)
	assert.Contains(t, result.OmittedFields, "description")
	assert.Contains(t, result.OmittedFields, "email")
}

func TestFilterData_SensitiveFieldsExcluded(t *testing.T) {
	// FR-005a: Silently exclude sensitive fields even if requested
	selector := responses.ParseFields("id,password,title")

	data := map[string]interface{}{
		"id":       1,
		"title":    "Test",
		"password": "secret123",
	}

	result := selector.FilterData(data)

	filtered, ok := result.Data.(map[string]interface{})
	require.True(t, ok)

	// Password should be excluded even though requested
	assert.Equal(t, 1, filtered["id"])
	assert.Equal(t, "Test", filtered["title"])
	assert.NotContains(t, filtered, "password")
}

func TestFilterData_InvalidFieldsIgnored(t *testing.T) {
	// FR-003: Ignore invalid/unknown field names silently
	selector := responses.ParseFields("id,nonexistent,title")

	data := map[string]interface{}{
		"id":    1,
		"title": "Test",
	}

	result := selector.FilterData(data)

	filtered, ok := result.Data.(map[string]interface{})
	require.True(t, ok)

	assert.Equal(t, 1, filtered["id"])
	assert.Equal(t, "Test", filtered["title"])
	assert.Contains(t, result.InvalidFields, "nonexistent")
	assert.False(t, result.AllInvalid, "Not all fields are invalid")
}

func TestFilterData_AllInvalidFields(t *testing.T) {
	// T010a: Handle all invalid fields edge case
	selector := responses.ParseFields("invalid1,invalid2")

	data := map[string]interface{}{
		"id":    1,
		"title": "Test",
	}

	result := selector.FilterData(data)

	// Should return empty data with warning
	filtered, ok := result.Data.(map[string]interface{})
	require.True(t, ok)
	assert.Empty(t, filtered)
	assert.True(t, result.AllInvalid)
	assert.Contains(t, result.Warning, "invalid")
}

func TestFilterData_NestedFields(t *testing.T) {
	// FR-002: Support dot notation for nested fields
	selector := responses.ParseFields("id,instructor.name,instructor.avatar")

	data := map[string]interface{}{
		"id": 1,
		"instructor": map[string]interface{}{
			"name":   "John Doe",
			"avatar": "avatar.jpg",
			"email":  "john@example.com",
		},
	}

	result := selector.FilterData(data)

	filtered, ok := result.Data.(map[string]interface{})
	require.True(t, ok)

	assert.Equal(t, 1, filtered["id"])

	instructor, ok := filtered["instructor"].(map[string]interface{})
	require.True(t, ok)

	// Should only have requested nested fields
	assert.Equal(t, "John Doe", instructor["name"])
	assert.Equal(t, "avatar.jpg", instructor["avatar"])
	assert.NotContains(t, instructor, "email")
}

func TestFilterSlice_List(t *testing.T) {
	// FR-005: Apply field filtering to list endpoints
	selector := responses.ParseFields("id,title")

	data := []interface{}{
		map[string]interface{}{
			"id":          1,
			"title":       "Course 1",
			"description": "Description 1",
		},
		map[string]interface{}{
			"id":          2,
			"title":       "Course 2",
			"description": "Description 2",
		},
	}

	result := selector.FilterSlice(data)

	filtered, ok := result.Data.([]interface{})
	require.True(t, ok)
	assert.Len(t, filtered, 2)

	// First item
	item1, ok := filtered[0].(map[string]interface{})
	require.True(t, ok)
	assert.Equal(t, 1, item1["id"])
	assert.Equal(t, "Course 1", item1["title"])
	assert.NotContains(t, item1, "description")

	// Second item
	item2, ok := filtered[1].(map[string]interface{})
	require.True(t, ok)
	assert.Equal(t, 2, item2["id"])
	assert.Equal(t, "Course 2", item2["title"])
	assert.NotContains(t, item2, "description")
}

func TestFilterSlice_NoSelection(t *testing.T) {
	selector := responses.ParseFields("")

	data := []interface{}{
		map[string]interface{}{
			"id":    1,
			"title": "Course 1",
		},
	}

	result := selector.FilterSlice(data)

	filtered, ok := result.Data.([]interface{})
	require.True(t, ok)

	// Should return full data
	item, ok := filtered[0].(map[string]interface{})
	require.True(t, ok)
	assert.Equal(t, 1, item["id"])
	assert.Equal(t, "Course 1", item["title"])
}

func TestFilterData_RemovesSensitiveFromFull(t *testing.T) {
	// Even without selection, sensitive fields should be removed
	selector := responses.ParseFields("")

	data := map[string]interface{}{
		"id":            1,
		"password_hash": "abc123",
		"api_key":       "secret",
	}

	result := selector.FilterData(data)

	filtered, ok := result.Data.(map[string]interface{})
	require.True(t, ok)

	assert.Equal(t, 1, filtered["id"])
	assert.NotContains(t, filtered, "password_hash")
	assert.NotContains(t, filtered, "api_key")
}
