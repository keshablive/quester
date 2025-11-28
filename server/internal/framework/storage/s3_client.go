package storage

import (
	"context"
	"fmt"
	"io"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// S3Client wraps AWS S3 SDK v2 for video and document storage
type S3Client struct {
	client *s3.Client
	bucket string
	region string
}

// S3Config holds S3 connection configuration
type S3Config struct {
	Region          string // AWS region (e.g., "us-east-1", "ap-south-1")
	Bucket          string // S3 bucket name
	AccessKeyID     string // AWS access key ID
	SecretAccessKey string // AWS secret access key
	Endpoint        string // Optional: Custom endpoint for S3-compatible storage (MinIO, DigitalOcean Spaces)
}

// NewS3Client creates an S3 client for video/document storage
func NewS3Client(ctx context.Context, cfg S3Config) (*S3Client, error) {
	// Load AWS config
	awsCfg, err := config.LoadDefaultConfig(ctx,
		config.WithRegion(cfg.Region),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			cfg.AccessKeyID,
			cfg.SecretAccessKey,
			"", // session token (empty for IAM users)
		)),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	// Create S3 client
	clientOpts := func(o *s3.Options) {
		if cfg.Endpoint != "" {
			// Custom endpoint for S3-compatible storage (MinIO, DigitalOcean Spaces)
			o.BaseEndpoint = aws.String(cfg.Endpoint)
		}
	}

	client := s3.NewFromConfig(awsCfg, clientOpts)

	return &S3Client{
		client: client,
		bucket: cfg.Bucket,
		region: cfg.Region,
	}, nil
}

// UploadFile uploads a file to S3 with content type and metadata
func (s *S3Client) UploadFile(ctx context.Context, key string, reader io.Reader, contentType string, metadata map[string]string) error {
	_, err := s.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(s.bucket),
		Key:         aws.String(key),
		Body:        reader,
		ContentType: aws.String(contentType),
		Metadata:    metadata,
	})
	if err != nil {
		return fmt.Errorf("failed to upload file %s: %w", key, err)
	}
	return nil
}

// DownloadFile downloads a file from S3
func (s *S3Client) DownloadFile(ctx context.Context, key string) (io.ReadCloser, error) {
	result, err := s.client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to download file %s: %w", key, err)
	}
	return result.Body, nil
}

// DeleteFile deletes a file from S3
func (s *S3Client) DeleteFile(ctx context.Context, key string) error {
	_, err := s.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return fmt.Errorf("failed to delete file %s: %w", key, err)
	}
	return nil
}

// FileExists checks if a file exists in S3
func (s *S3Client) FileExists(ctx context.Context, key string) (bool, error) {
	_, err := s.client.HeadObject(ctx, &s3.HeadObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		// Check if error is "NotFound"
		return false, nil
	}
	return true, nil
}

// GeneratePresignedURL generates a temporary signed URL for direct upload/download
// Useful for: Direct browser uploads, temporary video streaming links
func (s *S3Client) GeneratePresignedURL(ctx context.Context, key string, expiresIn time.Duration) (string, error) {
	presignClient := s3.NewPresignClient(s.client)

	req, err := presignClient.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	}, func(opts *s3.PresignOptions) {
		opts.Expires = expiresIn
	})

	if err != nil {
		return "", fmt.Errorf("failed to generate presigned URL for %s: %w", key, err)
	}

	return req.URL, nil
}

// GeneratePresignedUploadURL generates a presigned URL for direct upload
func (s *S3Client) GeneratePresignedUploadURL(ctx context.Context, key string, contentType string, expiresIn time.Duration) (string, error) {
	presignClient := s3.NewPresignClient(s.client)

	req, err := presignClient.PresignPutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(s.bucket),
		Key:         aws.String(key),
		ContentType: aws.String(contentType),
	}, func(opts *s3.PresignOptions) {
		opts.Expires = expiresIn
	})

	if err != nil {
		return "", fmt.Errorf("failed to generate presigned upload URL for %s: %w", key, err)
	}

	return req.URL, nil
}

// ListFiles lists files with a given prefix (for folder-like operations)
func (s *S3Client) ListFiles(ctx context.Context, prefix string, maxKeys int32) ([]string, error) {
	result, err := s.client.ListObjectsV2(ctx, &s3.ListObjectsV2Input{
		Bucket:  aws.String(s.bucket),
		Prefix:  aws.String(prefix),
		MaxKeys: aws.Int32(maxKeys),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to list files with prefix %s: %w", prefix, err)
	}

	keys := make([]string, 0, len(result.Contents))
	for _, obj := range result.Contents {
		keys = append(keys, *obj.Key)
	}
	return keys, nil
}

// GetFileMetadata retrieves file metadata without downloading the file
func (s *S3Client) GetFileMetadata(ctx context.Context, key string) (map[string]string, error) {
	result, err := s.client.HeadObject(ctx, &s3.HeadObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get metadata for file %s: %w", key, err)
	}
	return result.Metadata, nil
}
