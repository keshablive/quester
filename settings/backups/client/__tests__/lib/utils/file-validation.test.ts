/**
 * File Validation Tests
 * Phase 8, T137: Test file upload validation logic
 */

import {
  validateFile,
  validateFileSize,
  validateFileType,
  formatFileSize,
  getFileExtension,
  getMimeTypeFromExtension,
  createNetworkTimeoutError,
  createUploadError,
} from '@/lib/utils/file-validation';

describe('File Validation Utilities', () => {
  describe('formatFileSize', () => {
    it('formats bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(10485760)).toBe('10 MB');
      expect(formatFileSize(1073741824)).toBe('1 GB');
    });

    it('rounds to 2 decimal places', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(1572864)).toBe('1.5 MB');
    });
  });

  describe('getFileExtension', () => {
    it('extracts file extension correctly', () => {
      expect(getFileExtension('photo.jpg')).toBe('jpg');
      expect(getFileExtension('document.pdf')).toBe('pdf');
      expect(getFileExtension('archive.tar.gz')).toBe('gz');
    });

    it('handles files without extension', () => {
      expect(getFileExtension('README')).toBe('');
    });

    it('converts to lowercase', () => {
      expect(getFileExtension('Photo.JPG')).toBe('jpg');
    });
  });

  describe('getMimeTypeFromExtension', () => {
    it('returns correct MIME types for common extensions', () => {
      expect(getMimeTypeFromExtension('jpg')).toBe('image/jpeg');
      expect(getMimeTypeFromExtension('png')).toBe('image/png');
      expect(getMimeTypeFromExtension('pdf')).toBe('application/pdf');
    });

    it('handles uppercase extensions', () => {
      expect(getMimeTypeFromExtension('JPG')).toBe('image/jpeg');
    });

    it('returns default for unknown extensions', () => {
      expect(getMimeTypeFromExtension('xyz')).toBe('application/octet-stream');
    });
  });

  describe('validateFileSize', () => {
    const maxSize = 10 * 1024 * 1024; // 10MB

    it('passes validation for files within size limit', () => {
      const result = validateFileSize(5 * 1024 * 1024, maxSize);
      expect(result).toBeNull();
    });

    it('fails validation for oversized files', () => {
      const result = validateFileSize(15 * 1024 * 1024, maxSize);
      expect(result).not.toBeNull();
      expect(result?.type).toBe('size');
      expect(result?.message).toContain('File too large');
      expect(result?.message).toContain('15 MB');
      expect(result?.message).toContain('10 MB');
    });

    it('provides corrective action for size errors', () => {
      const result = validateFileSize(15 * 1024 * 1024, maxSize);
      expect(result?.correctiveAction).toContain('compress');
    });

    it('uses default max size if not provided', () => {
      const result = validateFileSize(11 * 1024 * 1024); // Over default 10MB
      expect(result).not.toBeNull();
      expect(result?.type).toBe('size');
    });
  });

  describe('validateFileType', () => {
    const allowedTypes = ['image/jpeg', 'image/png'];

    it('passes validation for allowed file types', () => {
      const result = validateFileType('image/jpeg', allowedTypes);
      expect(result).toBeNull();
    });

    it('fails validation for disallowed file types', () => {
      const result = validateFileType('application/pdf', allowedTypes);
      expect(result).not.toBeNull();
      expect(result?.type).toBe('type');
      expect(result?.message).toContain('Invalid file type');
    });

    it('lists allowed extensions in error message', () => {
      const result = validateFileType('video/mp4', allowedTypes);
      expect(result?.message).toContain('jpeg');
      expect(result?.message).toContain('png');
    });

    it('provides corrective action for type errors', () => {
      const result = validateFileType('application/pdf', allowedTypes);
      expect(result?.correctiveAction).toContain('select a file');
    });

    it('uses default allowed types if not provided', () => {
      const result = validateFileType('application/pdf');
      expect(result).not.toBeNull();
      expect(result?.type).toBe('type');
    });
  });

  describe('validateFile', () => {
    const validFile = {
      name: 'photo.jpg',
      size: 5 * 1024 * 1024, // 5MB
      type: 'image/jpeg',
    };

    it('passes validation for valid files', () => {
      const result = validateFile(validFile);
      expect(result).toBeNull();
    });

    it('fails validation for oversized files', () => {
      const result = validateFile({
        ...validFile,
        size: 15 * 1024 * 1024,
      });
      expect(result).not.toBeNull();
      expect(result?.type).toBe('size');
    });

    it('fails validation for invalid file types', () => {
      const result = validateFile({
        ...validFile,
        type: 'application/pdf',
      });
      expect(result).not.toBeNull();
      expect(result?.type).toBe('type');
    });

    it('infers MIME type from filename if type is missing', () => {
      const result = validateFile({
        name: 'photo.jpg',
        size: 5 * 1024 * 1024,
      });
      expect(result).toBeNull(); // Should pass with inferred type
    });

    it('respects custom validation options', () => {
      const result = validateFile(validFile, {
        maxSizeBytes: 1 * 1024 * 1024, // 1MB
        allowedTypes: ['image/png'],
      });
      expect(result).not.toBeNull(); // Should fail both size and type
    });

    it('uses custom error messages if provided', () => {
      const customMessage = 'Custom size error';
      const result = validateFile(
        { ...validFile, size: 15 * 1024 * 1024 },
        {
          customErrors: { size: customMessage },
        }
      );
      expect(result?.message).toBe(customMessage);
    });
  });

  describe('createNetworkTimeoutError', () => {
    it('creates timeout error with default timeout', () => {
      const error = createNetworkTimeoutError();
      expect(error.type).toBe('network');
      expect(error.message).toContain('30 seconds');
    });

    it('creates timeout error with custom timeout', () => {
      const error = createNetworkTimeoutError(60);
      expect(error.message).toContain('60 seconds');
    });

    it('provides corrective action for timeout errors', () => {
      const error = createNetworkTimeoutError();
      expect(error.correctiveAction).toContain('internet connection');
    });
  });

  describe('createUploadError', () => {
    it('creates generic upload error from Error object', () => {
      const originalError = new Error('Network request failed');
      const error = createUploadError(originalError);
      expect(error.type).toBe('unknown');
      expect(error.message).toBe('File upload failed');
      expect(error.details).toBe('Network request failed');
    });

    it('provides corrective action for upload errors', () => {
      const error = createUploadError(new Error('Test error'));
      expect(error.correctiveAction).toContain('try again');
    });

    it('handles Error objects without message', () => {
      const error = createUploadError(new Error());
      expect(error.details).toContain('unexpected error');
    });
  });

  describe('Integration: Complete upload flow', () => {
    it('validates multiple files correctly', () => {
      const files = [
        { name: 'small.jpg', size: 1024 * 1024, type: 'image/jpeg' }, // Valid
        { name: 'large.jpg', size: 15 * 1024 * 1024, type: 'image/jpeg' }, // Too large
        { name: 'doc.pdf', size: 1024 * 1024, type: 'application/pdf' }, // Wrong type
      ];

      const results = files.map((file) => validateFile(file));

      expect(results[0]).toBeNull(); // Valid file passes
      expect(results[1]?.type).toBe('size'); // Large file fails size check
      expect(results[2]?.type).toBe('type'); // PDF fails type check
    });

    it('provides actionable error messages for common scenarios', () => {
      // Scenario 1: File too large
      const largeFile = validateFile({
        name: 'vacation.jpg',
        size: 15 * 1024 * 1024,
        type: 'image/jpeg',
      });
      expect(largeFile?.message).toContain('15 MB');
      expect(largeFile?.correctiveAction).toContain('compress');

      // Scenario 2: Wrong file type
      const pdfFile = validateFile({
        name: 'resume.pdf',
        size: 2 * 1024 * 1024,
        type: 'application/pdf',
      });
      expect(pdfFile?.message).toContain('Invalid file type');
      expect(pdfFile?.correctiveAction).toContain('select a file');
    });
  });

  describe('FR-037 Compliance: Specific error messages', () => {
    it('provides size limit exceeded error with user file size', () => {
      const error = validateFileSize(15 * 1024 * 1024, 10 * 1024 * 1024);
      expect(error?.message).toMatch(/15 MB/);
      expect(error?.message).toMatch(/10 MB/);
    });

    it('provides invalid file type error with allowed types', () => {
      const error = validateFileType('application/pdf', ['image/jpeg', 'image/png']);
      expect(error?.message).toContain('jpeg');
      expect(error?.message).toContain('png');
    });

    it('provides network timeout error with specific timeout', () => {
      const error = createNetworkTimeoutError(30);
      expect(error.message).toContain('30 seconds');
    });

    it('includes corrective actions for all error types', () => {
      const sizeError = validateFileSize(15 * 1024 * 1024, 10 * 1024 * 1024);
      const typeError = validateFileType('application/pdf', ['image/jpeg']);
      const networkError = createNetworkTimeoutError();

      expect(sizeError?.correctiveAction).toBeTruthy();
      expect(typeError?.correctiveAction).toBeTruthy();
      expect(networkError.correctiveAction).toBeTruthy();

      // Check that actions are specific and helpful
      expect(sizeError?.correctiveAction).toContain('compress');
      expect(typeError?.correctiveAction).toContain('select');
      expect(networkError.correctiveAction).toContain('connection');
    });
  });
});
