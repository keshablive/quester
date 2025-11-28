// Package unit contains unit tests for the Quester API.
// 008-api-response-optimization T032: Unit tests for envelope builder
package unit

import (
	"testing"

	"github.com/keshablive/quester/internal/framework/responses"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewEnvelope_BasicData(t *testing.T) {
	data := map[string]interface{}{
		"id":    1,
		"title": "Test",
	}

	envelope := responses.NewEnvelope(data).Build()

	require.NotNil(t, envelope)
	assert.Equal(t, data, envelope.Data)
	assert.NotNil(t, envelope.Meta)
	assert.Nil(t, envelope.Error)
}

func TestNewEnvelope_WithRequestID(t *testing.T) {
	// FR-014: Include request ID in all response metadata
	envelope := responses.NewEnvelope(nil).
		WithRequestID("req-123-456").
		Build()

	require.NotNil(t, envelope.Meta)
	assert.Equal(t, "req-123-456", envelope.Meta.RequestID)
}

func TestNewEnvelope_WithPagination(t *testing.T) {
	// FR-012: Include pagination metadata for list endpoints
	envelope := responses.NewEnvelope([]int{1, 2, 3}).
		WithPagination(1, 20, 150).
		Build()

	require.NotNil(t, envelope.Meta)
	assert.Equal(t, 1, envelope.Meta.Page)
	assert.Equal(t, 20, envelope.Meta.Limit)
	assert.Equal(t, int64(150), envelope.Meta.Total)
	assert.True(t, envelope.Meta.HasMore)
	assert.Equal(t, int64(8), envelope.Meta.TotalPages) // ceil(150/20) = 8
}

func TestNewEnvelope_WithPagination_LastPage(t *testing.T) {
	envelope := responses.NewEnvelope([]int{1}).
		WithPagination(8, 20, 150).
		Build()

	require.NotNil(t, envelope.Meta)
	assert.False(t, envelope.Meta.HasMore) // 8*20 = 160 >= 150
}

func TestNewEnvelope_WithFields(t *testing.T) {
	// FR-015: Include fields and omitted arrays when sparse fieldsets used
	envelope := responses.NewEnvelope(nil).
		WithFields(
			[]string{"id", "title"},
			[]string{"description", "created_at"},
		).
		Build()

	require.NotNil(t, envelope.Meta)
	assert.ElementsMatch(t, []string{"id", "title"}, envelope.Meta.Fields)
	assert.ElementsMatch(t, []string{"description", "created_at"}, envelope.Meta.Omitted)
}

func TestNewEnvelope_WithWarnings(t *testing.T) {
	envelope := responses.NewEnvelope(nil).
		WithWarnings("Field 'foo' not found", "Field 'bar' not found").
		Build()

	require.NotNil(t, envelope.Meta)
	assert.Len(t, envelope.Meta.Warnings, 2)
	assert.Contains(t, envelope.Meta.Warnings, "Field 'foo' not found")
}

func TestNewEnvelope_ChainedBuilding(t *testing.T) {
	data := []string{"item1", "item2"}

	envelope := responses.NewEnvelope(data).
		WithRequestID("req-abc").
		WithPagination(2, 10, 50).
		WithFields([]string{"name"}, []string{"description"}).
		Build()

	assert.Equal(t, data, envelope.Data)
	assert.Equal(t, "req-abc", envelope.Meta.RequestID)
	assert.Equal(t, 2, envelope.Meta.Page)
	assert.Equal(t, 10, envelope.Meta.Limit)
	assert.Equal(t, int64(50), envelope.Meta.Total)
	assert.ElementsMatch(t, []string{"name"}, envelope.Meta.Fields)
}

func TestNewErrorEnvelope_Basic(t *testing.T) {
	// FR-013: Wrap error responses in { "error": { "code": ..., "message": ..., "details": [...] } }
	envelope := responses.NewErrorEnvelope(400, "Invalid request").Build()

	require.NotNil(t, envelope)
	assert.Nil(t, envelope.Data)
	require.NotNil(t, envelope.Error)
	assert.Equal(t, 400, envelope.Error.Code)
	assert.Equal(t, "Invalid request", envelope.Error.Message)
}

func TestNewErrorEnvelope_WithRequestID(t *testing.T) {
	envelope := responses.NewErrorEnvelope(500, "Internal error").
		WithRequestID("req-error-123").
		Build()

	require.NotNil(t, envelope.Meta)
	assert.Equal(t, "req-error-123", envelope.Meta.RequestID)
}

func TestNewErrorEnvelope_WithDetails(t *testing.T) {
	envelope := responses.NewErrorEnvelope(422, "Validation failed").
		WithErrorDetails(
			responses.ErrorDetail{Field: "email", Message: "Invalid email format"},
			responses.ErrorDetail{Field: "name", Message: "Name is required"},
		).
		Build()

	require.NotNil(t, envelope.Error)
	require.Len(t, envelope.Error.Details, 2)
	assert.Equal(t, "email", envelope.Error.Details[0].Field)
	assert.Equal(t, "Invalid email format", envelope.Error.Details[0].Message)
	assert.Equal(t, "name", envelope.Error.Details[1].Field)
}

func TestPaginationMeta_Calculation(t *testing.T) {
	tests := []struct {
		name        string
		page        int
		limit       int
		total       int64
		wantHasMore bool
		wantPages   int64
	}{
		{
			name:        "first page with more",
			page:        1,
			limit:       10,
			total:       50,
			wantHasMore: true,
			wantPages:   5,
		},
		{
			name:        "last page",
			page:        5,
			limit:       10,
			total:       50,
			wantHasMore: false,
			wantPages:   5,
		},
		{
			name:        "partial last page",
			page:        3,
			limit:       10,
			total:       25,
			wantHasMore: false, // 3*10=30 >= 25
			wantPages:   3,
		},
		{
			name:        "single page",
			page:        1,
			limit:       10,
			total:       5,
			wantHasMore: false,
			wantPages:   1,
		},
		{
			name:        "empty results",
			page:        1,
			limit:       10,
			total:       0,
			wantHasMore: false,
			wantPages:   0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			meta := responses.NewPaginationMeta(tt.page, tt.limit, tt.total)

			assert.Equal(t, tt.page, meta.Page)
			assert.Equal(t, tt.limit, meta.Limit)
			assert.Equal(t, tt.total, meta.Total)
			assert.Equal(t, tt.wantHasMore, meta.HasMore)
			assert.Equal(t, tt.wantPages, meta.TotalPages)
		})
	}
}

func TestResponseEnvelope_JSONStructure(t *testing.T) {
	// Test that the envelope serializes correctly
	envelope := responses.NewEnvelope(map[string]interface{}{"id": 1}).
		WithRequestID("req-123").
		WithPagination(1, 10, 100).
		Build()

	// Check structure matches FR-011 format
	assert.NotNil(t, envelope.Data)
	assert.NotNil(t, envelope.Meta)
	assert.Nil(t, envelope.Error)

	// Meta should have all expected fields
	assert.NotEmpty(t, envelope.Meta.RequestID)
	assert.Equal(t, 1, envelope.Meta.Page)
	assert.Equal(t, 10, envelope.Meta.Limit)
	assert.Equal(t, int64(100), envelope.Meta.Total)
}

func TestResponseError_JSONStructure(t *testing.T) {
	// Test that error envelope matches FR-013 format
	envelope := responses.NewErrorEnvelope(404, "Resource not found").
		WithRequestID("req-404").
		WithErrorDetails(responses.ErrorDetail{Message: "User with ID 123 not found"}).
		Build()

	// Check structure
	assert.Nil(t, envelope.Data)
	assert.NotNil(t, envelope.Error)
	assert.Equal(t, 404, envelope.Error.Code)
	assert.Equal(t, "Resource not found", envelope.Error.Message)
	assert.Len(t, envelope.Error.Details, 1)
}
