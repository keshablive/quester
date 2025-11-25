package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2/log"
)

// OCRService handles document text extraction using Tesseract OCR
type OCRService struct {
	tesseractPath string
	tempDir       string
	timeout       time.Duration
}

// OCRResult represents the result of OCR processing
type OCRResult struct {
	Text       string  `json:"text"`
	Confidence float64 `json:"confidence"`
	Language   string  `json:"language"`
	PageCount  int     `json:"page_count"`
	Error      string  `json:"error,omitempty"`
}

// DocumentType represents the type of document being processed
type DocumentType string

const (
	DocumentTypeOwnershipProof DocumentType = "ownership_proof"
	DocumentTypeIDProof        DocumentType = "id_proof"
	DocumentTypeTaxReceipt     DocumentType = "tax_receipt"
	DocumentTypeUtilityBill    DocumentType = "utility_bill"
	DocumentTypeOther          DocumentType = "other"
)

// NewOCRService creates a new OCR service instance
func NewOCRService() *OCRService {
	tesseractPath := os.Getenv("TESSERACT_PATH")
	if tesseractPath == "" {
		tesseractPath = "tesseract" // Use system PATH
	}

	tempDir := os.Getenv("OCR_TEMP_DIR")
	if tempDir == "" {
		tempDir = filepath.Join(os.TempDir(), "quester-ocr")
	}

	// Create temp directory if it doesn't exist
	if err := os.MkdirAll(tempDir, 0755); err != nil {
		log.Warnf("Failed to create OCR temp directory: %v", err)
	}

	return &OCRService{
		tesseractPath: tesseractPath,
		tempDir:       tempDir,
		timeout:       30 * time.Second,
	}
}

// ExtractText extracts text from an image or PDF file using Tesseract OCR
func (s *OCRService) ExtractText(ctx context.Context, fileURL string, language string) (*OCRResult, error) {
	if language == "" {
		language = "eng" // Default to English
	}

	// Download the file
	filePath, err := s.downloadFile(ctx, fileURL)
	if err != nil {
		return nil, fmt.Errorf("failed to download file: %w", err)
	}
	defer os.Remove(filePath)

	// Create output file path
	outputBase := filepath.Join(s.tempDir, fmt.Sprintf("ocr_%d", time.Now().UnixNano()))
	outputFile := outputBase + ".txt"
	defer os.Remove(outputFile)

	// Run Tesseract OCR
	ctx, cancel := context.WithTimeout(ctx, s.timeout)
	defer cancel()

	// tesseract input.png output -l eng --psm 3
	cmd := exec.CommandContext(ctx, s.tesseractPath, filePath, outputBase, "-l", language, "--psm", "3")

	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return &OCRResult{
			Error: fmt.Sprintf("tesseract error: %v, stderr: %s", err, stderr.String()),
		}, fmt.Errorf("tesseract execution failed: %w", err)
	}

	// Read the output text
	textBytes, err := os.ReadFile(outputFile)
	if err != nil {
		return nil, fmt.Errorf("failed to read OCR output: %w", err)
	}

	text := strings.TrimSpace(string(textBytes))

	// Calculate confidence (basic heuristic based on text quality)
	confidence := s.calculateConfidence(text)

	return &OCRResult{
		Text:       text,
		Confidence: confidence,
		Language:   language,
		PageCount:  1,
	}, nil
}

// ExtractTextFromMultiplePages extracts text from a multi-page document
func (s *OCRService) ExtractTextFromMultiplePages(ctx context.Context, fileURL string, language string) (*OCRResult, error) {
	// For now, treat as single page. In production, use pdf2image + loop
	return s.ExtractText(ctx, fileURL, language)
}

// ValidateDocument validates a document and extracts key information
func (s *OCRService) ValidateDocument(ctx context.Context, fileURL string, docType DocumentType) (*OCRResult, error) {
	// Extract text
	result, err := s.ExtractText(ctx, fileURL, "eng")
	if err != nil {
		return result, err
	}

	// Validate based on document type
	if !s.validateDocumentContent(result.Text, docType) {
		result.Confidence *= 0.7 // Reduce confidence if validation fails
		result.Error = fmt.Sprintf("document content does not match expected type: %s", docType)
	}

	return result, nil
}

// validateDocumentContent checks if the extracted text matches the document type
func (s *OCRService) validateDocumentContent(text string, docType DocumentType) bool {
	text = strings.ToLower(text)

	switch docType {
	case DocumentTypeOwnershipProof:
		keywords := []string{"deed", "title", "ownership", "property", "land", "registration"}
		return s.containsAnyKeyword(text, keywords)

	case DocumentTypeIDProof:
		keywords := []string{"passport", "license", "card", "identity", "aadhaar", "pan"}
		return s.containsAnyKeyword(text, keywords)

	case DocumentTypeTaxReceipt:
		keywords := []string{"tax", "receipt", "payment", "municipal", "property tax"}
		return s.containsAnyKeyword(text, keywords)

	case DocumentTypeUtilityBill:
		keywords := []string{"electricity", "water", "gas", "utility", "bill", "invoice"}
		return s.containsAnyKeyword(text, keywords)

	default:
		return true // No validation for "other" types
	}
}

// containsAnyKeyword checks if text contains any of the keywords
func (s *OCRService) containsAnyKeyword(text string, keywords []string) bool {
	for _, keyword := range keywords {
		if strings.Contains(text, keyword) {
			return true
		}
	}
	return false
}

// calculateConfidence calculates OCR confidence based on text quality heuristics
func (s *OCRService) calculateConfidence(text string) float64 {
	if text == "" {
		return 0.0
	}

	score := 100.0

	// Penalize very short text (likely OCR failure)
	if len(text) < 10 {
		score -= 50
	} else if len(text) < 50 {
		score -= 20
	}

	// Penalize high ratio of special characters (OCR noise)
	specialCharCount := 0
	for _, c := range text {
		if !((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == ' ' || c == '\n') {
			specialCharCount++
		}
	}
	specialCharRatio := float64(specialCharCount) / float64(len(text))
	if specialCharRatio > 0.3 {
		score -= 30
	} else if specialCharRatio > 0.2 {
		score -= 15
	}

	// Penalize lack of spaces (likely OCR failure)
	spaceCount := strings.Count(text, " ")
	wordCount := spaceCount + 1
	avgWordLength := float64(len(text)) / float64(wordCount)
	if avgWordLength > 15 {
		score -= 25
	}

	if score < 0 {
		score = 0
	}
	if score > 100 {
		score = 100
	}

	return score
}

// downloadFile downloads a file from URL to temp directory
func (s *OCRService) downloadFile(ctx context.Context, fileURL string) (string, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", fileURL, nil)
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to download file: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("download failed with status: %d", resp.StatusCode)
	}

	// Create temp file
	ext := filepath.Ext(fileURL)
	if ext == "" {
		ext = ".jpg" // Default extension
	}
	tempFile := filepath.Join(s.tempDir, fmt.Sprintf("download_%d%s", time.Now().UnixNano(), ext))

	file, err := os.Create(tempFile)
	if err != nil {
		return "", fmt.Errorf("failed to create temp file: %w", err)
	}
	defer file.Close()

	_, err = io.Copy(file, resp.Body)
	if err != nil {
		os.Remove(tempFile)
		return "", fmt.Errorf("failed to write file: %w", err)
	}

	return tempFile, nil
}

// CleanupTempFiles removes old temporary files (should be called periodically)
func (s *OCRService) CleanupTempFiles(maxAge time.Duration) error {
	entries, err := os.ReadDir(s.tempDir)
	if err != nil {
		return err
	}

	cutoff := time.Now().Add(-maxAge)

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		info, err := entry.Info()
		if err != nil {
			continue
		}

		if info.ModTime().Before(cutoff) {
			path := filepath.Join(s.tempDir, entry.Name())
			if err := os.Remove(path); err != nil {
				log.Warnf("Failed to remove temp file %s: %v", path, err)
			}
		}
	}

	return nil
}

// BatchExtractText extracts text from multiple documents concurrently
func (s *OCRService) BatchExtractText(ctx context.Context, fileURLs []string, language string) ([]*OCRResult, error) {
	results := make([]*OCRResult, len(fileURLs))
	errors := make([]error, len(fileURLs))

	// Process files concurrently (max 5 at a time)
	semaphore := make(chan struct{}, 5)

	for i, fileURL := range fileURLs {
		semaphore <- struct{}{} // Acquire
		go func(index int, url string) {
			defer func() { <-semaphore }() // Release

			result, err := s.ExtractText(ctx, url, language)
			results[index] = result
			errors[index] = err
		}(i, fileURL)
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

// GetOCRStats returns statistics about OCR processing
type OCRStats struct {
	TotalProcessed    int     `json:"total_processed"`
	AverageConfidence float64 `json:"average_confidence"`
	SuccessRate       float64 `json:"success_rate"`
}

// HealthCheck verifies that Tesseract is installed and working
func (s *OCRService) HealthCheck() error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, s.tesseractPath, "--version")
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("tesseract health check failed: %w, output: %s", err, string(output))
	}

	log.Infof("Tesseract OCR is healthy: %s", string(output))
	return nil
}

// SupportedLanguages returns list of supported languages
func (s *OCRService) SupportedLanguages() []string {
	return []string{
		"eng", // English
		"hin", // Hindi
		"tam", // Tamil
		"tel", // Telugu
		"mar", // Marathi
		"ben", // Bengali
		"guj", // Gujarati
		"kan", // Kannada
		"mal", // Malayalam
		"pan", // Punjabi
	}
}

// SerializeResult converts OCR result to JSON
func (s *OCRService) SerializeResult(result *OCRResult) (string, error) {
	data, err := json.Marshal(result)
	if err != nil {
		return "", err
	}
	return string(data), nil
}
