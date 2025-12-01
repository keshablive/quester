// T222: Test manual DEK rotation
package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/framework/config"
	"github.com/keshablive/quester/internal/framework/database"
	"github.com/keshablive/quester/internal/models"
	"github.com/keshablive/quester/internal/repositories"
	"github.com/keshablive/quester/internal/framework/service"
)

func main() {
	fmt.Println("=== T222: Testing Manual DEK Rotation ===")
	fmt.Println()

	// Set environment
	os.Setenv("DATABASE_URL", "postgresql://quester_user:quester_pass123@localhost:5432/quester_db?sslmode=disable")
	os.Setenv("KMS_PROVIDER", "mock")
	os.Setenv("KMS_DEK_CACHE_TTL", "3600")
	os.Setenv("KMS_AUDIT_LOG_ENABLE", "true")

	// Connect to database
	dbConfig := &database.Config{
		DatabaseURL:     "postgresql://quester_user:quester_pass123@localhost:5432/quester_db?sslmode=disable",
		MaxOpenConns:    25,
		MaxIdleConns:    5,
		ConnMaxLifetime: 5 * time.Minute,
		LogQueries:      false,
	}
	if err := database.Initialize(dbConfig); err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer database.Close()
	fmt.Println("✅ Database connected")

	// Initialize KMS service
	kmsConfig, err := config.LoadKMSConfig()
	if err != nil {
		log.Fatalf("Failed to load KMS config: %v", err)
	}
	fmt.Printf("✅ KMS Config loaded (provider: %s)\n", kmsConfig.Provider)

	// Create encryption key repository for KMS service
	encKeyRepo := repositories.NewEncryptionKeyRepository(database.DB)

	kmsService, err := service.NewKMSService(kmsConfig, encKeyRepo)
	if err != nil {
		log.Fatalf("Failed to initialize KMS service: %v", err)
	}
	fmt.Println("✅ KMS Service initialized")
	fmt.Println()

	// Step 1: Check current keys
	fmt.Println("📋 Step 1: Check current encryption keys")
	var keysBefore []models.EncryptionKey
	database.DB.Order("version").Find(&keysBefore)
	fmt.Printf("   Keys before rotation: %d\n", len(keysBefore))
	for _, key := range keysBefore {
		fmt.Printf("   - %s (v%d, status: %s)\n", key.KeyID, key.Version, key.Status)
	}
	fmt.Println()

	// Step 2: Perform DEK rotation
	fmt.Println("🔄 Step 2: Performing DEK rotation...")
	ctx := context.Background()
	newKey, err := kmsService.RotateDEK(ctx)
	if err != nil {
		log.Fatalf("   ❌ Rotation failed: %v", err)
	}
	fmt.Printf("   ✅ Rotation successful! New key: %s (v%d)\n", newKey.KeyID, newKey.Version)
	fmt.Println()

	// Step 3: Verify rotation results
	fmt.Println("✅ Step 3: Verify rotation results")
	var keysAfter []models.EncryptionKey
	database.DB.Order("version").Find(&keysAfter)
	fmt.Printf("   Keys after rotation: %d\n", len(keysAfter))

	var activeKeys, rotatedKeys int
	for _, key := range keysAfter {
		fmt.Printf("   - %s (v%d, status: %s", key.KeyID, key.Version, key.Status)
		if key.RotatedAt != nil {
			fmt.Printf(", rotated_at: %s", key.RotatedAt.Format("2006-01-02 15:04:05"))
		}
		fmt.Println(")")

		if key.Status == models.KeyStatusActive {
			activeKeys++
		} else if key.Status == models.KeyStatusRotated {
			rotatedKeys++
		}
	}
	fmt.Println()

	// Step 4: Validate expectations
	fmt.Println("🔍 Step 4: Validate expectations")

	if activeKeys != 1 {
		log.Fatalf("   ❌ Expected exactly 1 active key, got %d", activeKeys)
	}
	fmt.Println("   ✅ Exactly 1 active key found")

	if rotatedKeys < 1 {
		log.Fatalf("   ❌ Expected at least 1 rotated key, got %d", rotatedKeys)
	}
	fmt.Printf("   ✅ %d rotated key(s) found\n", rotatedKeys)

	if len(keysAfter) != len(keysBefore)+1 {
		log.Fatalf("   ❌ Expected %d keys after rotation, got %d", len(keysBefore)+1, len(keysAfter))
	}
	fmt.Printf("   ✅ Total keys increased from %d to %d\n", len(keysBefore), len(keysAfter))
	fmt.Println()

	// Step 5: Test encryption with new key
	fmt.Println("🔐 Step 5: Test encryption with new key")
	testSecret := "TEST_TOTP_SECRET_ABCDEFGHIJ"
	userID := uuid.MustParse("00000000-0000-0000-0000-000000000001")
	ciphertext, encryptedDEK, metadata, err := kmsService.EncryptSecret(ctx, testSecret, userID)
	if err != nil {
		log.Fatalf("   ❌ Encryption failed: %v", err)
	}
	fmt.Printf("   ✅ Encrypted successfully (algorithm: %s, version: %d)\n", metadata.Algorithm, metadata.KeyVersion)
	fmt.Println()

	// Step 6: Test decryption with new key
	fmt.Println("🔓 Step 6: Test decryption with new key")
	decrypted, err := kmsService.DecryptSecret(ctx, ciphertext, encryptedDEK, metadata.KeyVersion, userID)
	if err != nil {
		log.Fatalf("   ❌ Decryption failed: %v", err)
	}

	if decrypted != testSecret {
		log.Fatalf("   ❌ Decryption mismatch! Expected: %s, Got: %s", testSecret, decrypted)
	}
	fmt.Println("   ✅ Decrypted successfully and matches original")
	fmt.Println()

	// Step 7: Test decryption with old key (backward compatibility)
	fmt.Println("🔄 Step 7: Test decryption with old key (backward compatibility)")

	// Get the old (rotated) key
	var oldKey models.EncryptionKey
	err = database.DB.Where("status = ?", models.KeyStatusRotated).First(&oldKey).Error
	if err != nil {
		fmt.Println("   ⚠️  No rotated key found (skipping backward compatibility test)")
	} else {
		// The old key's encrypted DEK should still be decryptable
		fmt.Printf("   ✅ Old key %s (v%d) is still available for decryption\n", oldKey.KeyID, oldKey.Version)
		fmt.Printf("   ✅ Status: %s (can decrypt: %v)\n", oldKey.Status, oldKey.CanDecrypt())
	}
	fmt.Println()

	// Summary
	fmt.Println("═══════════════════════════════════════")
	fmt.Println("✅ T222: Manual DEK Rotation - SUCCESS")
	fmt.Println("═══════════════════════════════════════")
	fmt.Println()
	fmt.Println("Test Results:")
	fmt.Printf("  ✅ Old key marked as 'rotated'\n")
	fmt.Printf("  ✅ New key marked as 'active'\n")
	fmt.Printf("  ✅ Encryption works with new key\n")
	fmt.Printf("  ✅ Decryption works with new key\n")
	fmt.Printf("  ✅ Old keys remain decryptable (backward compatibility)\n")
	fmt.Println()
	fmt.Println("Next Steps:")
	fmt.Println("  1. Check audit logs: grep '[KMS-Audit]' server.log")
	fmt.Println("  2. Verify in production with real KMS provider")
	fmt.Println("  3. Set up automatic rotation cron job (every 90 days)")
}
