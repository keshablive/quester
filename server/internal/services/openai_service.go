package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2/log"
)

// OpenAIService handles AI-powered document verification using OpenAI API
type OpenAIService struct {
	apiKey     string
	apiURL     string
	model      string
	httpClient *http.Client
	timeout    time.Duration
}

// DocumentVerificationRequest represents a request to verify a document
type DocumentVerificationRequest struct {
	OCRText      string       `json:"ocr_text"`
	DocumentType DocumentType `json:"document_type"`
	PropertyInfo PropertyInfo `json:"property_info,omitempty"`
}

// PropertyInfo contains property details for verification
type PropertyInfo struct {
	Address    string `json:"address"`
	OwnerName  string `json:"owner_name"`
	PropertyID string `json:"property_id,omitempty"`
}

// DocumentVerificationResult represents the AI verification result
type DocumentVerificationResult struct {
	IsValid         bool              `json:"is_valid"`
	ConfidenceScore float64           `json:"confidence_score"` // 0-100
	Reasoning       string            `json:"reasoning"`
	ExtractedData   map[string]string `json:"extracted_data"`
	RedFlags        []string          `json:"red_flags,omitempty"`
	Suggestions     []string          `json:"suggestions,omitempty"`
	ProcessingTime  time.Duration     `json:"processing_time"`
	Model           string            `json:"model"`
	Error           string            `json:"error,omitempty"`
}

// OpenAIRequest represents the request structure for OpenAI API
type OpenAIRequest struct {
	Model       string    `json:"model"`
	Messages    []Message `json:"messages"`
	Temperature float64   `json:"temperature"`
	MaxTokens   int       `json:"max_tokens"`
}

// Message represents a chat message
type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// OpenAIResponse represents the response from OpenAI API
type OpenAIResponse struct {
	ID      string    `json:"id"`
	Object  string    `json:"object"`
	Created int64     `json:"created"`
	Model   string    `json:"model"`
	Choices []Choice  `json:"choices"`
	Usage   Usage     `json:"usage"`
	Error   *APIError `json:"error,omitempty"`
}

// Choice represents a response choice
type Choice struct {
	Index        int     `json:"index"`
	Message      Message `json:"message"`
	FinishReason string  `json:"finish_reason"`
}

// Usage represents token usage
type Usage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

// APIError represents an OpenAI API error
type APIError struct {
	Message string `json:"message"`
	Type    string `json:"type"`
	Code    string `json:"code"`
}

// NewOpenAIService creates a new OpenAI service instance
func NewOpenAIService() *OpenAIService {
	apiKey := os.Getenv("OPENAI_API_KEY")
	if apiKey == "" {
		log.Warn("OPENAI_API_KEY not set, AI verification will not work")
	}

	apiURL := os.Getenv("OPENAI_API_URL")
	if apiURL == "" {
		apiURL = "https://api.openai.com/v1/chat/completions"
	}

	model := os.Getenv("OPENAI_MODEL")
	if model == "" {
		model = "gpt-4o-mini" // Cost-effective model for document verification
	}

	return &OpenAIService{
		apiKey:  apiKey,
		apiURL:  apiURL,
		model:   model,
		timeout: 30 * time.Second,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// VerifyDocument verifies a document using AI analysis
func (s *OpenAIService) VerifyDocument(ctx context.Context, req DocumentVerificationRequest) (*DocumentVerificationResult, error) {
	startTime := time.Now()

	if s.apiKey == "" {
		return &DocumentVerificationResult{
			IsValid:         false,
			ConfidenceScore: 0,
			Error:           "OpenAI API key not configured",
		}, fmt.Errorf("OpenAI API key not configured")
	}

	// Build the prompt
	prompt := s.buildVerificationPrompt(req)

	// Call OpenAI API
	response, err := s.callOpenAI(ctx, prompt)
	if err != nil {
		return &DocumentVerificationResult{
			IsValid:         false,
			ConfidenceScore: 0,
			Error:           fmt.Sprintf("OpenAI API call failed: %v", err),
		}, err
	}

	// Parse the response
	result, err := s.parseVerificationResponse(response)
	if err != nil {
		return &DocumentVerificationResult{
			IsValid:         false,
			ConfidenceScore: 0,
			Error:           fmt.Sprintf("Failed to parse AI response: %v", err),
		}, err
	}

	result.ProcessingTime = time.Since(startTime)
	result.Model = s.model

	return result, nil
}

// buildVerificationPrompt constructs the prompt for document verification
func (s *OpenAIService) buildVerificationPrompt(req DocumentVerificationRequest) string {
	var sb strings.Builder

	sb.WriteString("You are a document verification expert. Analyze the following document text extracted via OCR and determine if it is a valid ")
	sb.WriteString(string(req.DocumentType))
	sb.WriteString(" document.\n\n")

	sb.WriteString("Document Text:\n")
	sb.WriteString(req.OCRText)
	sb.WriteString("\n\n")

	if req.PropertyInfo.Address != "" || req.PropertyInfo.OwnerName != "" {
		sb.WriteString("Property Information:\n")
		if req.PropertyInfo.Address != "" {
			sb.WriteString("Address: " + req.PropertyInfo.Address + "\n")
		}
		if req.PropertyInfo.OwnerName != "" {
			sb.WriteString("Owner Name: " + req.PropertyInfo.OwnerName + "\n")
		}
		sb.WriteString("\n")
	}

	sb.WriteString("Provide your analysis in the following JSON format:\n")
	sb.WriteString("{\n")
	sb.WriteString("  \"is_valid\": boolean,\n")
	sb.WriteString("  \"confidence_score\": number (0-100),\n")
	sb.WriteString("  \"reasoning\": \"explanation of your decision\",\n")
	sb.WriteString("  \"extracted_data\": {\"key\": \"value\", ...},\n")
	sb.WriteString("  \"red_flags\": [\"flag1\", \"flag2\", ...],\n")
	sb.WriteString("  \"suggestions\": [\"suggestion1\", \"suggestion2\", ...]\n")
	sb.WriteString("}\n\n")

	sb.WriteString("Key points to check:\n")
	switch req.DocumentType {
	case DocumentTypeOwnershipProof:
		sb.WriteString("- Is this a property deed, title, or registration document?\n")
		sb.WriteString("- Does it contain property details (address, plot number, etc.)?\n")
		sb.WriteString("- Does it contain owner information?\n")
		sb.WriteString("- Are there official stamps or signatures?\n")
	case DocumentTypeIDProof:
		sb.WriteString("- Is this a government-issued ID (passport, license, Aadhaar, PAN)?\n")
		sb.WriteString("- Does it contain name, photo, and ID number?\n")
		sb.WriteString("- Does the name match the owner name if provided?\n")
	case DocumentTypeTaxReceipt:
		sb.WriteString("- Is this a property tax receipt or payment confirmation?\n")
		sb.WriteString("- Does it contain property identification?\n")
		sb.WriteString("- Does it show payment date and amount?\n")
	case DocumentTypeUtilityBill:
		sb.WriteString("- Is this a utility bill (electricity, water, gas)?\n")
		sb.WriteString("- Does the address match the property address?\n")
		sb.WriteString("- Is the bill recent (within last 3 months)?\n")
	}

	return sb.String()
}

// callOpenAI makes a request to the OpenAI API
func (s *OpenAIService) callOpenAI(ctx context.Context, prompt string) (string, error) {
	reqBody := OpenAIRequest{
		Model: s.model,
		Messages: []Message{
			{
				Role:    "system",
				Content: "You are a document verification expert specialized in property and identity documents. Always respond with valid JSON.",
			},
			{
				Role:    "user",
				Content: prompt,
			},
		},
		Temperature: 0.3, // Lower temperature for more consistent results
		MaxTokens:   1000,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", s.apiURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+s.apiKey)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to call OpenAI API: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("OpenAI API returned status %d: %s", resp.StatusCode, string(body))
	}

	var openAIResp OpenAIResponse
	if err := json.Unmarshal(body, &openAIResp); err != nil {
		return "", fmt.Errorf("failed to unmarshal response: %w", err)
	}

	if openAIResp.Error != nil {
		return "", fmt.Errorf("OpenAI API error: %s (type: %s, code: %s)",
			openAIResp.Error.Message, openAIResp.Error.Type, openAIResp.Error.Code)
	}

	if len(openAIResp.Choices) == 0 {
		return "", fmt.Errorf("no choices in OpenAI response")
	}

	return openAIResp.Choices[0].Message.Content, nil
}

// parseVerificationResponse parses the AI response into a structured result
func (s *OpenAIService) parseVerificationResponse(response string) (*DocumentVerificationResult, error) {
	// Extract JSON from response (AI might include markdown code blocks)
	jsonStr := s.extractJSON(response)

	var result DocumentVerificationResult
	if err := json.Unmarshal([]byte(jsonStr), &result); err != nil {
		return nil, fmt.Errorf("failed to parse AI response: %w, response: %s", err, response)
	}

	// Validate confidence score range
	if result.ConfidenceScore < 0 {
		result.ConfidenceScore = 0
	}
	if result.ConfidenceScore > 100 {
		result.ConfidenceScore = 100
	}

	return &result, nil
}

// extractJSON extracts JSON from a response that might be wrapped in markdown
func (s *OpenAIService) extractJSON(response string) string {
	// Remove markdown code blocks
	response = strings.TrimSpace(response)
	response = strings.TrimPrefix(response, "```json")
	response = strings.TrimPrefix(response, "```")
	response = strings.TrimSuffix(response, "```")
	return strings.TrimSpace(response)
}

// VerifyMultipleDocuments verifies multiple documents concurrently
func (s *OpenAIService) VerifyMultipleDocuments(ctx context.Context, requests []DocumentVerificationRequest) ([]*DocumentVerificationResult, error) {
	results := make([]*DocumentVerificationResult, len(requests))
	errors := make([]error, len(requests))

	// Process documents concurrently (max 3 at a time to avoid rate limits)
	semaphore := make(chan struct{}, 3)

	for i, req := range requests {
		semaphore <- struct{}{} // Acquire
		go func(index int, request DocumentVerificationRequest) {
			defer func() { <-semaphore }() // Release

			result, err := s.VerifyDocument(ctx, request)
			results[index] = result
			errors[index] = err
		}(i, req)
	}

	// Wait for all goroutines
	for i := 0; i < cap(semaphore); i++ {
		semaphore <- struct{}{}
	}

	// Check if any errors occurred
	for _, err := range errors {
		if err != nil {
			return results, err
		}
	}

	return results, nil
}

// CalculateAggregateScore calculates an aggregate verification score from multiple documents
func (s *OpenAIService) CalculateAggregateScore(results []*DocumentVerificationResult) float64 {
	if len(results) == 0 {
		return 0
	}

	totalScore := 0.0
	validCount := 0

	for _, result := range results {
		if result.IsValid {
			totalScore += result.ConfidenceScore
			validCount++
		}
	}

	if validCount == 0 {
		return 0
	}

	// Calculate weighted average (bonus for having multiple valid documents)
	avgScore := totalScore / float64(len(results))

	// Bonus for multiple valid documents (up to 10% boost)
	bonus := float64(validCount-1) * 2.5
	if bonus > 10 {
		bonus = 10
	}

	finalScore := avgScore + bonus
	if finalScore > 100 {
		finalScore = 100
	}

	return finalScore
}

// HealthCheck verifies that the OpenAI API is accessible
func (s *OpenAIService) HealthCheck() error {
	if s.apiKey == "" {
		return fmt.Errorf("OpenAI API key not configured")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Simple test prompt
	_, err := s.callOpenAI(ctx, "Respond with just the word 'OK'")
	if err != nil {
		return fmt.Errorf("OpenAI health check failed: %w", err)
	}

	log.Info("OpenAI service is healthy")
	return nil
}

// GetModelInfo returns information about the current model
func (s *OpenAIService) GetModelInfo() map[string]interface{} {
	return map[string]interface{}{
		"model":   s.model,
		"api_url": s.apiURL,
		"timeout": s.timeout.String(),
	}
}

// ExtractKeyData extracts key data points from OCR text using AI
func (s *OpenAIService) ExtractKeyData(ctx context.Context, ocrText string, fields []string) (map[string]string, error) {
	prompt := fmt.Sprintf(
		"Extract the following fields from this text: %s\n\nText:\n%s\n\nRespond with JSON: {\"field1\": \"value1\", ...}",
		strings.Join(fields, ", "),
		ocrText,
	)

	response, err := s.callOpenAI(ctx, prompt)
	if err != nil {
		return nil, err
	}

	jsonStr := s.extractJSON(response)

	var data map[string]string
	if err := json.Unmarshal([]byte(jsonStr), &data); err != nil {
		return nil, fmt.Errorf("failed to parse extracted data: %w", err)
	}

	return data, nil
}
