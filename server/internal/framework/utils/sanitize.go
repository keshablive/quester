package utils

import (
	"github.com/microcosm-cc/bluemonday"
)

// HTML sanitization policy - initialized once
var htmlPolicy *bluemonday.Policy

func init() {
	// UGCPolicy allows user-generated content but strips dangerous HTML/JS
	// Allows: basic formatting (bold, italic, links), paragraphs, lists
	// Blocks: scripts, iframes, forms, all event handlers
	htmlPolicy = bluemonday.UGCPolicy()
}

// SanitizeHTML sanitizes HTML content to prevent XSS attacks
// Returns the sanitized string with dangerous HTML/JS removed
func SanitizeHTML(input string) string {
	if htmlPolicy == nil {
		// Fallback if policy not initialized
		htmlPolicy = bluemonday.UGCPolicy()
	}
	return htmlPolicy.Sanitize(input)
}

// SanitizeString is an alias for SanitizeHTML for clarity when sanitizing plain text
func SanitizeString(input string) string {
	return SanitizeHTML(input)
}
