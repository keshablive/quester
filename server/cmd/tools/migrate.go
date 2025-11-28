package main

import (
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	"github.com/keshablive/quester/internal/framework/database"
	"github.com/keshablive/quester/internal/migrations"
)

// Migration CLI tool for GORM auto-migrations
// Usage:
//   go run cmd/tools/migrate.go [mode] [tables...]
//
// Modes:
//   all        - Migrate all tables
//   core       - Migrate only core tables (User, Tenant, RefreshToken)
//   selective  - Migrate specific tables (requires table list)
//   info       - Show migration configuration
//
// Examples:
//   go run cmd/tools/migrate.go all
//   go run cmd/tools/migrate.go core
//   go run cmd/tools/migrate.go selective users quests badges
//   go run cmd/tools/migrate.go info

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: .env file not found, using environment variables")
	}

	// Parse command line arguments
	if len(os.Args) < 2 {
		printUsage()
		os.Exit(1)
	}

	mode := os.Args[1]

	// Handle info command
	if mode == "info" {
		showMigrationInfo()
		return
	}

	// Set migration mode
	os.Setenv("MIGRATION_MODE", mode)

	// For selective mode, set tables
	if mode == "selective" {
		if len(os.Args) < 3 {
			log.Fatal("❌ Selective mode requires table names\n" +
				"Example: go run cmd/tools/migrate.go selective users quests badges")
		}
		tables := ""
		for i := 2; i < len(os.Args); i++ {
			if i > 2 {
				tables += ","
			}
			tables += os.Args[i]
		}
		os.Setenv("MIGRATE_TABLES", tables)
	}

	// Validate mode
	validModes := map[string]bool{
		"all":       true,
		"core":      true,
		"selective": true,
	}
	if !validModes[mode] {
		log.Fatalf("❌ Invalid mode: %s\n"+
			"Valid modes: all, core, selective, info", mode)
	}

	// Get database URL
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("❌ DATABASE_URL environment variable not set")
	}

	// Initialize database
	dbCfg := &database.Config{
		DatabaseURL:     databaseURL,
		MaxOpenConns:    10,
		MaxIdleConns:    5,
		ConnMaxLifetime: 3600,
		LogQueries:      false,
	}

	if err := database.Initialize(dbCfg); err != nil {
		log.Fatalf("❌ Failed to initialize database: %v", err)
	}
	defer database.Close()

	log.Println("✅ Database connected")

	// Run migrations
	if err := migrations.RunMigrations(database.DB); err != nil {
		log.Fatalf("❌ Migration failed: %v", err)
	}

	log.Println("🎉 Migration completed successfully!")
}

func printUsage() {
	fmt.Println(`
Migration Tool - GORM Auto-Migration Manager

Usage:
  go run cmd/tools/migrate.go [mode] [tables...]

Modes:
  all        - Migrate all tables (full schema)
  core       - Migrate only core tables (User, Tenant, RefreshToken, etc.)
  selective  - Migrate specific tables (requires table list)
  info       - Show current migration configuration

Examples:
  # Migrate all tables
  go run cmd/tools/migrate.go all

  # Migrate only core tables
  go run cmd/tools/migrate.go core

  # Migrate specific tables
  go run cmd/tools/migrate.go selective users quests badges

  # Show configuration
  go run cmd/tools/migrate.go info

Environment Variables:
  DATABASE_URL     - PostgreSQL connection string (required)
  MIGRATION_MODE   - Migration mode (all|core|selective|none)
  MIGRATE_TABLES   - Comma-separated table names for selective mode

Notes:
  - This tool uses GORM AutoMigrate for schema updates
  - For production, consider using SQL migrations (migrations/*.sql)
  - GORM AutoMigrate is safe but cannot drop columns or tables
  - Always backup database before running migrations in production`)
}

func showMigrationInfo() {
	mode := migrations.GetMigrationMode()
	tables := migrations.GetSelectiveTables()

	fmt.Println("\n📋 Migration Configuration")
	fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	fmt.Printf("Mode: %s\n", mode)

	if mode == migrations.MigrationModeSelective {
		fmt.Printf("Tables: %v\n", getTableNames(tables))
	}

	fmt.Println("\nAvailable Modes:")
	fmt.Println("  • all       - Migrate all tables")
	fmt.Println("  • core      - Migrate core tables only")
	fmt.Println("  • selective - Migrate specific tables")
	fmt.Println("  • none      - Use SQL migrations (default)")

	fmt.Println("\nCore Tables:")
	fmt.Println("  • tenants, users, user_2fa")
	fmt.Println("  • refresh_tokens, encryption_keys")
	fmt.Println("  • audit_logs")

	fmt.Println("\nFeature Tables:")
	fmt.Println("  Quest:       quests, badges, user_badges, achievements, leaderboards")
	fmt.Println("  LMS:         courses, lessons, enrollments, assessments, certificates")
	fmt.Println("  Social:      posts, comments, likes, follows, activities, interactions")
	fmt.Println("  Messaging:   messages, notifications")
	fmt.Println("  Streaming:   streams, video_streams")
	fmt.Println("  Property:    properties, classified_ads, marketplace_listings")
	fmt.Println("  Analytics:   user_analytics, course_analytics, engagement_analytics")
	fmt.Println("  Payments:    transactions")
	fmt.Println()
}

func getTableNames(tables map[string]bool) []string {
	if tables == nil {
		return []string{}
	}
	names := make([]string, 0, len(tables))
	for name := range tables {
		names = append(names, name)
	}
	return names
}
