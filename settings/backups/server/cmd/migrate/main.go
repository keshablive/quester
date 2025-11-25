package main

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// Migration runner using GORM
// Alternative to psql for executing migration files

func main() {
	// Get database URL from environment
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("DATABASE_URL environment variable not set")
	}

	// Connect to database
	db, err := gorm.Open(postgres.Open(databaseURL), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		log.Fatalf("Failed to get database instance: %v", err)
	}
	defer sqlDB.Close()

	// Get migration direction (up or down)
	direction := "up"
	if len(os.Args) > 1 {
		direction = os.Args[1]
	}

	// Find migration files
	migrationsDir := "server/migrations"
	pattern := fmt.Sprintf("*_%s.sql", direction)

	files, err := filepath.Glob(filepath.Join(migrationsDir, pattern))
	if err != nil {
		log.Fatalf("Failed to find migration files: %v", err)
	}

	if len(files) == 0 {
		log.Printf("No migration files found matching pattern: %s", pattern)
		return
	}

	// Sort files to ensure correct order
	sort.Strings(files)

	fmt.Println("===================================================================")
	fmt.Printf("Database Migration Runner - %s\n", strings.ToUpper(direction))
	fmt.Println("===================================================================")
	fmt.Printf("Database: %s\n", databaseURL)
	fmt.Printf("Found %d migration files\n\n", len(files))

	successCount := 0
	failCount := 0

	// Execute migrations
	for _, file := range files {
		migrationName := filepath.Base(file)
		fmt.Printf("Running migration: %s\n", migrationName)

		// Read migration file
		sqlContent, err := os.ReadFile(file)
		if err != nil {
			fmt.Printf("✗ FAILED to read file: %v\n\n", err)
			failCount++
			continue
		}

		// Execute migration
		result := db.Exec(string(sqlContent))
		if result.Error != nil {
			fmt.Printf("✗ FAILED: %v\n\n", result.Error)
			failCount++

			// Stop on first failure for 'up' migrations
			if direction == "up" {
				fmt.Println("Stopping migration process due to failure")
				break
			}
		} else {
			fmt.Printf("✓ SUCCESS\n\n")
			successCount++
		}
	}

	fmt.Println("===================================================================")
	fmt.Println("Migration Summary")
	fmt.Println("===================================================================")
	fmt.Printf("Successful: %d\n", successCount)
	fmt.Printf("Failed: %d\n", failCount)
	fmt.Println()

	if failCount > 0 {
		fmt.Println("❌ Migration process completed with errors")
		os.Exit(1)
	} else {
		fmt.Println("✅ All migrations completed successfully")
	}
}
