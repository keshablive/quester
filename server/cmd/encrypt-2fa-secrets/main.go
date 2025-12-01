// T217: Migration script to encrypt existing 2FA secrets
// Package: server/cmd/migrate
// Purpose: One-time migration to encrypt existing plaintext 2FA secrets using KMS
//
// Usage: go run cmd/migrate/encrypt_2fa_secrets.go

package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/keshablive/quester/internal/framework/config"
	"github.com/keshablive/quester/internal/framework/database"
	"github.com/keshablive/quester/internal/models"
	"github.com/keshablive/quester/internal/framework/repository"
	"github.com/keshablive/quester/internal/framework/service"
)

func main() {
	log.Println("=== 2FA Secret Encryption Migration ===")
	log.Println("This will encrypt all existing plaintext 2FA secrets using KMS")
	log.Println("")

	// Load environment variables
	if err := loadEnv(); err != nil {
		log.Fatalf("Failed to load environment: %v", err)
	}

	// Connect to database
	dbConfig := &database.Config{
		DatabaseURL:     os.Getenv("DATABASE_URL"),
		MaxOpenConns:    25,
		MaxIdleConns:    5,
		ConnMaxLifetime: 5 * time.Minute,
		LogQueries:      false,
	}
	if err := database.Initialize(dbConfig); err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer database.Close()

	// Initialize KMS service
	kmsConfig, err := config.LoadKMSConfig()
	if err != nil {
		log.Fatalf("Failed to load KMS config: %v", err)
	}

	// Create encryption key repository for KMS service
	encKeyRepo := repository.NewEncryptionKeyRepository(database.DB)

	kmsService, err := service.NewKMSService(kmsConfig, encKeyRepo)
	if err != nil {
		log.Fatalf("Failed to initialize KMS service: %v", err)
	}

	log.Printf("KMS Provider: %s\n", kmsConfig.Provider)
	log.Println("")

	// Get all 2FA records with plaintext secrets
	var user2FAs []models.User2FA
	err = database.DB.Where("secret_encrypted IS NOT NULL AND secret_encrypted != ''").
		Where("encrypted_secret_ciphertext IS NULL OR encrypted_secret_ciphertext = ''").
		Find(&user2FAs).Error

	if err != nil {
		log.Fatalf("Failed to query 2FA records: %v", err)
	}

	if len(user2FAs) == 0 {
		log.Println("✅ No plaintext secrets found - all secrets already encrypted!")
		return
	}

	log.Printf("Found %d 2FA records with plaintext secrets\n", len(user2FAs))
	log.Println("")

	// Confirm before proceeding
	fmt.Print("Proceed with encryption? (yes/no): ")
	var confirm string
	fmt.Scanln(&confirm)
	if confirm != "yes" {
		log.Println("Migration aborted by user")
		return
	}

	log.Println("")
	log.Println("Starting encryption...")
	log.Println("")

	ctx := context.Background()
	successCount := 0
	failCount := 0

	for i, user2FA := range user2FAs {
		log.Printf("[%d/%d] Encrypting secret for user %s...", i+1, len(user2FAs), user2FA.UserID)

		// Encrypt the plaintext secret
		ciphertext, encryptedDEK, metadata, err := kmsService.EncryptSecret(
			ctx,
			user2FA.SecretEncrypted,
			user2FA.UserID,
		)

		if err != nil {
			log.Printf("  ❌ FAILED: %v", err)
			failCount++
			continue
		}

		// Update the record with encrypted data
		now := time.Now()
		user2FA.EncryptedSecretCiphertext = ciphertext
		user2FA.EncryptedSecretDEK = encryptedDEK
		user2FA.EncryptionAlgorithm = metadata.Algorithm
		user2FA.EncryptionKeyVersion = metadata.KeyVersion
		user2FA.EncryptedAt = &now

		// IMPORTANT: Keep plaintext secret for rollback capability
		// Admin can manually delete after verifying encryption works
		// user2FA.SecretEncrypted = "" // Uncomment to delete plaintext

		if err := database.DB.Save(&user2FA).Error; err != nil {
			log.Printf("  ❌ FAILED to save: %v", err)
			failCount++
			continue
		}

		log.Printf("  ✅ SUCCESS (algorithm: %s, version: %d)", metadata.Algorithm, metadata.KeyVersion)
		successCount++
	}

	log.Println("")
	log.Println("=== Migration Complete ===")
	log.Printf("✅ Successfully encrypted: %d\n", successCount)
	log.Printf("❌ Failed: %d\n", failCount)
	log.Println("")

	if failCount > 0 {
		log.Println("⚠️  WARNING: Some secrets failed to encrypt. Review errors above.")
	}

	log.Println("📋 Next steps:")
	log.Println("  1. Verify decryption works by logging in with 2FA")
	log.Println("  2. After 24-48 hours of testing, manually clear plaintext secrets:")
	log.Println("     UPDATE user_2fa SET secret_encrypted = '' WHERE encrypted_secret_ciphertext IS NOT NULL;")
	log.Println("  3. Monitor KMS audit logs for any decryption failures")
}

func loadEnv() error {
	// Simple .env loader (you can use godotenv package in production)
	// For now, assume environment variables are set
	if os.Getenv("DATABASE_URL") == "" {
		return fmt.Errorf("DATABASE_URL not set")
	}

	if os.Getenv("KMS_PROVIDER") == "" {
		log.Println("⚠️  KMS_PROVIDER not set, defaulting to 'mock' for testing")
		os.Setenv("KMS_PROVIDER", "mock")
	}

	return nil
}
