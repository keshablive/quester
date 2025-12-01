# Sentry Integration

This document describes the Sentry error tracking and performance monitoring integration in the Quester platform.

## Overview

Sentry provides:
- **Error Tracking**: Automatic capture of exceptions, panics, and errors
- **Performance Monitoring**: Transaction tracing for slow requests and database queries
- **User Context**: Associate errors with specific users and tenants
- **Release Tracking**: Track errors by deployment version
- **Breadcrumbs**: Debug trail for understanding error context

## Configuration

### Environment Variables

```bash
# Sentry DSN (required - get from Sentry.io project settings)
SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0

# Environment name (development, staging, production)
SENTRY_ENVIRONMENT=production

# Release version for tracking
SENTRY_RELEASE=quester@1.0.0

# Sample rate for performance monitoring (0.0 to 1.0)
# 0.1 = 10% of transactions, 1.0 = 100% of transactions
SENTRY_TRACES_SAMPLE_RATE=0.1

# Enable debug logging (development only)
SENTRY_DEBUG=false
```

### Getting Started

1. **Create Sentry Project**:
   - Sign up at [sentry.io](https://sentry.io)
   - Create a new project (select "Go" as platform)
   - Copy the DSN from project settings

2. **Configure Environment**:
   ```bash
   # Add to .env or environment
   export SENTRY_DSN="your-dsn-here"
   export SENTRY_ENVIRONMENT="production"
   export SENTRY_RELEASE="quester@$(git rev-parse --short HEAD)"
   ```

3. **Start Application**:
   ```bash
   make run
   # or
   go run cmd/server/main.go
   ```

## Features

### Automatic Error Capture

All errors are automatically captured by the Sentry middleware:

```go
// Example: Errors in HTTP handlers are automatically captured
func MyHandler(c *fiber.Ctx) error {
    // This error will be sent to Sentry
    return fmt.Errorf("something went wrong")
}
```

### Manual Error Capture

```go
import sentryPkg "github.com/yourusername/quester/internal/framework/sentry"

// Simple error capture
sentryPkg.CaptureError(err)

// Error with additional context
sentryPkg.CaptureErrorWithContext(err, map[string]interface{}{
    "user_action": "checkout",
    "order_id": orderID,
    "amount": 99.99,
})

// Capture messages (non-errors)
sentryPkg.CaptureMessage("User completed onboarding")
```

### User Context

Associate errors with specific users:

```go
// Set user context (typically in auth middleware)
sentryPkg.SetUser(userID, username, email)

// All subsequent errors will include this user information
```

### Tags and Extra Data

```go
// Add tags for filtering in Sentry UI
sentryPkg.SetTag("payment_processor", "stripe")
sentryPkg.SetTag("subscription_tier", "premium")

// Add extra context data
sentryPkg.SetExtra("cart_items", 5)
sentryPkg.SetExtra("discount_code", "SAVE20")
```

### Performance Monitoring

Track slow operations:

```go
// Start a transaction
span := sentryPkg.StartTransaction("process_order", "function")
defer sentryPkg.FinishTransaction(span)

// Process order...
time.Sleep(2 * time.Second)

// Transaction duration will be sent to Sentry
```

### Slow Request Tracking

Automatically track requests exceeding a threshold:

```go
// In middleware or handler
start := time.Now()
defer func() {
    duration := time.Since(start)
    sentryPkg.CaptureSlowRequest(c, duration, 500*time.Millisecond)
}()
```

### Breadcrumbs

Add debugging breadcrumbs:

```go
import "github.com/getsentry/sentry-go"

sentryPkg.AddBreadcrumb("database", "Query executed", sentry.LevelInfo, map[string]interface{}{
    "query": "SELECT * FROM users",
    "duration_ms": 150,
})
```

## Middleware

The Sentry middleware is automatically registered in `internal/app/app.go`:

1. **RecoverMiddleware**: Captures panics and sends them to Sentry
2. **Middleware**: Captures errors and tracks request performance

Both middlewares automatically:
- Extract user_id and tenant_id from Fiber locals
- Include request details (method, path, headers, query params)
- Track response status codes
- Measure request latency

## Filtering Sensitive Data

Sensitive data is automatically filtered:

- **Authorization headers**: Removed from all events
- **Cookies**: Removed from all events
- **Password fields**: Should be excluded at application level

To add custom filtering, modify the `BeforeSend` hook in `internal/framework/sentry/sentry.go`.

## Release Tracking

Track errors by deployment version:

```bash
# Set release version during deployment
export SENTRY_RELEASE="quester@$(git rev-parse --short HEAD)"

# Or use semantic versioning
export SENTRY_RELEASE="quester@1.2.3"
```

In Sentry UI, you can:
- See which releases have the most errors
- Track error trends across releases
- Set up release-based alerts

## Alerting

Configure alerts in Sentry UI:

1. **High Error Rate**: Alert when error rate > 1% of requests
2. **New Errors**: Alert on first occurrence of new error types
3. **Regression**: Alert when resolved errors reoccur
4. **Performance Degradation**: Alert when p95 latency > 500ms

Example alert rule:
```yaml
# Sentry Alert Rule
name: "High Error Rate - Production"
conditions:
  - error_count > 100 in 1 hour
  - environment = "production"
actions:
  - send_email: ["devops@example.com"]
  - send_slack: "#alerts"
```

## Dashboard Integration

### Grafana Dashboard

Add Sentry metrics to Grafana:

```promql
# Error rate from Sentry (via webhook or API)
sentry_error_rate{environment="production"}

# P95 latency from Sentry performance monitoring
histogram_quantile(0.95, sentry_transaction_duration_bucket)
```

### Sentry Dashboard

Key metrics to monitor:
- **Error Rate**: Errors per minute/hour
- **Unique Errors**: Number of distinct error types
- **Affected Users**: Users impacted by errors
- **Crash-Free Rate**: % of sessions without crashes
- **Performance**: p50, p75, p95, p99 latencies

## Troubleshooting

### No Events in Sentry

1. **Check DSN**: Verify `SENTRY_DSN` is set correctly
2. **Check Network**: Ensure firewall allows outbound HTTPS to `*.sentry.io`
3. **Enable Debug**: Set `SENTRY_DEBUG=true` to see SDK logs
4. **Check Initialization**: Look for "✓ Sentry initialized" in startup logs

### Too Many Events

1. **Reduce Sample Rate**: Lower `SENTRY_TRACES_SAMPLE_RATE` (e.g., 0.01 = 1%)
2. **Filter Errors**: Add custom filtering in `BeforeSend` hook
3. **Ignore Common Errors**: Configure `IgnoreErrors` in SDK options

### Missing User Context

1. **Check Middleware Order**: Sentry middleware must come after auth middleware
2. **Verify Locals**: Ensure `user_id` is set in `c.Locals("user_id")`
3. **Manual SetUser**: Call `sentryPkg.SetUser()` explicitly if needed

## Best Practices

### DO:
✅ Use descriptive error messages  
✅ Add context with tags and extras  
✅ Set user context when available  
✅ Use breadcrumbs for debugging  
✅ Monitor Sentry quota usage  
✅ Set up alert rules for critical errors  
✅ Review errors regularly and fix root causes  

### DON'T:
❌ Log passwords or API keys  
❌ Send PII without consent  
❌ Ignore Sentry quota limits  
❌ Set sample rate to 100% in production  
❌ Capture expected errors (use custom logging instead)  
❌ Leave debug mode enabled in production  

## Cost Optimization

Sentry charges based on:
- Number of errors captured
- Number of performance transactions
- Data retention period

To optimize costs:

1. **Sample Transactions**: Set `SENTRY_TRACES_SAMPLE_RATE=0.1` (10%)
2. **Filter Noise**: Ignore benign errors (404s, rate limits)
3. **Spike Protection**: Enable spike protection in Sentry settings
4. **Archive Old Data**: Set retention to 30-90 days
5. **Use Environments**: Disable Sentry in development/staging

Estimated costs (as of 2025):
- **Developer Plan**: Free (5K errors/month, 10K transactions/month)
- **Team Plan**: $26/month (50K errors, 100K transactions)
- **Business Plan**: $80/month (250K errors, 500K transactions)
- **Enterprise**: Custom pricing (millions of events)

## Resources

- [Sentry Go SDK Documentation](https://docs.sentry.io/platforms/go/)
- [Sentry Performance Monitoring](https://docs.sentry.io/product/performance/)
- [Sentry Error Tracking](https://docs.sentry.io/product/issues/)
- [Sentry Releases](https://docs.sentry.io/product/releases/)
- [Sentry Alerting](https://docs.sentry.io/product/alerts/)

## Support

For Sentry integration issues:
- **Documentation**: `docs/deployment.md` (Monitoring section)
- **Configuration**: `internal/framework/sentry/sentry.go`
- **Environment**: `.env` or deployment environment variables

---

Copyright (c) 2025 Quester Platform. All rights reserved.
