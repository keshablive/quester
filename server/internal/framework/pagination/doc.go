// Package pagination provides cursor-based pagination utilities for the Quester API.
//
// This package implements cursor-based pagination per FR-003/FR-004 of specification
// 009-database-query-optimization, providing efficient pagination for large datasets
// while respecting multi-tenant architecture requirements.
//
// Key Features:
//   - Cursor-based pagination (avoids OFFSET performance issues)
//   - Configurable page sizes with enforced limits
//   - Direction-aware navigation (forward/backward)
//   - Base64-encoded opaque cursor tokens
//   - Type-safe cursor generation and parsing
//
// Usage:
//
//	// Parse cursor from request
//	cursor, err := pagination.ParseCursor(cursorToken)
//	if err != nil {
//	    return handleError(err)
//	}
//
//	// Apply pagination to query
//	query := db.Model(&Course{}).Scopes(TenantScope(tenantID))
//	query = cursor.ApplyToQuery(query, "created_at", "id")
//
//	// Build response metadata
//	meta := pagination.BuildMeta(items, pageSize, hasMore)
//
// Constitution Compliance:
//   - Multi-Tenant Architecture: All queries must include tenant_id filtering
//   - Security First: Cursor tokens are opaque to prevent enumeration attacks
//   - Type Safety: Strong typing for cursor components
//   - Error Handling: Comprehensive error types for invalid cursors
//
// Task Reference: 009-database-query-optimization T001
package pagination
