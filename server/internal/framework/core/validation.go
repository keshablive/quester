// Validation utilities
package core

import "github.com/go-playground/validator/v10"

// Validate is the global validator instance
// Used across controllers for request validation
var Validate = validator.New()

// ValidateStruct validates a struct and returns validation errors
func ValidateStruct(s interface{}) error {
	return Validate.Struct(s)
}
