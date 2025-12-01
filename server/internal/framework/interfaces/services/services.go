// Package services provides service layer interface definitions for the Quester platform.
//
// These interfaces define the contracts that application-layer services must implement.
// Framework code should depend only on these interfaces, never on concrete implementations.
//
// Interface files in this package:
//   - auth_service.go: Authentication (login, register, logout, token management)
//   - user_service.go: User management (CRUD, profiles, preferences)
//   - payment_service.go: Payment processing (transactions, refunds, methods)
//   - course_service.go: Course management (CRUD, enrollments, progress)
//   - quest_service.go: Quest/gamification (quests, assignments, completion)
//   - tenant_service.go: Multi-tenancy (tenant CRUD, settings)
//   - token_service.go: JWT token operations (generate, validate, revoke)
//   - 2fa_service.go: Two-factor authentication (setup, verify, backup codes)
//   - badge_service.go: Badge/awards (CRUD, awarding, eligibility)
//   - achievement_service.go: Achievements (tracking, progress, completion)
//   - notification_service.go: Notifications (CRUD, delivery, preferences)
//   - marketplace_service.go: Marketplace (listings, purchases, sellers)
//   - streaming_service.go: Video streaming (streams, viewers, DVR)
//   - partner_service.go: Partner/affiliate (referrals, commissions, payouts)
//   - report_service.go: Reporting (generation, scheduling, export)
//
// Usage Example:
//
//	type MyController struct {
//	    authService services.AuthServiceInterface
//	    userService services.UserServiceInterface
//	}
//
//	func NewMyController(auth services.AuthServiceInterface, user services.UserServiceInterface) *MyController {
//	    return &MyController{authService: auth, userService: user}
//	}
package services

// Re-export all service interfaces for convenient imports.
// Applications can import the entire services package:
//
//	import "github.com/keshablive/quester/internal/framework/interfaces/services"
//
// And then use interfaces like:
//
//	var auth services.AuthServiceInterface
//	var user services.UserServiceInterface

// Service interface type aliases for discoverability.
// These are provided for IDE autocompletion and documentation.
// The actual interfaces are defined in their respective files.
// Note: Aliases use "Svc" suffix to avoid conflicts with DTO types.

type (
	// AuthSvc represents AuthServiceInterface for authentication operations.
	AuthSvc = AuthServiceInterface

	// UserSvc represents UserServiceInterface for user management.
	UserSvc = UserServiceInterface

	// PaymentSvc represents PaymentServiceInterface for payment operations.
	PaymentSvc = PaymentServiceInterface

	// CourseSvc represents CourseServiceInterface for course management.
	CourseSvc = CourseServiceInterface

	// QuestSvc represents QuestServiceInterface for quest/gamification.
	QuestSvc = QuestServiceInterface

	// TenantSvc represents TenantServiceInterface for multi-tenancy.
	TenantSvc = TenantServiceInterface

	// TokenSvc represents TokenServiceInterface for JWT operations.
	TokenSvc = TokenServiceInterface

	// TwoFactorSvc represents TwoFactorServiceInterface for 2FA.
	TwoFactorSvc = TwoFactorServiceInterface

	// BadgeSvc represents BadgeServiceInterface for badge/awards.
	BadgeSvc = BadgeServiceInterface

	// AchievementSvc represents AchievementServiceInterface for achievements.
	AchievementSvc = AchievementServiceInterface

	// NotificationSvc represents NotificationServiceInterface for notifications.
	NotificationSvc = NotificationServiceInterface

	// MarketplaceSvc represents MarketplaceServiceInterface for marketplace.
	MarketplaceSvc = MarketplaceServiceInterface

	// StreamingSvc represents StreamingServiceInterface for video streaming.
	StreamingSvc = StreamingServiceInterface

	// PartnerSvc represents PartnerServiceInterface for partners/affiliates.
	PartnerSvc = PartnerServiceInterface

	// ReportSvc represents ReportServiceInterface for reporting.
	ReportSvc = ReportServiceInterface
)
