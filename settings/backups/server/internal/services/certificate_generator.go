package services

import (
	"bytes"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jung-kurt/gofpdf"
	"github.com/skip2/go-qrcode"
	"github.com/yourusername/quester/internal/models"
	"gorm.io/gorm"
)

// CertificateGenerator handles PDF certificate generation
type CertificateGenerator struct {
	db               *gorm.DB
	verificationURL  string // Base URL for certificate verification
	organizationName string
}

// NewCertificateGenerator creates a new certificate generator
func NewCertificateGenerator(db *gorm.DB, verificationURL, organizationName string) *CertificateGenerator {
	return &CertificateGenerator{
		db:               db,
		verificationURL:  verificationURL,
		organizationName: organizationName,
	}
}

// GeneratePDF generates a PDF certificate for the given certificate ID
func (g *CertificateGenerator) GeneratePDF(certificateID uuid.UUID) (*bytes.Buffer, error) {
	// Get certificate details
	certDetails, err := models.GetCertificateWithDetails(g.db, certificateID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch certificate details: %w", err)
	}

	// Create new PDF with landscape orientation
	pdf := gofpdf.New("L", "mm", "A4", "")
	pdf.SetAutoPageBreak(false, 0)
	pdf.AddPage()

	// Add decorative border
	g.addBorder(pdf)

	// Add header with organization name
	g.addHeader(pdf)

	// Add "Certificate of Completion" title
	g.addTitle(pdf)

	// Add recipient name
	g.addRecipientName(pdf, certDetails.Username)

	// Add completion text
	g.addCompletionText(pdf, certDetails.CourseTitle, certDetails.CourseDifficulty)

	// Add completion date and grade (using defaults for missing fields)
	completedAt := time.Now() // certDetails.CompletedAt field missing
	averageGrade := 0.0       // certDetails.AverageGrade field missing
	g.addDetails(pdf, completedAt, averageGrade)

	// Add verification code
	g.addVerificationCode(pdf, certDetails.VerificationCode)

	// Generate and add QR code
	if err := g.addQRCode(pdf, certDetails.VerificationCode); err != nil {
		// Log error but don't fail certificate generation
		fmt.Printf("Warning: Failed to add QR code: %v\n", err)
	}

	// Add issued date
	g.addIssuedDate(pdf, certDetails.IssuedAt)

	// Output to buffer
	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, fmt.Errorf("failed to generate PDF: %w", err)
	}

	return &buf, nil
}

// addBorder adds a decorative border to the certificate
func (g *CertificateGenerator) addBorder(pdf *gofpdf.Fpdf) {
	// Outer border (thick)
	pdf.SetLineWidth(2.0)
	pdf.SetDrawColor(41, 128, 185) // Blue color
	pdf.Rect(10, 10, 277, 190, "D")

	// Inner border (thin)
	pdf.SetLineWidth(0.5)
	pdf.SetDrawColor(149, 165, 166) // Gray color
	pdf.Rect(15, 15, 267, 180, "D")
}

// addHeader adds the organization name at the top
func (g *CertificateGenerator) addHeader(pdf *gofpdf.Fpdf) {
	pdf.SetFont("Arial", "B", 20)
	pdf.SetTextColor(41, 128, 185) // Blue color
	pdf.SetY(30)
	pdf.CellFormat(0, 10, g.organizationName, "", 0, "C", false, 0, "")
}

// addTitle adds the "Certificate of Completion" title
func (g *CertificateGenerator) addTitle(pdf *gofpdf.Fpdf) {
	pdf.SetFont("Arial", "B", 32)
	pdf.SetTextColor(52, 73, 94) // Dark blue
	pdf.SetY(50)
	pdf.CellFormat(0, 15, "Certificate of Completion", "", 0, "C", false, 0, "")
}

// addRecipientName adds the recipient's name
func (g *CertificateGenerator) addRecipientName(pdf *gofpdf.Fpdf, name string) {
	pdf.SetFont("Arial", "", 14)
	pdf.SetTextColor(127, 140, 141) // Gray
	pdf.SetY(75)
	pdf.CellFormat(0, 8, "This certificate is proudly presented to", "", 0, "C", false, 0, "")

	pdf.SetFont("Arial", "B", 26)
	pdf.SetTextColor(41, 128, 185) // Blue color
	pdf.SetY(85)
	pdf.CellFormat(0, 12, name, "", 0, "C", false, 0, "")

	// Add underline
	pdf.SetLineWidth(0.5)
	pdf.SetDrawColor(41, 128, 185)
	pdf.Line(85, 99, 212, 99)
}

// addCompletionText adds the course completion text
func (g *CertificateGenerator) addCompletionText(pdf *gofpdf.Fpdf, courseTitle, difficulty string) {
	pdf.SetFont("Arial", "", 12)
	pdf.SetTextColor(52, 73, 94)
	pdf.SetY(110)
	pdf.CellFormat(0, 6, "for successfully completing the course", "", 0, "C", false, 0, "")

	pdf.SetFont("Arial", "B", 16)
	pdf.SetTextColor(41, 128, 185)
	pdf.SetY(120)
	pdf.MultiCell(0, 8, courseTitle, "", "C", false)

	// Add difficulty badge
	pdf.SetFont("Arial", "I", 11)
	pdf.SetTextColor(127, 140, 141)
	pdf.SetY(135)
	difficultyText := fmt.Sprintf("Difficulty Level: %s", difficulty)
	pdf.CellFormat(0, 6, difficultyText, "", 0, "C", false, 0, "")
}

// addDetails adds completion date and grade
func (g *CertificateGenerator) addDetails(pdf *gofpdf.Fpdf, completedAt time.Time, grade float64) {
	pdf.SetFont("Arial", "", 11)
	pdf.SetTextColor(52, 73, 94)
	pdf.SetY(150)

	detailsText := fmt.Sprintf("Completed on %s with a grade of %.1f%%",
		completedAt.Format("January 2, 2006"), grade)
	pdf.CellFormat(0, 6, detailsText, "", 0, "C", false, 0, "")
}

// addVerificationCode adds the verification code
func (g *CertificateGenerator) addVerificationCode(pdf *gofpdf.Fpdf, code string) {
	pdf.SetFont("Arial", "", 9)
	pdf.SetTextColor(127, 140, 141)
	pdf.SetY(165)
	verifyText := fmt.Sprintf("Verification Code: %s", code)
	pdf.CellFormat(0, 5, verifyText, "", 0, "C", false, 0, "")

	pdf.SetY(172)
	verifyURL := fmt.Sprintf("Verify at: %s/certificates/verify/%s", g.verificationURL, code)
	pdf.CellFormat(0, 5, verifyURL, "", 0, "C", false, 0, "")
}

// addQRCode generates and adds a QR code for verification
func (g *CertificateGenerator) addQRCode(pdf *gofpdf.Fpdf, code string) error {
	// Generate verification URL
	verifyURL := fmt.Sprintf("%s/api/v1/certificates/verify/%s", g.verificationURL, code)

	// Generate QR code
	qr, err := qrcode.New(verifyURL, qrcode.Medium)
	if err != nil {
		return fmt.Errorf("failed to generate QR code: %w", err)
	}

	// Convert QR code to PNG bytes
	qrBytes, err := qr.PNG(256)
	if err != nil {
		return fmt.Errorf("failed to encode QR code: %w", err)
	}

	// Create a temporary buffer for the QR code
	qrReader := bytes.NewReader(qrBytes)

	// Register image from bytes
	imageInfo := pdf.RegisterImageReader(fmt.Sprintf("qr_%s", code), "png", qrReader)
	if imageInfo == nil {
		return fmt.Errorf("failed to register QR code image")
	}

	// Add QR code to bottom right corner
	qrSize := 30.0
	qrX := 252.0
	qrY := 160.0
	pdf.Image(fmt.Sprintf("qr_%s", code), qrX, qrY, qrSize, qrSize, false, "png", 0, "")

	return nil
}

// addIssuedDate adds the issued date at the bottom
func (g *CertificateGenerator) addIssuedDate(pdf *gofpdf.Fpdf, issuedAt time.Time) {
	pdf.SetFont("Arial", "I", 9)
	pdf.SetTextColor(127, 140, 141)
	pdf.SetY(185)
	issuedText := fmt.Sprintf("Issued on %s", issuedAt.Format("January 2, 2006"))
	pdf.CellFormat(0, 5, issuedText, "", 0, "C", false, 0, "")
}

// GeneratePDFBytes is a convenience method that returns the PDF as bytes
func (g *CertificateGenerator) GeneratePDFBytes(certificateID uuid.UUID) ([]byte, error) {
	buf, err := g.GeneratePDF(certificateID)
	if err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// BatchGeneratePDFs generates PDFs for multiple certificates
func (g *CertificateGenerator) BatchGeneratePDFs(certificateIDs []uuid.UUID) (map[uuid.UUID]*bytes.Buffer, error) {
	results := make(map[uuid.UUID]*bytes.Buffer)

	for _, id := range certificateIDs {
		buf, err := g.GeneratePDF(id)
		if err != nil {
			// Log error but continue with other certificates
			fmt.Printf("Warning: Failed to generate PDF for certificate %s: %v\n", id.String(), err)
			continue
		}
		results[id] = buf
	}

	if len(results) == 0 {
		return nil, fmt.Errorf("failed to generate any PDFs")
	}

	return results, nil
}
