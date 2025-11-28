package routes

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/keshablive/quester/internal/controllers"
	"github.com/keshablive/quester/internal/framework/middleware"
	"github.com/keshablive/quester/internal/models"
)

// SetupTransactionRoutes sets up transaction and webhook routes
func SetupTransactionRoutes(router fiber.Router, app *fiber.App, transactionController *controllers.TransactionController) {
	// Transaction routes
	transactions := router.Group("/transactions")
	transactions.Use(middleware.FiberAuthMiddleware())

	// POST /api/v1/transactions - Initiate a new transaction
	transactions.Post("",
		middleware.FiberRateLimitByIP(20, 1*time.Hour),
		transactionController.InitiateTransaction,
	)

	// POST /api/v1/transactions/:id/confirm - Confirm payment
	transactions.Post("/:id/confirm",
		middleware.FiberRateLimitByIP(20, 1*time.Hour),
		transactionController.ConfirmPayment,
	)

	// POST /api/v1/transactions/:id/delivery - Confirm delivery
	transactions.Post("/:id/delivery",
		middleware.FiberRateLimitByIP(20, 1*time.Hour),
		transactionController.ConfirmDelivery,
	)

	// POST /api/v1/transactions/:id/release - Release funds
	transactions.Post("/:id/release",
		middleware.FiberRateLimitByIP(20, 1*time.Hour),
		transactionController.ReleaseFunds,
	)

	// POST /api/v1/transactions/:id/dispute - Open dispute
	transactions.Post("/:id/dispute",
		middleware.FiberRateLimitByIP(10, 1*time.Hour),
		transactionController.OpenDispute,
	)

	// POST /api/v1/transactions/:id/resolve - Resolve dispute (admin only)
	transactions.Post("/:id/resolve",
		middleware.FiberRoleMiddlewareString(string(models.RoleAdmin)),
		middleware.FiberRateLimitByIP(50, 1*time.Hour),
		transactionController.ResolveDispute,
	)

	// GET /api/v1/transactions/:id - Get transaction details
	transactions.Get("/:id",
		middleware.FiberRateLimitByIP(100, 1*time.Minute),
		transactionController.GetTransaction,
	)

	// GET /api/v1/transactions - Get my transactions
	transactions.Get("",
		middleware.FiberRateLimitByIP(100, 1*time.Minute),
		transactionController.GetMyTransactions,
	)

	// GET /api/v1/transactions/disputed - Get disputed transactions (admin only)
	transactions.Get("/disputed",
		middleware.FiberRoleMiddlewareString(string(models.RoleAdmin)),
		middleware.FiberRateLimitByIP(100, 1*time.Minute),
		transactionController.GetDisputedTransactions,
	)

	// Webhook routes (no auth required, verified by signature)
	// Note: Webhooks are typically at /api/webhooks, not /api/v1/webhooks in the original code
	// Original code: webhooks := app.Group("/api/webhooks")
	webhooks := app.Group("/api/webhooks")

	// POST /api/webhooks/razorpay - Razorpay webhook
	webhooks.Post("/razorpay",
		middleware.FiberRateLimitByIP(100, 1*time.Minute),
		transactionController.WebhookRazorpay,
	)

	// POST /api/webhooks/stripe - Stripe webhook
	webhooks.Post("/stripe",
		middleware.FiberRateLimitByIP(100, 1*time.Minute),
		transactionController.WebhookStripe,
	)
}
