// Package responses provides HTTP response utilities for the Quester API.
// 008-api-response-optimization T006: ResponseEnvelope types
package responses

// ResponseEnvelope wraps API responses in standardized format (v2).
// Used when client sends Accept: application/vnd.quester.v2+json
// FR-011: Wrap all successful responses in { "data": ..., "meta": {...} } structure
type ResponseEnvelope struct {
	Data  interface{}    `json:"data"`
	Meta  *ResponseMeta  `json:"meta,omitempty"`
	Error *ResponseError `json:"error,omitempty"`
}

// ResponseMeta contains metadata about the response.
// FR-012: Include pagination metadata for list endpoints
// FR-014: Include request ID in all response metadata
// FR-015: Include fields and omitted arrays when sparse fieldsets used
type ResponseMeta struct {
	// Request tracing (FR-014)
	RequestID string `json:"request_id"`

	// Pagination (FR-012: for list endpoints)
	Page       int   `json:"page,omitempty"`
	Limit      int   `json:"limit,omitempty"`
	Total      int64 `json:"total,omitempty"`
	HasMore    bool  `json:"has_more,omitempty"`
	TotalPages int64 `json:"total_pages,omitempty"`

	// Sparse fieldsets metadata (FR-015)
	Fields  []string `json:"fields,omitempty"`  // Requested fields
	Omitted []string `json:"omitted,omitempty"` // Fields excluded from response

	// Warning messages (e.g., all invalid fields)
	Warnings []string `json:"warnings,omitempty"`
}

// ResponseError contains error details for v2 format.
// FR-013: Wrap all error responses in { "error": { "code": ..., "message": ..., "details": [...] } }
type ResponseError struct {
	Code    int           `json:"code"`
	Message string        `json:"message"`
	Details []ErrorDetail `json:"details,omitempty"`
}

// ErrorDetail provides specific error information
type ErrorDetail struct {
	Field   string `json:"field,omitempty"`
	Message string `json:"message"`
}

// EnvelopeBuilder provides a fluent API for building response envelopes
type EnvelopeBuilder struct {
	envelope *ResponseEnvelope
}

// NewEnvelope creates a new envelope builder with data
func NewEnvelope(data interface{}) *EnvelopeBuilder {
	return &EnvelopeBuilder{
		envelope: &ResponseEnvelope{
			Data: data,
			Meta: &ResponseMeta{},
		},
	}
}

// NewErrorEnvelope creates a new envelope builder for error responses
func NewErrorEnvelope(code int, message string) *EnvelopeBuilder {
	return &EnvelopeBuilder{
		envelope: &ResponseEnvelope{
			Error: &ResponseError{
				Code:    code,
				Message: message,
			},
		},
	}
}

// WithRequestID sets the request ID in metadata
func (b *EnvelopeBuilder) WithRequestID(requestID string) *EnvelopeBuilder {
	if b.envelope.Meta == nil {
		b.envelope.Meta = &ResponseMeta{}
	}
	b.envelope.Meta.RequestID = requestID
	return b
}

// WithPagination sets pagination metadata
// FR-012: Include pagination metadata for list endpoints
func (b *EnvelopeBuilder) WithPagination(page, limit int, total int64) *EnvelopeBuilder {
	if b.envelope.Meta == nil {
		b.envelope.Meta = &ResponseMeta{}
	}
	b.envelope.Meta.Page = page
	b.envelope.Meta.Limit = limit
	b.envelope.Meta.Total = total
	b.envelope.Meta.HasMore = int64(page*limit) < total
	if limit > 0 {
		b.envelope.Meta.TotalPages = (total + int64(limit) - 1) / int64(limit)
	}
	return b
}

// WithFields sets the sparse fieldset metadata
// FR-015: Include fields and omitted arrays when sparse fieldsets used
func (b *EnvelopeBuilder) WithFields(requested []string, omitted []string) *EnvelopeBuilder {
	if b.envelope.Meta == nil {
		b.envelope.Meta = &ResponseMeta{}
	}
	b.envelope.Meta.Fields = requested
	b.envelope.Meta.Omitted = omitted
	return b
}

// WithWarnings adds warning messages to metadata
func (b *EnvelopeBuilder) WithWarnings(warnings ...string) *EnvelopeBuilder {
	if b.envelope.Meta == nil {
		b.envelope.Meta = &ResponseMeta{}
	}
	b.envelope.Meta.Warnings = append(b.envelope.Meta.Warnings, warnings...)
	return b
}

// WithErrorDetails adds details to error response
func (b *EnvelopeBuilder) WithErrorDetails(details ...ErrorDetail) *EnvelopeBuilder {
	if b.envelope.Error != nil {
		b.envelope.Error.Details = append(b.envelope.Error.Details, details...)
	}
	return b
}

// Build returns the constructed envelope
func (b *EnvelopeBuilder) Build() *ResponseEnvelope {
	return b.envelope
}

// PaginationMeta is a helper struct for building pagination metadata
type PaginationMeta struct {
	Page       int   `json:"page"`
	Limit      int   `json:"limit"`
	Total      int64 `json:"total"`
	HasMore    bool  `json:"has_more"`
	TotalPages int64 `json:"total_pages"`
}

// NewPaginationMeta creates pagination metadata from query parameters
func NewPaginationMeta(page, limit int, total int64) PaginationMeta {
	totalPages := int64(0)
	if limit > 0 {
		totalPages = (total + int64(limit) - 1) / int64(limit)
	}
	return PaginationMeta{
		Page:       page,
		Limit:      limit,
		Total:      total,
		HasMore:    int64(page*limit) < total,
		TotalPages: totalPages,
	}
}
