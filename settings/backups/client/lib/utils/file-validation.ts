/**
 * File Validation Utilities
 * Phase 8, T137: File upload error handling with size/type validation
 *
 * Provides validation for file uploads with specific error messages
 * and corrective actions per FR-037.
 *
 * Features:
 * - File size validation with readable error messages
 * - File type validation against allowed MIME types
 * - Human-readable file size formatting
 * - Specific error messages with corrective actions
 */

export interface FileValidationError {
  type: 'size' | 'type' | 'network' | 'unknown';
  message: string;
  details?: string;
  correctiveAction?: string;
}

export interface FileValidationOptions {
  /** Maximum file size in bytes (default: 10MB) */
  maxSizeBytes?: number;
  /** Allowed MIME types (default: common image types) */
  allowedTypes?: string[];
  /** Custom error messages */
  customErrors?: {
    size?: string;
    type?: string;
  };
}

// Default configuration
const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB
const DEFAULT_ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
];

/**
 * Format bytes to human-readable size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot === -1 ? '' : filename.substring(lastDot + 1).toLowerCase();
}

/**
 * Get MIME type from file extension (approximation)
 */
export function getMimeTypeFromExtension(extension: string): string {
  const mimeMap: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
  };

  return mimeMap[extension.toLowerCase()] || 'application/octet-stream';
}

/**
 * Validate file size
 */
export function validateFileSize(
  fileSizeBytes: number,
  maxSizeBytes: number = DEFAULT_MAX_SIZE
): FileValidationError | null {
  if (fileSizeBytes > maxSizeBytes) {
    const userSize = formatFileSize(fileSizeBytes);
    const maxSize = formatFileSize(maxSizeBytes);

    return {
      type: 'size',
      message: `File too large. Maximum size: ${maxSize}. Your file: ${userSize}.`,
      details: `The file you selected (${userSize}) exceeds the maximum allowed size of ${maxSize}.`,
      correctiveAction:
        'Try compressing the file first or selecting a smaller file. You can use online compression tools or reduce image resolution.',
    };
  }

  return null;
}

/**
 * Validate file type
 */
export function validateFileType(
  mimeType: string,
  allowedTypes: string[] = DEFAULT_ALLOWED_TYPES
): FileValidationError | null {
  if (!allowedTypes.includes(mimeType)) {
    const allowedExtensions = allowedTypes
      .map((type) => {
        const parts = type.split('/');
        return parts[1] ? `.${parts[1]}` : type;
      })
      .join(', ');

    return {
      type: 'type',
      message: `Invalid file type. Allowed types: ${allowedExtensions}`,
      details: `The file type "${mimeType}" is not supported.`,
      correctiveAction: `Please select a file with one of these types: ${allowedExtensions}`,
    };
  }

  return null;
}

/**
 * Validate file comprehensively
 */
export function validateFile(
  file: {
    size: number;
    type?: string;
    name?: string;
  },
  options: FileValidationOptions = {}
): FileValidationError | null {
  const maxSizeBytes = options.maxSizeBytes || DEFAULT_MAX_SIZE;
  const allowedTypes = options.allowedTypes || DEFAULT_ALLOWED_TYPES;

  // Validate size
  const sizeError = validateFileSize(file.size, maxSizeBytes);
  if (sizeError) {
    return options.customErrors?.size
      ? { ...sizeError, message: options.customErrors.size }
      : sizeError;
  }

  // Validate type
  let mimeType = file.type;
  if (!mimeType && file.name) {
    const extension = getFileExtension(file.name);
    mimeType = getMimeTypeFromExtension(extension);
  }

  if (mimeType) {
    const typeError = validateFileType(mimeType, allowedTypes);
    if (typeError) {
      return options.customErrors?.type
        ? { ...typeError, message: options.customErrors.type }
        : typeError;
    }
  }

  return null;
}

/**
 * Create network timeout error
 */
export function createNetworkTimeoutError(timeoutSeconds: number = 30): FileValidationError {
  return {
    type: 'network',
    message: `Upload timed out after ${timeoutSeconds} seconds`,
    details: 'The file upload took too long and was cancelled.',
    correctiveAction:
      'Check your internet connection and try again. For large files, try uploading over Wi-Fi instead of cellular data.',
  };
}

/**
 * Create generic upload error
 */
export function createUploadError(error: Error): FileValidationError {
  return {
    type: 'unknown',
    message: 'File upload failed',
    details: error.message || 'An unexpected error occurred during upload.',
    correctiveAction: 'Please try again. If the problem persists, contact support.',
  };
}

/**
 * Example usage in a component:
 *
 * ```typescript
 * const handleFileSelect = (file: DocumentPickerResult) => {
 *   const validationError = validateFile(
 *     { size: file.size, type: file.type, name: file.name },
 *     {
 *       maxSizeBytes: 10 * 1024 * 1024, // 10MB
 *       allowedTypes: ['image/jpeg', 'image/png'],
 *     }
 *   );
 *
 *   if (validationError) {
 *     setFileError(validationError.message);
 *     return;
 *   }
 *
 *   // Proceed with upload
 *   uploadFile(file);
 * };
 * ```
 */
