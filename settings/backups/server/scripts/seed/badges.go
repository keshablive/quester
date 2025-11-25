// Seed script for initial badge data
// Usage: go run server/scripts/seed/badges.go
package main

import (
	"fmt"
	"log"
	"os"

	"github.com/google/uuid"
	"github.com/yourusername/quester/internal/framework/config"
	"github.com/yourusername/quester/internal/framework/database"
	"github.com/yourusername/quester/internal/models"
	"gorm.io/gorm"
)

// seedBadges contains the initial badge definitions
var seedBadges = []models.Badge{
	// Bronze Tier - Auto Award (< 100 points)
	{
		Name:            "First Steps",
		Description:     "Complete your first quest and begin your journey",
		IconURL:         "https://assets.quester.app/badges/first-steps.svg",
		Tier:            models.BadgeTierBronze,
		PointsThreshold: 10,
		AutoAward:       true,
		Category:        models.BadgeCategoryQuest,
	},
	{
		Name:            "XP Collector",
		Description:     "Earn your first 50 experience points",
		IconURL:         "https://assets.quester.app/badges/xp-collector.svg",
		Tier:            models.BadgeTierBronze,
		PointsThreshold: 50,
		AutoAward:       true,
		Category:        models.BadgeCategoryQuest,
	},
	{
		Name:            "Week Warrior",
		Description:     "Log in for 7 consecutive days",
		IconURL:         "https://assets.quester.app/badges/week-warrior.svg",
		Tier:            models.BadgeTierBronze,
		PointsThreshold: 30,
		AutoAward:       true,
		Category:        models.BadgeCategorySocial,
	},

	// Silver Tier - Auto Award (< 100 points)
	{
		Name:            "Quest Novice",
		Description:     "Complete 5 quests successfully",
		IconURL:         "https://assets.quester.app/badges/quest-novice.svg",
		Tier:            models.BadgeTierSilver,
		PointsThreshold: 75,
		AutoAward:       true,
		Category:        models.BadgeCategoryQuest,
	},
	{
		Name:            "Social Butterfly",
		Description:     "Connect with 10 other learners",
		IconURL:         "https://assets.quester.app/badges/social-butterfly.svg",
		Tier:            models.BadgeTierSilver,
		PointsThreshold: 60,
		AutoAward:       true,
		Category:        models.BadgeCategorySocial,
	},

	// Gold Tier - Manual Approval (>= 100 points)
	{
		Name:            "Quest Master",
		Description:     "Complete 25 quests and prove your dedication",
		IconURL:         "https://assets.quester.app/badges/quest-master.svg",
		Tier:            models.BadgeTierGold,
		PointsThreshold: 150,
		AutoAward:       false,
		Category:        models.BadgeCategoryQuest,
	},
	{
		Name:            "Learning Champion",
		Description:     "Complete 3 full courses with excellence",
		IconURL:         "https://assets.quester.app/badges/learning-champion.svg",
		Tier:            models.BadgeTierGold,
		PointsThreshold: 200,
		AutoAward:       false,
		Category:        models.BadgeCategoryLearning,
	},
	{
		Name:            "Community Leader",
		Description:     "Help 50 other learners and mentor the community",
		IconURL:         "https://assets.quester.app/badges/community-leader.svg",
		Tier:            models.BadgeTierGold,
		PointsThreshold: 180,
		AutoAward:       false,
		Category:        models.BadgeCategorySocial,
	},

	// Platinum Tier - Manual Approval (>= 100 points)
	{
		Name:            "Course Creator",
		Description:     "Create and publish 5 high-quality courses",
		IconURL:         "https://assets.quester.app/badges/course-creator.svg",
		Tier:            models.BadgeTierPlatinum,
		PointsThreshold: 300,
		AutoAward:       false,
		Category:        models.BadgeCategoryLearning,
	},
	{
		Name:            "Legendary Achiever",
		Description:     "Reach the pinnacle of the gamification system",
		IconURL:         "https://assets.quester.app/badges/legendary-achiever.svg",
		Tier:            models.BadgeTierPlatinum,
		PointsThreshold: 500,
		AutoAward:       false,
		Category:        models.BadgeCategoryQuest,
	},
}

func main() {
	log.Println("🚀 Starting badge seed script...")

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("❌ Failed to load config: %v", err)
	}

	// Initialize database
	dbCfg := &database.Config{
		DatabaseURL:     cfg.DatabaseURL,
		MaxOpenConns:    10, // Lower for seed script
		MaxIdleConns:    2,
		ConnMaxLifetime: cfg.DBConnMaxLifetime,
		LogQueries:      cfg.DBLogQueries,
	}
	if err := database.Initialize(dbCfg); err != nil {
		log.Fatalf("❌ Failed to initialize database: %v", err)
	}
	log.Println("✓ Database connected")

	// Get tenant ID from environment or use default
	tenantIDStr := os.Getenv("SEED_TENANT_ID")
	var tenantID uuid.UUID
	if tenantIDStr != "" {
		tenantID, err = uuid.Parse(tenantIDStr)
		if err != nil {
			log.Fatalf("❌ Invalid tenant ID format: %v", err)
		}
	} else {
		// Use default tenant ID (you may need to adjust this to match your first tenant)
		tenantID = uuid.MustParse("00000000-0000-0000-0000-000000000001")
	}
	log.Printf("✓ Using tenant ID: %s", tenantID)

	// Start transaction for atomic seed
	tx := database.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
			log.Fatalf("❌ Panic during seed: %v", r)
		}
	}()

	// Check if badges already exist for this tenant
	var existingCount int64
	if err := tx.Model(&models.Badge{}).Where("tenant_id = ?", tenantID).Count(&existingCount).Error; err != nil {
		tx.Rollback()
		log.Fatalf("❌ Failed to check existing badges: %v", err)
	}

	if existingCount > 0 {
		log.Printf("⚠️  Found %d existing badges for tenant %d", existingCount, tenantID)
		log.Println("ℹ️  Use SEED_FORCE=true to delete and recreate badges")

		if os.Getenv("SEED_FORCE") == "true" {
			log.Println("🗑️  Deleting existing badges...")
			if err := tx.Where("tenant_id = ?", tenantID).Delete(&models.Badge{}).Error; err != nil {
				tx.Rollback()
				log.Fatalf("❌ Failed to delete existing badges: %v", err)
			}
			log.Println("✓ Existing badges deleted")
		} else {
			tx.Rollback()
			log.Println("✅ Seed script completed (no changes made)")
			return
		}
	}

	// Insert badges
	successCount := 0
	for i, badge := range seedBadges {
		badge.TenantID = tenantID

		// Validate badge before insertion
		if err := badge.Validate(); err != nil {
			tx.Rollback()
			log.Fatalf("❌ Badge validation failed for '%s': %v", badge.Name, err)
		}

		// Create badge
		if err := tx.Create(&badge).Error; err != nil {
			tx.Rollback()
			log.Fatalf("❌ Failed to create badge '%s': %v", badge.Name, err)
		}

		successCount++
		log.Printf("  [%d/%d] ✓ Created: %s (%s, %d pts, auto=%v)",
			i+1, len(seedBadges), badge.Name, badge.Tier, badge.PointsThreshold, badge.AutoAward)
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		log.Fatalf("❌ Failed to commit transaction: %v", err)
	}

	// Verify insertion
	var finalCount int64
	if err := database.DB.Model(&models.Badge{}).Where("tenant_id = ?", tenantID).Count(&finalCount).Error; err != nil {
		log.Printf("⚠️  Failed to verify badge count: %v", err)
	} else {
		log.Printf("✓ Verified: %d badges in database", finalCount)
	}

	log.Println("✅ Badge seed script completed successfully!")
	log.Println()
	log.Println("Summary:")
	log.Printf("  - Tenant ID: %d", tenantID)
	log.Printf("  - Badges created: %d", successCount)
	log.Printf("  - Auto-award badges: 5 (Bronze/Silver < 100 pts)")
	log.Printf("  - Manual approval badges: 5 (Gold/Platinum >= 100 pts)")
	log.Println()
	log.Println("Next steps:")
	log.Println("  1. Restart server to pick up new badges")
	log.Println("  2. Test GET /api/v1/badges endpoint")
	log.Println("  3. Trigger quest completion to test auto-award")
	log.Println()
	log.Println("To re-seed (delete and recreate):")
	log.Println("  SEED_FORCE=true go run server/scripts/seed/badges.go")
	log.Println()
	log.Println("To seed for different tenant:")
	log.Println("  SEED_TENANT_ID=2 go run server/scripts/seed/badges.go")
}

// ensureTenantExists checks if tenant exists, creates if not (for testing)
func ensureTenantExists(db *gorm.DB, tenantID int64) error {
	var count int64
	if err := db.Table("tenants").Where("id = ?", tenantID).Count(&count).Error; err != nil {
		return fmt.Errorf("failed to check tenant: %w", err)
	}

	if count == 0 {
		log.Printf("⚠️  Tenant %d does not exist. Create tenant first.", tenantID)
		return fmt.Errorf("tenant %d not found", tenantID)
	}

	return nil
}
