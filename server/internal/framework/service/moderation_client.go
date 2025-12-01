package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

// ModerationClient handles OpenAI Moderation API requests
type ModerationClient struct {
	apiKey     string
	httpClient *http.Client
	baseURL    string
}

// ModerationRequest represents the request payload for OpenAI Moderation API
type ModerationRequest struct {
	Input string `json:"input"`
}

// ModerationResponse represents the response from OpenAI Moderation API
type ModerationResponse struct {
	ID      string             `json:"id"`
	Model   string             `json:"model"`
	Results []ModerationResult `json:"results"`
}

// ModerationResult contains the moderation analysis for one input
type ModerationResult struct {
	Flagged        bool                     `json:"flagged"`
	Categories     ModerationCategories     `json:"categories"`
	CategoryScores ModerationCategoryScores `json:"category_scores"`
}

// ModerationCategories contains boolean flags for each category
type ModerationCategories struct {
	Sexual                bool `json:"sexual"`
	Hate                  bool `json:"hate"`
	Harassment            bool `json:"harassment"`
	SelfHarm              bool `json:"self-harm"`
	SexualMinors          bool `json:"sexual/minors"`
	HateThreatening       bool `json:"hate/threatening"`
	ViolenceGraphic       bool `json:"violence/graphic"`
	SelfHarmIntent        bool `json:"self-harm/intent"`
	SelfHarmInstructions  bool `json:"self-harm/instructions"`
	HarassmentThreatening bool `json:"harassment/threatening"`
	Violence              bool `json:"violence"`
}

// ModerationCategoryScores contains confidence scores (0-1) for each category
type ModerationCategoryScores struct {
	Sexual                float64 `json:"sexual"`
	Hate                  float64 `json:"hate"`
	Harassment            float64 `json:"harassment"`
	SelfHarm              float64 `json:"self-harm"`
	SexualMinors          float64 `json:"sexual/minors"`
	HateThreatening       float64 `json:"hate/threatening"`
	ViolenceGraphic       float64 `json:"violence/graphic"`
	SelfHarmIntent        float64 `json:"self-harm/intent"`
	SelfHarmInstructions  float64 `json:"self-harm/instructions"`
	HarassmentThreatening float64 `json:"harassment/threatening"`
	Violence              float64 `json:"violence"`
}

// NewModerationClient creates a new OpenAI Moderation API client
func NewModerationClient() *ModerationClient {
	apiKey := os.Getenv("OPENAI_API_KEY")
	if apiKey == "" {
		// Log warning but don't fail - allows running without AI moderation in dev
		fmt.Println("WARNING: OPENAI_API_KEY not set. AI moderation will be disabled.")
	}

	return &ModerationClient{
		apiKey:  apiKey,
		baseURL: "https://api.openai.com/v1/moderations",
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// Moderate sends content to OpenAI Moderation API and returns the result
func (mc *ModerationClient) Moderate(ctx context.Context, content string) (*ModerationResult, error) {
	// If no API key, return safe default (auto-approve)
	if mc.apiKey == "" {
		return &ModerationResult{
			Flagged: false,
			CategoryScores: ModerationCategoryScores{
				Sexual:                0.0,
				Hate:                  0.0,
				Harassment:            0.0,
				SelfHarm:              0.0,
				SexualMinors:          0.0,
				HateThreatening:       0.0,
				ViolenceGraphic:       0.0,
				SelfHarmIntent:        0.0,
				SelfHarmInstructions:  0.0,
				HarassmentThreatening: 0.0,
				Violence:              0.0,
			},
		}, nil
	}

	// Prepare request
	reqBody := ModerationRequest{
		Input: content,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", mc.baseURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+mc.apiKey)

	// Send request
	resp, err := mc.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	// Read response
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	// Check for errors
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("OpenAI API error (status %d): %s", resp.StatusCode, string(body))
	}

	// Parse response
	var moderationResp ModerationResponse
	if err := json.Unmarshal(body, &moderationResp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	if len(moderationResp.Results) == 0 {
		return nil, fmt.Errorf("no results returned from OpenAI")
	}

	return &moderationResp.Results[0], nil
}

// GetHighestCategoryScore returns the category with the highest confidence score
func (mr *ModerationResult) GetHighestCategoryScore() (string, float64) {
	scores := map[string]float64{
		"sexual":                 mr.CategoryScores.Sexual,
		"hate":                   mr.CategoryScores.Hate,
		"harassment":             mr.CategoryScores.Harassment,
		"self-harm":              mr.CategoryScores.SelfHarm,
		"sexual/minors":          mr.CategoryScores.SexualMinors,
		"hate/threatening":       mr.CategoryScores.HateThreatening,
		"violence/graphic":       mr.CategoryScores.ViolenceGraphic,
		"self-harm/intent":       mr.CategoryScores.SelfHarmIntent,
		"self-harm/instructions": mr.CategoryScores.SelfHarmInstructions,
		"harassment/threatening": mr.CategoryScores.HarassmentThreatening,
		"violence":               mr.CategoryScores.Violence,
	}

	var highestCategory string
	var highestScore float64

	for category, score := range scores {
		if score > highestScore {
			highestScore = score
			highestCategory = category
		}
	}

	return highestCategory, highestScore
}

// GetConfidencePercentage returns the highest score as a percentage (0-100)
func (mr *ModerationResult) GetConfidencePercentage() float64 {
	_, score := mr.GetHighestCategoryScore()
	return score * 100
}

// GetAllScoresMap returns all category scores as a map for JSON storage
func (mr *ModerationResult) GetAllScoresMap() map[string]float64 {
	return map[string]float64{
		"sexual":                 mr.CategoryScores.Sexual,
		"hate":                   mr.CategoryScores.Hate,
		"harassment":             mr.CategoryScores.Harassment,
		"self-harm":              mr.CategoryScores.SelfHarm,
		"sexual/minors":          mr.CategoryScores.SexualMinors,
		"hate/threatening":       mr.CategoryScores.HateThreatening,
		"violence/graphic":       mr.CategoryScores.ViolenceGraphic,
		"self-harm/intent":       mr.CategoryScores.SelfHarmIntent,
		"self-harm/instructions": mr.CategoryScores.SelfHarmInstructions,
		"harassment/threatening": mr.CategoryScores.HarassmentThreatening,
		"violence":               mr.CategoryScores.Violence,
	}
}

// GetFlaggedCategories returns a list of categories that were flagged
func (mr *ModerationResult) GetFlaggedCategories() []string {
	categories := []string{}

	if mr.Categories.Sexual {
		categories = append(categories, "sexual")
	}
	if mr.Categories.Hate {
		categories = append(categories, "hate")
	}
	if mr.Categories.Harassment {
		categories = append(categories, "harassment")
	}
	if mr.Categories.SelfHarm {
		categories = append(categories, "self-harm")
	}
	if mr.Categories.SexualMinors {
		categories = append(categories, "sexual/minors")
	}
	if mr.Categories.HateThreatening {
		categories = append(categories, "hate/threatening")
	}
	if mr.Categories.ViolenceGraphic {
		categories = append(categories, "violence/graphic")
	}
	if mr.Categories.SelfHarmIntent {
		categories = append(categories, "self-harm/intent")
	}
	if mr.Categories.SelfHarmInstructions {
		categories = append(categories, "self-harm/instructions")
	}
	if mr.Categories.HarassmentThreatening {
		categories = append(categories, "harassment/threatening")
	}
	if mr.Categories.Violence {
		categories = append(categories, "violence")
	}

	return categories
}
