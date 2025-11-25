package migrations

import (
	"github.com/gofiber/fiber/v2/log"
	"gorm.io/gorm"
)

// RunMigrations runs database migrations
// Note: SQL migrations are executed manually or via migration tools
// This function is a placeholder for programmatic migrations if needed
func RunMigrations(db *gorm.DB) error {
	log.Info("Database migrations should be run via SQL files in migrations/")
	log.Info("Use: psql -U postgres -d quester -f migrations/XXX_migration_name.up.sql")

	// Auto-migrate core models if needed
	// Example: db.AutoMigrate(&models.User{}, &models.Tenant{})

	return nil
}
