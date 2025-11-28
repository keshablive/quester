package migrations

import (
	"fmt"
	"os"
	"strings"

	"github.com/gofiber/fiber/v2/log"
	"github.com/keshablive/quester/internal/models"
	"gorm.io/gorm"
)

// MigrationMode determines which tables to migrate
type MigrationMode string

const (
	// MigrationModeAll migrates all tables
	MigrationModeAll MigrationMode = "all"
	// MigrationModeCore migrates only core tables (User, Tenant, RefreshToken)
	MigrationModeCore MigrationMode = "core"
	// MigrationModeNone skips GORM auto-migration (use SQL migrations only)
	MigrationModeNone MigrationMode = "none"
	// MigrationModeSelective migrates specific tables based on MIGRATE_TABLES env var
	MigrationModeSelective MigrationMode = "selective"
)

// GetMigrationMode returns the migration mode from environment
func GetMigrationMode() MigrationMode {
	mode := os.Getenv("MIGRATION_MODE")
	if mode == "" {
		return MigrationModeNone // Default: use SQL migrations
	}
	return MigrationMode(strings.ToLower(mode))
}

// GetSelectiveTables returns list of tables to migrate in selective mode
// Format: MIGRATE_TABLES=users,tenants,quests
func GetSelectiveTables() map[string]bool {
	tables := os.Getenv("MIGRATE_TABLES")
	if tables == "" {
		return nil
	}

	tableMap := make(map[string]bool)
	for _, table := range strings.Split(tables, ",") {
		tableMap[strings.TrimSpace(table)] = true
	}
	return tableMap
}

// RunMigrations runs database migrations based on configuration
// Environment Variables:
//   - MIGRATION_MODE: all|core|none|selective (default: none)
//   - MIGRATE_TABLES: comma-separated table names for selective mode
//
// Examples:
//   - MIGRATION_MODE=all - Migrate all models
//   - MIGRATION_MODE=core - Migrate only User, Tenant, RefreshToken
//   - MIGRATION_MODE=selective MIGRATE_TABLES=users,quests - Migrate specific tables
//   - MIGRATION_MODE=none - Use SQL migrations only (default)
func RunMigrations(db *gorm.DB) error {
	mode := GetMigrationMode()

	switch mode {
	case MigrationModeNone:
		log.Info("📋 GORM auto-migration disabled (MIGRATION_MODE=none)")
		log.Info("💡 Run SQL migrations: psql -U postgres -d quester -f migrations/XXX_migration.up.sql")
		return nil

	case MigrationModeCore:
		log.Info("🔧 Running core table migrations (User, Tenant, RefreshToken)...")
		return migrateCoreModels(db)

	case MigrationModeAll:
		log.Info("🚀 Running full database auto-migration (all models)...")
		return migrateAllModels(db)

	case MigrationModeSelective:
		tables := GetSelectiveTables()
		if len(tables) == 0 {
			return fmt.Errorf("MIGRATION_MODE=selective requires MIGRATE_TABLES environment variable")
		}
		log.Infof("🎯 Running selective migrations for tables: %v", tables)
		return migrateSelectiveModels(db, tables)

	default:
		return fmt.Errorf("invalid MIGRATION_MODE: %s (valid: all, core, none, selective)", mode)
	}
}

// migrateCoreModels migrates essential tables required for basic operation
func migrateCoreModels(db *gorm.DB) error {
	models := []interface{}{
		&models.Tenant{},
		&models.User{},
		&models.User2FA{},
		&models.RefreshToken{},
		&models.EncryptionKey{},
	}

	if err := db.AutoMigrate(models...); err != nil {
		return fmt.Errorf("core migration failed: %w", err)
	}

	log.Info("✅ Core tables migrated successfully")
	return nil
}

// migrateAllModels migrates all application models
func migrateAllModels(db *gorm.DB) error {
	// Group models by feature for organized migration

	// Core models
	coreModels := []interface{}{
		&models.Tenant{},
		&models.User{},
		&models.User2FA{},
		&models.RefreshToken{},
		&models.EncryptionKey{},
		&models.AuditLog{},
	}

	// Quest & Gamification
	questModels := []interface{}{
		&models.Quest{},
		&models.Badge{},
		&models.UserBadge{},
		&models.UserAchievementBadge{},
		&models.Achievement{},
		&models.Leaderboard{},
	}

	// LMS (Learning Management System)
	lmsModels := []interface{}{
		&models.Course{},
		&models.Lesson{},
		&models.Enrollment{},
		&models.Assessment{},
		&models.Certificate{},
	}

	// Social & Community
	socialModels := []interface{}{
		&models.Post{},
		&models.Comment{},
		&models.Like{},
		&models.Follow{},
		&models.Activity{},
		&models.Interaction{},
	}

	// Messaging & Notifications
	messagingModels := []interface{}{
		&models.Message{},
		&models.Notification{},
	}

	// Video Streaming
	streamModels := []interface{}{
		&models.Stream{},
		&models.VideoStream{},
	}

	// Property & Classifieds
	propertyModels := []interface{}{
		&models.Property{},
		&models.ClassifiedAd{},
		&models.MarketplaceListing{},
		&models.MarketplaceReview{},
	}

	// Analytics & Reporting
	analyticsModels := []interface{}{
		&models.UserAnalytics{},
		&models.CourseAnalytics{},
		&models.EngagementAnalytics{},
		&models.Dashboard{},
		&models.Report{},
	}

	// Payments
	paymentModels := []interface{}{
		&models.Transaction{},
	}

	// Migrate in order
	modelGroups := []struct {
		name   string
		models []interface{}
	}{
		{"Core", coreModels},
		{"Quest & Gamification", questModels},
		{"LMS", lmsModels},
		{"Social", socialModels},
		{"Messaging", messagingModels},
		{"Streaming", streamModels},
		{"Property", propertyModels},
		{"Analytics", analyticsModels},
		{"Payments", paymentModels},
	}

	for _, group := range modelGroups {
		log.Infof("  📦 Migrating %s models...", group.name)
		if err := db.AutoMigrate(group.models...); err != nil {
			return fmt.Errorf("%s migration failed: %w", group.name, err)
		}
	}

	log.Info("✅ All tables migrated successfully")
	return nil
}

// migrateSelectiveModels migrates only specified tables
func migrateSelectiveModels(db *gorm.DB, tables map[string]bool) error {
	// Map table names to models
	tableModels := map[string]interface{}{
		"tenants":                 &models.Tenant{},
		"users":                   &models.User{},
		"user_2fa":                &models.User2FA{},
		"refresh_tokens":          &models.RefreshToken{},
		"encryption_keys":         &models.EncryptionKey{},
		"audit_logs":              &models.AuditLog{},
		"quests":                  &models.Quest{},
		"badges":                  &models.Badge{},
		"user_badges":             &models.UserBadge{},
		"user_achievement_badges": &models.UserAchievementBadge{},
		"achievements":            &models.Achievement{},
		"leaderboards":            &models.Leaderboard{},
		"courses":                 &models.Course{},
		"lessons":                 &models.Lesson{},
		"enrollments":             &models.Enrollment{},
		"assessments":             &models.Assessment{},
		"certificates":            &models.Certificate{},
		"posts":                   &models.Post{},
		"comments":                &models.Comment{},
		"likes":                   &models.Like{},
		"follows":                 &models.Follow{},
		"activities":              &models.Activity{},
		"interactions":            &models.Interaction{},
		"messages":                &models.Message{},
		"notifications":           &models.Notification{},
		"streams":                 &models.Stream{},
		"video_streams":           &models.VideoStream{},
		"properties":              &models.Property{},
		"classified_ads":          &models.ClassifiedAd{},
		"marketplace_listings":    &models.MarketplaceListing{},
		"marketplace_reviews":     &models.MarketplaceReview{},
		"user_analytics":          &models.UserAnalytics{},
		"course_analytics":        &models.CourseAnalytics{},
		"engagement_analytics":    &models.EngagementAnalytics{},
		"dashboards":              &models.Dashboard{},
		"reports":                 &models.Report{},
		"transactions":            &models.Transaction{},
	}

	var modelsToMigrate []interface{}
	for tableName, shouldMigrate := range tables {
		if shouldMigrate {
			if model, exists := tableModels[tableName]; exists {
				modelsToMigrate = append(modelsToMigrate, model)
				log.Infof("  ✓ Including table: %s", tableName)
			} else {
				log.Warnf("  ⚠ Unknown table: %s (skipping)", tableName)
			}
		}
	}

	if len(modelsToMigrate) == 0 {
		return fmt.Errorf("no valid tables found to migrate")
	}

	if err := db.AutoMigrate(modelsToMigrate...); err != nil {
		return fmt.Errorf("selective migration failed: %w", err)
	}

	log.Infof("✅ Migrated %d tables successfully", len(modelsToMigrate))
	return nil
}
