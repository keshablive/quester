// Package includes provides include-based field selection for API responses.
//
// This package implements relationship preloading optimization per FR-009/FR-010
// of specification 009-database-query-optimization, providing configurable eager
// loading to reduce N+1 queries while respecting multi-tenant architecture.
//
// Key Features:
//   - Validated include parameter parsing
//   - Configurable maximum include depth
//   - Predefined safe include sets per entity
//   - GORM Preload integration
//   - Multi-tenant aware relationship loading
//
// Usage:
//
//	// Parse includes from request
//	includes, err := includes.Parse(c.Query("include"), AllowedCourseIncludes)
//	if err != nil {
//	    return handleError(err)
//	}
//
//	// Apply includes to query
//	query := db.Model(&Course{}).Scopes(TenantScope(tenantID))
//	query = includes.ApplyPreloads(query)
//
// Constitution Compliance:
//   - Multi-Tenant Architecture: Preloads respect tenant boundaries
//   - Security First: Only whitelisted relationships can be included
//   - Performance First: Prevents unbounded relationship loading
//
// Task Reference: 009-database-query-optimization T002
package includes
