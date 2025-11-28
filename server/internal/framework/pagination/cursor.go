// Package pagination provides cursor-based pagination for database queries.
// Task Reference: 009-database-query-optimization T001
package pagination

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Direction represents the pagination direction
type Direction string

const (
	// DirectionForward paginates forward (next page)
	DirectionForward Direction = "forward"
	// DirectionBackward paginates backward (previous page)
	DirectionBackward Direction = "backward"
)

// Default pagination limits
const (
	DefaultPageSize = 20
	MaxPageSize     = 100
	MinPageSize     = 1
)

var (
	// ErrInvalidCursor is returned when cursor parsing fails
	ErrInvalidCursor = errors.New("invalid cursor token")
	// ErrInvalidPageSize is returned when page size is out of bounds
	ErrInvalidPageSize = errors.New("page size must be between 1 and 100")
	// ErrInvalidDirection is returned when direction is not forward/backward
	ErrInvalidDirection = errors.New("direction must be 'forward' or 'backward'")
)

// CursorToken represents a decoded pagination cursor per data-model.md
// Fields:
//   - ID: Last item's UUID for unique ordering
//   - SV: Sort value (timestamp or other sortable field)
//   - Dir: Pagination direction (forward/backward)
//   - SF: Sort field name for multi-field sorting
type CursorToken struct {
	ID        uuid.UUID `json:"id"`            // Last item's UUID
	SortValue string    `json:"sv"`            // Sort value (encoded)
	Direction Direction `json:"dir"`           // forward or backward
	SortField string    `json:"sf,omitempty"`  // Sort field name
	TenantID  uuid.UUID `json:"tid,omitempty"` // Tenant ID for validation
	CreatedAt time.Time `json:"cat,omitempty"` // Cursor creation timestamp
}

// PaginationMeta contains pagination metadata for API responses per contracts/pagination.md
type PaginationMeta struct {
	CurrentCursor string `json:"current_cursor,omitempty"` // Current page cursor
	NextCursor    string `json:"next_cursor,omitempty"`    // Next page cursor (null if no more)
	PrevCursor    string `json:"prev_cursor,omitempty"`    // Previous page cursor (null if first)
	PageSize      int    `json:"page_size"`                // Requested page size
	HasMore       bool   `json:"has_more"`                 // True if more items exist
	TotalCount    *int64 `json:"total_count,omitempty"`    // Optional total count (expensive)
}

// ParseCursor decodes a base64-encoded cursor token
// Returns a zero-value cursor if token is empty (first page)
func ParseCursor(token string) (*CursorToken, error) {
	if token == "" {
		return &CursorToken{
			Direction: DirectionForward,
		}, nil
	}

	// Decode base64
	decoded, err := base64.URLEncoding.DecodeString(token)
	if err != nil {
		// Try standard encoding as fallback
		decoded, err = base64.StdEncoding.DecodeString(token)
		if err != nil {
			return nil, fmt.Errorf("%w: invalid base64 encoding", ErrInvalidCursor)
		}
	}

	// Parse JSON
	var cursor CursorToken
	if err := json.Unmarshal(decoded, &cursor); err != nil {
		return nil, fmt.Errorf("%w: invalid JSON structure", ErrInvalidCursor)
	}

	// Validate direction
	if cursor.Direction != "" && cursor.Direction != DirectionForward && cursor.Direction != DirectionBackward {
		return nil, fmt.Errorf("%w: %s", ErrInvalidDirection, cursor.Direction)
	}

	// Default direction to forward
	if cursor.Direction == "" {
		cursor.Direction = DirectionForward
	}

	return &cursor, nil
}

// Encode generates a base64-encoded cursor token
func (c *CursorToken) Encode() (string, error) {
	// Set creation timestamp if not set
	if c.CreatedAt.IsZero() {
		c.CreatedAt = time.Now().UTC()
	}

	data, err := json.Marshal(c)
	if err != nil {
		return "", fmt.Errorf("failed to encode cursor: %w", err)
	}

	return base64.URLEncoding.EncodeToString(data), nil
}

// IsEmpty returns true if this is a zero-value cursor (first page)
func (c *CursorToken) IsEmpty() bool {
	return c.ID == uuid.Nil && c.SortValue == ""
}

// ValidatePageSize ensures page size is within bounds
func ValidatePageSize(pageSize int) (int, error) {
	if pageSize <= 0 {
		return DefaultPageSize, nil
	}
	if pageSize > MaxPageSize {
		return 0, fmt.Errorf("%w: requested %d, maximum is %d", ErrInvalidPageSize, pageSize, MaxPageSize)
	}
	return pageSize, nil
}

// ApplyToQuery applies cursor-based pagination to a GORM query
// This method handles both forward and backward pagination with proper ordering
//
// Parameters:
//   - query: The base GORM query (should already have tenant scope applied)
//   - sortField: Primary sort field (e.g., "created_at")
//   - idField: Unique ID field for tiebreaker (e.g., "id")
//   - pageSize: Number of items to fetch
//
// The query will use keyset pagination: WHERE (sort_field, id) > (cursor_value, cursor_id)
// This avoids the performance issues of OFFSET-based pagination
func (c *CursorToken) ApplyToQuery(query *gorm.DB, sortField, idField string, pageSize int) *gorm.DB {
	// Apply sort order based on direction
	var orderClause string
	if c.Direction == DirectionBackward {
		orderClause = fmt.Sprintf("%s DESC, %s DESC", sortField, idField)
	} else {
		orderClause = fmt.Sprintf("%s ASC, %s ASC", sortField, idField)
	}
	query = query.Order(orderClause)

	// Apply cursor condition if not first page
	if !c.IsEmpty() {
		if c.Direction == DirectionBackward {
			// Backward: get items BEFORE the cursor
			query = query.Where(
				fmt.Sprintf("(%s, %s) < (?, ?)", sortField, idField),
				c.SortValue, c.ID,
			)
		} else {
			// Forward: get items AFTER the cursor
			query = query.Where(
				fmt.Sprintf("(%s, %s) > (?, ?)", sortField, idField),
				c.SortValue, c.ID,
			)
		}
	}

	// Fetch one extra to determine if there are more items
	query = query.Limit(pageSize + 1)

	return query
}

// BuildMeta constructs pagination metadata from query results
// Call this after executing the query to determine hasMore and generate cursors
//
// Parameters:
//   - items: The fetched items (should have len <= pageSize+1)
//   - pageSize: The requested page size
//   - sortField: The sort field name for cursor generation
//   - getID: Function to extract UUID from an item
//   - getSortValue: Function to extract sort value from an item
func BuildMeta[T any](
	items []T,
	pageSize int,
	sortField string,
	getID func(T) uuid.UUID,
	getSortValue func(T) string,
) (*PaginationMeta, []T) {
	meta := &PaginationMeta{
		PageSize: pageSize,
		HasMore:  false,
	}

	if len(items) == 0 {
		return meta, items
	}

	// Check if we have more items than requested (we fetched pageSize+1)
	hasMore := len(items) > pageSize
	meta.HasMore = hasMore

	// Trim to actual page size
	if hasMore {
		items = items[:pageSize]
	}

	// Generate next cursor from last item
	if len(items) > 0 && hasMore {
		lastItem := items[len(items)-1]
		nextCursor := &CursorToken{
			ID:        getID(lastItem),
			SortValue: getSortValue(lastItem),
			Direction: DirectionForward,
			SortField: sortField,
		}
		if encoded, err := nextCursor.Encode(); err == nil {
			meta.NextCursor = encoded
		}
	}

	// Generate prev cursor from first item (for backward navigation)
	if len(items) > 0 {
		firstItem := items[0]
		prevCursor := &CursorToken{
			ID:        getID(firstItem),
			SortValue: getSortValue(firstItem),
			Direction: DirectionBackward,
			SortField: sortField,
		}
		if encoded, err := prevCursor.Encode(); err == nil {
			meta.PrevCursor = encoded
		}
	}

	return meta, items
}

// BuildMetaSimple is a convenience function for simple pagination without generics
// Use this when you need to build metadata from basic values
func BuildMetaSimple(
	hasMore bool,
	pageSize int,
	lastID uuid.UUID,
	lastSortValue string,
	sortField string,
) *PaginationMeta {
	meta := &PaginationMeta{
		PageSize: pageSize,
		HasMore:  hasMore,
	}

	if hasMore && lastID != uuid.Nil {
		nextCursor := &CursorToken{
			ID:        lastID,
			SortValue: lastSortValue,
			Direction: DirectionForward,
			SortField: sortField,
		}
		if encoded, err := nextCursor.Encode(); err == nil {
			meta.NextCursor = encoded
		}
	}

	return meta
}

// SanitizeSortField validates and sanitizes a sort field name
// to prevent SQL injection in ORDER BY clauses
func SanitizeSortField(field string, allowedFields []string) (string, error) {
	field = strings.ToLower(strings.TrimSpace(field))

	for _, allowed := range allowedFields {
		if strings.ToLower(allowed) == field {
			return allowed, nil
		}
	}

	return "", fmt.Errorf("invalid sort field: %s", field)
}

// ParseDirection converts a string to Direction type
func ParseDirection(dir string) (Direction, error) {
	switch strings.ToLower(strings.TrimSpace(dir)) {
	case "", "forward", "next":
		return DirectionForward, nil
	case "backward", "prev", "previous":
		return DirectionBackward, nil
	default:
		return "", ErrInvalidDirection
	}
}
