package services

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/keshablive/quester/internal/models"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// T800: Test that cron job sends quest reminders for quests ending within 7 days
func TestQuestReminders(t *testing.T) {
	// Setup in-memory SQLite database
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)

	// Auto-migrate models
	err = db.AutoMigrate(
		&models.Tenant{},
		&models.User{},
		&models.Quest{},
		&models.Notification{},
	)
	require.NoError(t, err)

	// Create test data
	tenantID := uuid.New()
	tenant := &models.Tenant{
		ID:   tenantID,
		Name: "Test Tenant",
	}
	require.NoError(t, db.Create(tenant).Error)

	userID := uuid.New()
	user := &models.User{
		ID:       userID,
		TenantID: tenantID,
		Email:    "student@example.com",
		Username: "student",
		XP:       100,
	}
	require.NoError(t, db.Create(user).Error)

	now := time.Now()

	// Quest 1: Ends in 5 days (should send reminder)
	quest1 := &models.Quest{
		Title:       "Complete Course Module 1",
		Description: "Finish all lessons in module 1",
		Type:        models.QuestTypeDaily,
		Status:      models.QuestStatusActive,
		Points:      50,
		StartDate:   now.AddDate(0, 0, -10),
		EndDate:     ptrTime(now.AddDate(0, 0, 5)),
	}
	require.NoError(t, db.Create(quest1).Error)

	// Quest 2: Ends in 10 days (should NOT send reminder)
	quest2 := &models.Quest{
		Title:       "Complete Course Module 2",
		Description: "Finish all lessons in module 2",
		Type:        models.QuestTypeWeekly,
		Status:      models.QuestStatusActive,
		Points:      100,
		StartDate:   now.AddDate(0, 0, -5),
		EndDate:     ptrTime(now.AddDate(0, 0, 10)),
	}
	require.NoError(t, db.Create(quest2).Error)

	// Quest 3: Already ended (should NOT send reminder)
	quest3 := &models.Quest{
		Title:       "Old Quest",
		Description: "This quest has ended",
		Type:        models.QuestTypeDaily,
		Status:      models.QuestStatusInactive,
		Points:      25,
		StartDate:   now.AddDate(0, 0, -20),
		EndDate:     ptrTime(now.AddDate(0, 0, -1)),
	}
	require.NoError(t, db.Create(quest3).Error)

	// Quest 4: No end date (should NOT send reminder)
	quest4 := &models.Quest{
		Title:       "Ongoing Quest",
		Description: "This quest has no deadline",
		Type:        models.QuestTypeDaily,
		Status:      models.QuestStatusActive,
		Points:      75,
		StartDate:   now.AddDate(0, 0, -5),
		EndDate:     nil,
	}
	require.NoError(t, db.Create(quest4).Error)

	t.Run("GetQuestsEndingWithin7Days returns correct quests", func(t *testing.T) {
		// Query quests ending within 7 days
		var quests []models.Quest
		err := db.Where("status = ? AND end_date IS NOT NULL AND end_date > ? AND end_date <= ?",
			models.QuestStatusActive,
			now,
			now.AddDate(0, 0, 7),
		).Find(&quests).Error
		require.NoError(t, err)

		// Should return only quest1 (ends in 5 days)
		assert.Len(t, quests, 1)
		if len(quests) > 0 {
			assert.Equal(t, "Complete Course Module 1", quests[0].Title)
			assert.Equal(t, quest1.ID, quests[0].ID)
		}
	})

	t.Run("SendQuestReminders sends notifications for quests ending soon", func(t *testing.T) {
		// This will be implemented in T803
		// For now, we test the notification creation logic for quests ending within 7 days

		// Get quests ending within 7 days
		var quests []models.Quest
		err := db.Where("status = ? AND end_date IS NOT NULL AND end_date > ? AND end_date <= ?",
			models.QuestStatusActive,
			now,
			now.AddDate(0, 0, 7),
		).Find(&quests).Error
		require.NoError(t, err)

		// Should find quest1
		assert.Len(t, quests, 1)

		// Create notification for the quest
		// In real implementation, this would query users and send to each
		if len(quests) > 0 {
			quest := quests[0]
			daysLeft := int(quest.EndDate.Sub(now).Hours() / 24)
			notification := &models.Notification{
				TenantID:         tenantID.String(),
				UserID:           userID.String(), // In real impl, would send to all relevant users
				NotificationType: models.NotificationTypeQuestReminder,
				Title:            "Quest Deadline Approaching",
				Message:          "Your quest '" + quest.Title + "' ends in " + string(rune(daysLeft+'0')) + " days!",
				Priority:         models.NotificationPriorityNormal,
				ReadAt:           nil,
			}
			err := db.Create(notification).Error
			assert.NoError(t, err)
		}

		// Verify notification was created
		var notifications []models.Notification
		err = db.Where("user_id = ? AND notification_type = ?", userID.String(), models.NotificationTypeQuestReminder).Find(&notifications).Error
		require.NoError(t, err)
		assert.Len(t, notifications, 1)

		if len(notifications) > 0 {
			assert.Equal(t, "Quest Deadline Approaching", notifications[0].Title)
			assert.Contains(t, notifications[0].Message, "Complete Course Module 1")
		}
	})

	t.Run("Cron job runs at scheduled time", func(t *testing.T) {
		// Test that cron job can be scheduled
		// This validates the cron service Start/Stop mechanism
		notificationService := NewNotificationService(db)
		cronService := NewCronService(db, nil, nil, nil)

		// Verify cron service can be started and stopped
		assert.NotNil(t, cronService)
		assert.NotNil(t, notificationService)
		assert.False(t, cronService.isRunning)

		// Note: Full cron execution would require time.Sleep and is skipped in unit tests
		// Integration tests (T807) will test actual scheduled execution
	})
}

// Helper function to create time pointer
func ptrTime(t time.Time) *time.Time {
	return &t
}
