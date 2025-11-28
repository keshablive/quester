// Package responses provides HTTP response utilities for the Quester API.
// 008-api-response-optimization T007, T010-T012: Field filtering utilities
package responses

import (
	"encoding/json"
	"strings"
)

// SensitiveFields that are always excluded regardless of client request.
// FR-005a: Silently exclude sensitive fields from responses
var SensitiveFields = map[string]bool{
	"password":          true,
	"password_hash":     true,
	"hashed_password":   true,
	"totp_secret":       true,
	"two_factor_secret": true,
	"refresh_token":     true,
	"api_key":           true,
	"api_secret":        true,
	"secret":            true,
	"secret_key":        true,
	"internal_id":       true,
	"tenant_secret":     true,
	"stripe_secret":     true,
	"stripe_secret_key": true,
	"webhook_secret":    true,
	"private_key":       true,
	"encryption_key":    true,
	"backup_codes":      true,
	"recovery_codes":    true,
}

// FieldSelector parses and applies field filtering.
// FR-001: Support ?fields=field1,field2,field3 query parameter
// FR-002: Support dot notation for nested fields
type FieldSelector struct {
	// Fields are the top-level fields requested
	Fields []string

	// NestedFields maps parent field to child fields: "instructor" -> ["name", "avatar"]
	NestedFields map[string][]string

	// HasSelection indicates whether any fields were explicitly requested
	HasSelection bool

	// AllFieldsInvalid is set when all requested fields were invalid/unknown
	AllFieldsInvalid bool
}

// ParseFields parses the fields parameter string into a FieldSelector.
// FR-002: Support dot notation for nested fields: instructor.name, instructor.avatar
//
// Example: "id,title,instructor.name,instructor.avatar"
// Result: Fields=["id","title"], NestedFields={"instructor":["name","avatar"]}
func ParseFields(fieldsParam string) *FieldSelector {
	if fieldsParam == "" {
		return &FieldSelector{HasSelection: false}
	}

	selector := &FieldSelector{
		Fields:       make([]string, 0),
		NestedFields: make(map[string][]string),
		HasSelection: true,
	}

	parts := strings.Split(fieldsParam, ",")
	for _, part := range parts {
		field := strings.TrimSpace(part)
		if field == "" {
			continue
		}

		// Check for nested field (dot notation)
		if dotIdx := strings.Index(field, "."); dotIdx > 0 {
			parent := field[:dotIdx]
			child := field[dotIdx+1:]
			if parent != "" && child != "" {
				selector.NestedFields[parent] = append(selector.NestedFields[parent], child)
				// Also include parent in top-level fields for filtering
				if !containsString(selector.Fields, parent) {
					selector.Fields = append(selector.Fields, parent)
				}
			}
		} else {
			if !containsString(selector.Fields, field) {
				selector.Fields = append(selector.Fields, field)
			}
		}
	}

	return selector
}

// ParseFieldsFromSlice creates a FieldSelector from a pre-parsed slice of fields.
func ParseFieldsFromSlice(fields []string) *FieldSelector {
	if len(fields) == 0 {
		return &FieldSelector{HasSelection: false}
	}

	selector := &FieldSelector{
		Fields:       make([]string, 0),
		NestedFields: make(map[string][]string),
		HasSelection: true,
	}

	for _, field := range fields {
		field = strings.TrimSpace(field)
		if field == "" {
			continue
		}

		if dotIdx := strings.Index(field, "."); dotIdx > 0 {
			parent := field[:dotIdx]
			child := field[dotIdx+1:]
			if parent != "" && child != "" {
				selector.NestedFields[parent] = append(selector.NestedFields[parent], child)
				if !containsString(selector.Fields, parent) {
					selector.Fields = append(selector.Fields, parent)
				}
			}
		} else {
			if !containsString(selector.Fields, field) {
				selector.Fields = append(selector.Fields, field)
			}
		}
	}

	return selector
}

// FilterResult contains the filtered data and metadata
type FilterResult struct {
	Data            interface{}
	RequestedFields []string
	OmittedFields   []string
	ValidFields     []string
	InvalidFields   []string
	AllInvalid      bool
	Warning         string
}

// FilterData filters data according to the field selector.
// FR-003: Ignore invalid/unknown field names silently
// FR-005: Apply field filtering to both single resource and list endpoints
// FR-005a: Silently exclude sensitive fields
//
// Returns filtered data and metadata about what was filtered.
func (s *FieldSelector) FilterData(data interface{}) *FilterResult {
	result := &FilterResult{
		RequestedFields: s.Fields,
	}

	// No selection means return full data (with sensitive fields removed)
	if !s.HasSelection {
		result.Data = removeSensitiveFields(data)
		return result
	}

	// Convert to map for filtering
	dataMap, ok := toMap(data)
	if !ok {
		// If can't convert, return original with sensitive fields removed
		result.Data = removeSensitiveFields(data)
		return result
	}

	// Track valid and invalid fields
	allKeys := getMapKeys(dataMap)
	for _, field := range s.Fields {
		if _, exists := dataMap[field]; exists {
			result.ValidFields = append(result.ValidFields, field)
		} else {
			result.InvalidFields = append(result.InvalidFields, field)
		}
	}

	// T010a: Handle edge case - all invalid fields
	if len(result.ValidFields) == 0 && len(s.Fields) > 0 {
		result.AllInvalid = true
		result.Warning = "All requested fields are invalid or unknown"
		result.Data = map[string]interface{}{}
		result.OmittedFields = allKeys
		return result
	}

	// Filter the data
	filtered := make(map[string]interface{})
	for _, field := range result.ValidFields {
		// Skip sensitive fields even if requested
		if IsSensitiveField(field) {
			continue
		}

		value, exists := dataMap[field]
		if !exists {
			continue
		}

		// Handle nested field filtering
		if nestedFields, hasNested := s.NestedFields[field]; hasNested && len(nestedFields) > 0 {
			nestedValue := filterNestedFields(value, nestedFields)
			filtered[field] = nestedValue
		} else {
			filtered[field] = value
		}
	}

	// Calculate omitted fields (all fields not in result)
	for key := range dataMap {
		if !containsString(result.ValidFields, key) && !IsSensitiveField(key) {
			result.OmittedFields = append(result.OmittedFields, key)
		}
	}

	// Remove sensitive fields from omitted list (they shouldn't be revealed)
	result.OmittedFields = filterNonSensitive(result.OmittedFields)

	result.Data = filtered
	return result
}

// FilterSlice filters a slice of data items according to the field selector.
// FR-005: Apply field filtering to list endpoints
func (s *FieldSelector) FilterSlice(data []interface{}) *FilterResult {
	result := &FilterResult{
		RequestedFields: s.Fields,
	}

	if !s.HasSelection {
		// Remove sensitive fields from each item
		filtered := make([]interface{}, len(data))
		for i, item := range data {
			filtered[i] = removeSensitiveFields(item)
		}
		result.Data = filtered
		return result
	}

	filtered := make([]interface{}, 0, len(data))
	for _, item := range data {
		itemResult := s.FilterData(item)
		filtered = append(filtered, itemResult.Data)

		// Aggregate metadata from first item
		if len(result.ValidFields) == 0 {
			result.ValidFields = itemResult.ValidFields
			result.InvalidFields = itemResult.InvalidFields
			result.OmittedFields = itemResult.OmittedFields
			result.AllInvalid = itemResult.AllInvalid
			result.Warning = itemResult.Warning
		}
	}

	result.Data = filtered
	return result
}

// IsSensitiveField checks if a field name is in the sensitive blocklist
func IsSensitiveField(field string) bool {
	// Check exact match
	if SensitiveFields[field] {
		return true
	}
	// Check lowercase version
	return SensitiveFields[strings.ToLower(field)]
}

// filterNestedFields filters nested object fields
func filterNestedFields(value interface{}, fields []string) interface{} {
	nestedMap, ok := toMap(value)
	if !ok {
		return value
	}

	filtered := make(map[string]interface{})
	for _, field := range fields {
		if IsSensitiveField(field) {
			continue
		}
		if val, exists := nestedMap[field]; exists {
			filtered[field] = val
		}
	}
	return filtered
}

// removeSensitiveFields removes sensitive fields from data
func removeSensitiveFields(data interface{}) interface{} {
	dataMap, ok := toMap(data)
	if !ok {
		return data
	}

	result := make(map[string]interface{})
	for key, value := range dataMap {
		if IsSensitiveField(key) {
			continue
		}
		// Recursively remove sensitive fields from nested objects
		if nestedMap, ok := toMap(value); ok {
			result[key] = removeSensitiveFields(nestedMap)
		} else {
			result[key] = value
		}
	}
	return result
}

// toMap converts various types to map[string]interface{}
func toMap(data interface{}) (map[string]interface{}, bool) {
	if data == nil {
		return nil, false
	}

	// Already a map
	if m, ok := data.(map[string]interface{}); ok {
		return m, true
	}

	// Try JSON marshal/unmarshal for struct conversion
	jsonBytes, err := json.Marshal(data)
	if err != nil {
		return nil, false
	}

	var result map[string]interface{}
	if err := json.Unmarshal(jsonBytes, &result); err != nil {
		return nil, false
	}

	return result, true
}

// getMapKeys returns all keys from a map
func getMapKeys(m map[string]interface{}) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		if !IsSensitiveField(k) {
			keys = append(keys, k)
		}
	}
	return keys
}

// containsString checks if a string slice contains a value
func containsString(slice []string, value string) bool {
	for _, v := range slice {
		if v == value {
			return true
		}
	}
	return false
}

// filterNonSensitive removes sensitive field names from a slice
func filterNonSensitive(fields []string) []string {
	result := make([]string, 0, len(fields))
	for _, field := range fields {
		if !IsSensitiveField(field) {
			result = append(result, field)
		}
	}
	return result
}
