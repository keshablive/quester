// T541-T546: S3 Storage Service for DVR Segments
import EventEmitter from 'eventemitter3';
import { DVRSegment } from './dvr-service';

export interface S3Config {
  bucket: string;
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  endpoint?: string;              // Custom S3-compatible endpoint
  cloudfrontDomain?: string;      // CloudFront distribution domain
  prefix?: string;                // Key prefix (folder path)
  acl?: string;                   // Access control (private, public-read, etc.)
  storageClass?: string;          // STANDARD, INTELLIGENT_TIERING, etc.
  lifecycleDays?: number;         // Auto-delete after N days (default: 2 days)
  maxRetries?: number;            // Upload retry attempts
  retryDelay?: number;            // Delay between retries (ms)
  chunkSize?: number;             // Multipart upload chunk size
  enableMultipart?: boolean;      // Enable multipart uploads
}

export interface UploadProgress {
  segmentId: string;
  uploaded: number;               // Bytes uploaded
  total: number;                  // Total bytes
  percentage: number;
  speed: number;                  // Bytes per second
}

export interface UploadResult {
  segmentId: string;
  s3Key: string;
  s3Url: string;
  cloudfrontUrl?: string;
  etag: string;
  size: number;
  uploadTime: number;             // milliseconds
}

export interface UploadError {
  segmentId: string;
  error: Error;
  retries: number;
}

export enum S3Event {
  UPLOAD_STARTED = 'uploadStarted',
  UPLOAD_PROGRESS = 'uploadProgress',
  UPLOAD_COMPLETE = 'uploadComplete',
  UPLOAD_FAILED = 'uploadFailed',
  UPLOAD_RETRY = 'uploadRetry',
  LIFECYCLE_APPLIED = 'lifecycleApplied',
}

const DEFAULT_CONFIG: Partial<S3Config> = {
  prefix: 'dvr-segments',
  acl: 'private',
  storageClass: 'INTELLIGENT_TIERING',
  lifecycleDays: 2,
  maxRetries: 3,
  retryDelay: 1000,
  chunkSize: 5 * 1024 * 1024,     // 5 MB chunks
  enableMultipart: true,
};

export class S3StorageService extends EventEmitter {
  private config: S3Config;
  private uploadQueue: Map<string, AbortController> = new Map();
  private uploadStats: Map<string, { startTime: number; uploaded: number }> = new Map();

  constructor(config: S3Config) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.validateConfig();
  }

  /**
   * Validate configuration
   */
  private validateConfig(): void {
    if (!this.config.bucket) {
      throw new Error('S3 bucket is required');
    }
    if (!this.config.region) {
      throw new Error('S3 region is required');
    }
    if (this.config.lifecycleDays !== undefined && this.config.lifecycleDays < 1) {
      throw new Error('Lifecycle days must be at least 1');
    }
  }

  /**
   * Upload segment to S3
   */
  async uploadSegment(segment: DVRSegment, data: Blob | ArrayBuffer): Promise<UploadResult> {
    const startTime = Date.now();
    const abortController = new AbortController();
    
    this.uploadQueue.set(segment.id, abortController);
    this.uploadStats.set(segment.id, { startTime, uploaded: 0 });

    this.emit(S3Event.UPLOAD_STARTED, { segmentId: segment.id });

    try {
      // Generate S3 key
      const s3Key = this.generateS3Key(segment);

      // Determine upload method
      const size = data instanceof Blob ? data.size : data.byteLength;
      const useMultipart = this.config.enableMultipart && 
                          size > (this.config.chunkSize || 5 * 1024 * 1024);

      let result: UploadResult;
      if (useMultipart) {
        result = await this.multipartUpload(segment, s3Key, data, abortController);
      } else {
        result = await this.simpleUpload(segment, s3Key, data, abortController);
      }

      const uploadTime = Date.now() - startTime;
      result.uploadTime = uploadTime;

      this.emit(S3Event.UPLOAD_COMPLETE, result);
      return result;

    } catch (error) {
      const uploadError: UploadError = {
        segmentId: segment.id,
        error: error as Error,
        retries: 0,
      };
      this.emit(S3Event.UPLOAD_FAILED, uploadError);
      throw error;

    } finally {
      this.uploadQueue.delete(segment.id);
      this.uploadStats.delete(segment.id);
    }
  }

  /**
   * Simple (single-part) upload
   */
  private async simpleUpload(
    segment: DVRSegment,
    s3Key: string,
    data: Blob | ArrayBuffer,
    abortController: AbortController
  ): Promise<UploadResult> {
    const url = this.getUploadUrl(s3Key);
    const headers = this.getUploadHeaders(segment);

    // Convert data to blob if needed
    const blob = data instanceof Blob ? data : new Blob([data]);

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: blob,
      signal: abortController.signal,
    });

    if (!response.ok) {
      throw new Error(`S3 upload failed: ${response.status} ${response.statusText}`);
    }

    const etag = response.headers.get('ETag') || '';
    const s3Url = this.getS3Url(s3Key);
    const cloudfrontUrl = this.getCloudfrontUrl(s3Key);

    return {
      segmentId: segment.id,
      s3Key,
      s3Url,
      cloudfrontUrl,
      etag,
      size: segment.size,
      uploadTime: 0, // Set by caller
    };
  }

  /**
   * Multipart upload for large segments
   */
  private async multipartUpload(
    segment: DVRSegment,
    s3Key: string,
    data: Blob | ArrayBuffer,
    abortController: AbortController
  ): Promise<UploadResult> {
    const size = data instanceof Blob ? data.size : data.byteLength;
    const chunkSize = this.config.chunkSize || 5 * 1024 * 1024;
    const numParts = Math.ceil(size / chunkSize);

    // Initiate multipart upload
    const uploadId = await this.initiateMultipartUpload(s3Key);

    try {
      const parts: Array<{ PartNumber: number; ETag: string }> = [];

      // Upload parts
      for (let partNumber = 1; partNumber <= numParts; partNumber++) {
        const start = (partNumber - 1) * chunkSize;
        const end = Math.min(start + chunkSize, size);

        const chunk = data instanceof Blob 
          ? data.slice(start, end)
          : data.slice(start, end);

        const etag = await this.uploadPart(
          s3Key,
          uploadId,
          partNumber,
          chunk,
          abortController
        );

        parts.push({ PartNumber: partNumber, ETag: etag });

        // Report progress
        const stats = this.uploadStats.get(segment.id);
        if (stats) {
          stats.uploaded = end;
          const elapsed = (Date.now() - stats.startTime) / 1000;
          const speed = end / elapsed;
          const percentage = (end / size) * 100;

          this.emit(S3Event.UPLOAD_PROGRESS, {
            segmentId: segment.id,
            uploaded: end,
            total: size,
            percentage,
            speed,
          });
        }
      }

      // Complete multipart upload
      await this.completeMultipartUpload(s3Key, uploadId, parts);

      const s3Url = this.getS3Url(s3Key);
      const cloudfrontUrl = this.getCloudfrontUrl(s3Key);

      return {
        segmentId: segment.id,
        s3Key,
        s3Url,
        cloudfrontUrl,
        etag: parts[0].ETag, // Use first part's ETag
        size: segment.size,
        uploadTime: 0, // Set by caller
      };

    } catch (error) {
      // Abort multipart upload on error
      await this.abortMultipartUpload(s3Key, uploadId);
      throw error;
    }
  }

  /**
   * Upload with retry logic
   */
  async uploadSegmentWithRetry(segment: DVRSegment, data: Blob | ArrayBuffer): Promise<UploadResult> {
    const maxRetries = this.config.maxRetries || 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          this.emit(S3Event.UPLOAD_RETRY, {
            segmentId: segment.id,
            attempt,
            maxRetries,
          });

          // Exponential backoff
          const delay = (this.config.retryDelay || 1000) * Math.pow(2, attempt - 1);
          await this.sleep(delay);
        }

        return await this.uploadSegment(segment, data);

      } catch (error) {
        lastError = error as Error;
        console.warn(`Upload attempt ${attempt + 1} failed:`, error);
      }
    }

    throw new Error(`Upload failed after ${maxRetries + 1} attempts: ${lastError?.message}`);
  }

  /**
   * Cancel ongoing upload
   */
  cancelUpload(segmentId: string): boolean {
    const controller = this.uploadQueue.get(segmentId);
    if (controller) {
      controller.abort();
      this.uploadQueue.delete(segmentId);
      this.uploadStats.delete(segmentId);
      return true;
    }
    return false;
  }

  /**
   * Delete segment from S3
   */
  async deleteSegment(s3Key: string): Promise<void> {
    const url = this.getUploadUrl(s3Key);
    const headers = this.getUploadHeaders();

    const response = await fetch(url, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`S3 delete failed: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Delete multiple segments
   */
  async deleteSegments(s3Keys: string[]): Promise<{ deleted: string[]; failed: string[] }> {
    const deleted: string[] = [];
    const failed: string[] = [];

    await Promise.allSettled(
      s3Keys.map(async (key) => {
        try {
          await this.deleteSegment(key);
          deleted.push(key);
        } catch (error) {
          failed.push(key);
        }
      })
    );

    return { deleted, failed };
  }

  /**
   * Apply lifecycle policy (delete old segments)
   */
  async applyLifecyclePolicy(segments: Array<{ s3Key: string; timestamp: number }>): Promise<void> {
    const lifecycleDays = this.config.lifecycleDays || 2;
    const cutoffTime = Date.now() / 1000 - lifecycleDays * 24 * 60 * 60;

    const toDelete = segments
      .filter(seg => seg.timestamp < cutoffTime)
      .map(seg => seg.s3Key);

    if (toDelete.length > 0) {
      const result = await this.deleteSegments(toDelete);
      this.emit(S3Event.LIFECYCLE_APPLIED, {
        deleted: result.deleted.length,
        failed: result.failed.length,
        cutoffTime,
      });
    }
  }

  /**
   * Generate S3 key for segment
   */
  private generateS3Key(segment: DVRSegment): string {
    const prefix = this.config.prefix || 'dvr-segments';
    const date = new Date(segment.timestamp * 1000);
    const datePath = `${date.getUTCFullYear()}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${String(date.getUTCDate()).padStart(2, '0')}`;
    const filename = `${segment.id}-${segment.quality}.ts`;
    
    return `${prefix}/${datePath}/${filename}`;
  }

  /**
   * Get S3 upload URL
   */
  private getUploadUrl(s3Key: string): string {
    if (this.config.endpoint) {
      return `${this.config.endpoint}/${this.config.bucket}/${s3Key}`;
    }
    return `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${s3Key}`;
  }

  /**
   * Get S3 object URL
   */
  private getS3Url(s3Key: string): string {
    return `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${s3Key}`;
  }

  /**
   * Get CloudFront URL
   */
  private getCloudfrontUrl(s3Key: string): string | undefined {
    if (!this.config.cloudfrontDomain) {
      return undefined;
    }
    return `https://${this.config.cloudfrontDomain}/${s3Key}`;
  }

  /**
   * Get upload headers
   */
  private getUploadHeaders(segment?: DVRSegment): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'video/mp2t', // MPEG-TS format
    };

    if (this.config.acl) {
      headers['x-amz-acl'] = this.config.acl;
    }

    if (this.config.storageClass) {
      headers['x-amz-storage-class'] = this.config.storageClass;
    }

    if (segment) {
      headers['x-amz-meta-segment-id'] = segment.id;
      headers['x-amz-meta-quality'] = segment.quality;
      headers['x-amz-meta-timestamp'] = String(segment.timestamp);
      headers['x-amz-meta-duration'] = String(segment.duration);
    }

    return headers;
  }

  /**
   * Initiate multipart upload (stub - requires AWS SDK)
   */
  private async initiateMultipartUpload(_s3Key: string): Promise<string> {
    // In production, this would use AWS SDK
    // For now, return a mock upload ID
    return `mock-upload-${Date.now()}`;
  }

  /**
   * Upload part (stub - requires AWS SDK)
   */
  private async uploadPart(
    _s3Key: string,
    _uploadId: string,
    partNumber: number,
    _data: Blob | ArrayBuffer,
    _abortController: AbortController
  ): Promise<string> {
    // In production, this would use AWS SDK
    // For now, return a mock ETag
    return `"mock-etag-${partNumber}"`;
  }

  /**
   * Complete multipart upload (stub - requires AWS SDK)
   */
  private async completeMultipartUpload(
    _s3Key: string,
    _uploadId: string,
    _parts: Array<{ PartNumber: number; ETag: string }>
  ): Promise<void> {
    // In production, this would use AWS SDK
    // For now, just return
  }

  /**
   * Abort multipart upload (stub - requires AWS SDK)
   */
  private async abortMultipartUpload(_s3Key: string, _uploadId: string): Promise<void> {
    // In production, this would use AWS SDK
    // For now, just return
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get upload queue status
   */
  getUploadStatus(): Array<{ segmentId: string; progress: number }> {
    return Array.from(this.uploadStats.entries()).map(([segmentId, stats]) => ({
      segmentId,
      progress: stats.uploaded,
    }));
  }

  /**
   * Check if segment is uploading
   */
  isUploading(segmentId: string): boolean {
    return this.uploadQueue.has(segmentId);
  }

  /**
   * Get configuration
   */
  getConfig(): S3Config {
    return { ...this.config };
  }

  /**
   * Destroy service
   */
  destroy(): void {
    // Cancel all ongoing uploads
    for (const [_segmentId, controller] of this.uploadQueue) {
      controller.abort();
    }
    this.uploadQueue.clear();
    this.uploadStats.clear();
    this.removeAllListeners();
  }
}
