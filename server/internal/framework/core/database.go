// Database utilities
package core

import (
	"gorm.io/gorm"
)

var db *gorm.DB

// SetDB sets the global database instance
func SetDB(database *gorm.DB) {
	db = database
}

// GetDB returns the global database instance
func GetDB() *gorm.DB {
	return db
}
