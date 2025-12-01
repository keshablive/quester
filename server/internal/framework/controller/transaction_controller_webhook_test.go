package controller

import (
"crypto/hmac"
"crypto/sha256"
"encoding/hex"
"testing"

"github.com/stretchr/testify/assert"
"github.com/keshablive/quester/internal/framework/config"
"github.com/keshablive/quester/internal/framework/service"
)

func TestWebhookRazorpaySignatureVerification(t *testing.T) {
// Create test config
cfg := &config.Config{
RazorpayWebhookSecret: "test_secret_123",
}

// Create controller
controller := NewTransactionController(&service.TransactionService{}, cfg)

// Test payload
payload := []byte(`{"event":"payment.captured","payload":{"payment":{"entity":{"id":"pay_123"}}}}`)

// Generate valid signature
mac := hmac.New(sha256.New, []byte(cfg.RazorpayWebhookSecret))
mac.Write(payload)
validSignature := hex.EncodeToString(mac.Sum(nil))

// Test 1: Valid signature
assert.True(t, controller.verifyRazorpaySignature(payload, validSignature), "Valid signature should pass")

// Test 2: Invalid signature
assert.False(t, controller.verifyRazorpaySignature(payload, "invalid_signature"), "Invalid signature should fail")

// Test 3: Empty signature
assert.False(t, controller.verifyRazorpaySignature(payload, ""), "Empty signature should fail")

// Test 4: No secret configured
controllerNoSecret := NewTransactionController(&service.TransactionService{}, &config.Config{})
assert.False(t, controllerNoSecret.verifyRazorpaySignature(payload, validSignature), "Should fail if no secret configured")
}

func TestWebhookStripeSignatureVerification(t *testing.T) {
// Create test config
cfg := &config.Config{
StripeWebhookSecret: "whsec_test_secret_456",
}

// Create controller
controller := NewTransactionController(&service.TransactionService{}, cfg)

// Test payload
payload := []byte(`{"type":"payment_intent.succeeded","data":{"object":{"id":"pi_123"}}}`)
timestamp := "1699999999"

// Generate valid signature
signedPayload := timestamp + "." + string(payload)
mac := hmac.New(sha256.New, []byte(cfg.StripeWebhookSecret))
mac.Write([]byte(signedPayload))
validSignature := hex.EncodeToString(mac.Sum(nil))

// Construct Stripe signature header
validHeader := "t=" + timestamp + ",v1=" + validSignature

// Test 1: Valid signature
assert.True(t, controller.verifyStripeSignature(payload, validHeader), "Valid Stripe signature should pass")

// Test 2: Invalid signature
invalidHeader := "t=" + timestamp + ",v1=invalid_signature"
assert.False(t, controller.verifyStripeSignature(payload, invalidHeader), "Invalid signature should fail")

// Test 3: Missing timestamp
noTimestamp := "v1=" + validSignature
assert.False(t, controller.verifyStripeSignature(payload, noTimestamp), "Missing timestamp should fail")

// Test 4: Missing v1 signature
noV1 := "t=" + timestamp
assert.False(t, controller.verifyStripeSignature(payload, noV1), "Missing v1 signature should fail")

// Test 5: Empty header
assert.False(t, controller.verifyStripeSignature(payload, ""), "Empty header should fail")

// Test 6: No secret configured
controllerNoSecret := NewTransactionController(&service.TransactionService{}, &config.Config{})
assert.False(t, controllerNoSecret.verifyStripeSignature(payload, validHeader), "Should fail if no secret configured")
}
