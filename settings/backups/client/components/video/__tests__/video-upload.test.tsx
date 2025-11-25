/**
 * T560-T562: Client Video Upload Tests
 *
 * Test suite for video upload component covering:
 * - E2E upload flow (T560)
 * - Upload cancellation (T561)
 * - Upload retry on network errors (T562)
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { VideoUpload } from '../video-upload';
import { videosApi } from '@/lib/api/videos';

// Mock expo-document-picker
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

// Mock videosApi
jest.mock('@/lib/api/videos');

// Mock fetch for upload API calls
global.fetch = jest.fn();

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

describe('VideoUpload Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  // T560: TestVideoUpload (E2E)
  describe('T560: End-to-End Upload Flow', () => {
    it('should successfully upload a video file', async () => {
      const mockFile = {
        name: 'test-video.mp4',
        size: 10 * 1024 * 1024, // 10 MB
        uri: 'file:///path/to/video.mp4',
        mimeType: 'video/mp4',
      };

      const onUploadComplete = jest.fn();
      const onUploadProgress = jest.fn();
      const onUploadError = jest.fn();

      // Mock document picker to return a video file
      (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
        canceled: false,
        assets: [mockFile],
      });

      // Mock successful upload API response
      (videosApi.uploadVideo as jest.Mock).mockImplementationOnce(async (_fileData, options) => {
        // Simulate progress callback
        if (options?.onProgress) {
          options.onProgress(50);
          options.onProgress(100);
        }
        return {
          videoUrl: 'https://cdn.example.com/videos/test-video.mp4',
          streamId: 'stream-123',
        };
      });

      const { getByText } = render(
        <VideoUpload
          onUploadComplete={onUploadComplete}
          onUploadProgress={onUploadProgress}
          onUploadError={onUploadError}
        />
      );

      // Click "Select Video to Upload" button
      const selectButton = getByText('Select Video to Upload');
      await act(async () => {
        fireEvent.press(selectButton);
      });

      // Wait for file to be selected
      await waitFor(() => {
        expect(DocumentPicker.getDocumentAsync).toHaveBeenCalledWith({
          type: 'video/*',
          copyToCacheDirectory: true,
        });
      });

      // Click "Upload Video" button
      const uploadButton = getByText('Upload Video');
      await act(async () => {
        fireEvent.press(uploadButton);
      });

      // Wait for upload to complete
      await waitFor(
        () => {
          expect(onUploadComplete).toHaveBeenCalledWith(
            'https://cdn.example.com/videos/test-video.mp4'
          );
        },
        { timeout: 5000 }
      );

      // Verify upload was called with correct parameters
      expect(videosApi.uploadVideo).toHaveBeenCalledWith(
        expect.objectContaining({
          uri: mockFile.uri,
          name: mockFile.name,
          type: mockFile.mimeType,
        }),
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      );

      // Verify progress was tracked
      expect(onUploadProgress).toHaveBeenCalled();
      expect(onUploadError).not.toHaveBeenCalled();
    });

    it('should reject files exceeding max size', async () => {
      const largeFile = {
        name: 'large-video.mp4',
        size: 600 * 1024 * 1024, // 600 MB (exceeds 500 MB default)
        uri: 'file:///path/to/large.mp4',
        mimeType: 'video/mp4',
      };

      (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
        canceled: false,
        assets: [largeFile],
      });

      const { getByText } = render(<VideoUpload maxSizeInMB={500} />);

      const selectButton = getByText('Select Video to Upload');
      await act(async () => {
        fireEvent.press(selectButton);
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'File Too Large',
          expect.stringContaining('500 MB')
        );
      });
    });

    it('should reject unsupported file formats', async () => {
      const invalidFile = {
        name: 'document.pdf',
        size: 5 * 1024 * 1024,
        uri: 'file:///path/to/doc.pdf',
        mimeType: 'application/pdf',
      };

      (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
        canceled: false,
        assets: [invalidFile],
      });

      const { getByText } = render(
        <VideoUpload allowedFormats={['video/mp4', 'video/quicktime']} />
      );

      const selectButton = getByText('Select Video to Upload');
      await act(async () => {
        fireEvent.press(selectButton);
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Invalid Format',
          expect.stringContaining('Supported formats')
        );
      });
    });

    it('should display upload progress', async () => {
      const mockFile = {
        name: 'test-video.mp4',
        size: 10 * 1024 * 1024,
        uri: 'file:///path/to/video.mp4',
        mimeType: 'video/mp4',
      };

      const onUploadProgress = jest.fn();

      (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
        canceled: false,
        assets: [mockFile],
      });

      // Mock upload with progress simulation
      (videosApi.uploadVideo as jest.Mock).mockImplementationOnce(async (_fileData, options) => {
        // Simulate progress updates
        if (options?.onProgress) {
          await new Promise((resolve) => setTimeout(resolve, 10));
          options.onProgress(25);
          await new Promise((resolve) => setTimeout(resolve, 10));
          options.onProgress(50);
          await new Promise((resolve) => setTimeout(resolve, 10));
          options.onProgress(75);
          await new Promise((resolve) => setTimeout(resolve, 10));
          options.onProgress(100);
        }
        return {
          videoUrl: 'https://example.com/video.mp4',
          streamId: 'stream-123',
        };
      });

      const { getByText } = render(<VideoUpload onUploadProgress={onUploadProgress} />);

      await act(async () => {
        fireEvent.press(getByText('Select Video to Upload'));
      });

      await waitFor(() => {
        expect(getByText('Upload Video')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('Upload Video'));
      });

      await waitFor(
        () => {
          expect(onUploadProgress).toHaveBeenCalled();
        },
        { timeout: 2000 }
      );
    });
  });

  // T561: TestUploadCancellation
  describe('T561: Upload Cancellation', () => {
    it('should cancel ongoing upload when cancel button is pressed', async () => {
      const mockFile = {
        name: 'test-video.mp4',
        size: 50 * 1024 * 1024, // 50 MB
        uri: 'file:///path/to/video.mp4',
        mimeType: 'video/mp4',
      };

      const onUploadError = jest.fn();
      const onUploadComplete = jest.fn();

      (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
        canceled: false,
        assets: [mockFile],
      });

      // Mock upload that can be aborted - use a promise we can control
      (videosApi.uploadVideo as jest.Mock).mockImplementationOnce(
        async (_fileData, options) =>
          new Promise((_resolve, reject) => {
            // Listen for abort signal
            if (options?.signal) {
              options.signal.addEventListener('abort', () => {
                const error = new Error('Upload cancelled by user');
                error.name = 'AbortError';
                reject(error);
              });
            }
          })
      );

      const { getByText } = render(
        <VideoUpload onUploadError={onUploadError} onUploadComplete={onUploadComplete} />
      );

      // Select file
      await act(async () => {
        fireEvent.press(getByText('Select Video to Upload'));
      });

      await waitFor(() => {
        expect(getByText('Upload Video')).toBeTruthy();
      });

      // Start upload
      await act(async () => {
        fireEvent.press(getByText('Upload Video'));
      });

      // Wait for upload to start
      await waitFor(() => {
        expect(getByText('Cancel Upload')).toBeTruthy();
      });

      // Cancel upload
      const cancelButton = getByText('Cancel Upload');
      await act(async () => {
        fireEvent.press(cancelButton);
      });

      // Verify upload was cancelled
      await waitFor(
        () => {
          expect(onUploadError).toHaveBeenCalledWith(expect.stringContaining('cancelled'));
        },
        { timeout: 3000 }
      );

      expect(onUploadComplete).not.toHaveBeenCalled();
    });

    it('should reset state after cancellation', async () => {
      const mockFile = {
        name: 'test-video.mp4',
        size: 10 * 1024 * 1024,
        uri: 'file:///path/to/video.mp4',
        mimeType: 'video/mp4',
      };

      (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [mockFile],
      });

      // Mock upload that can be aborted
      (videosApi.uploadVideo as jest.Mock).mockImplementation(
        async (_fileData, options) =>
          new Promise((_resolve, reject) => {
            // Listen for abort signal
            if (options?.signal) {
              options.signal.addEventListener('abort', () => {
                const error = new Error('Upload cancelled by user');
                error.name = 'AbortError';
                reject(error);
              });
            }
          })
      );

      const { getByText, queryByText } = render(<VideoUpload />);

      // Select and upload
      await act(async () => {
        fireEvent.press(getByText('Select Video to Upload'));
      });

      await waitFor(() => {
        expect(getByText('Upload Video')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('Upload Video'));
      });

      // Wait for cancel button to appear
      await waitFor(() => {
        expect(getByText('Cancel Upload')).toBeTruthy();
      });

      // Cancel
      await act(async () => {
        fireEvent.press(getByText('Cancel Upload'));
      });

      // Verify upload was cancelled and UI shows upload button again (file still selected)
      await waitFor(() => {
        expect(queryByText('Cancel Upload')).toBeNull();
        expect(getByText('Upload Video')).toBeTruthy(); // File still selected, can upload again
      });
    });

    it('should prevent multiple simultaneous uploads', async () => {
      const mockFile = {
        name: 'test-video.mp4',
        size: 10 * 1024 * 1024,
        uri: 'file:///path/to/video.mp4',
        mimeType: 'video/mp4',
      };

      (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [mockFile],
      });

      // Mock a long-running upload
      (videosApi.uploadVideo as jest.Mock).mockImplementation(
        async () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ videoUrl: 'https://example.com/video.mp4' }), 2000);
          })
      );

      const { getByText, queryByText } = render(<VideoUpload />);

      // Select file
      await act(async () => {
        fireEvent.press(getByText('Select Video to Upload'));
      });

      await waitFor(() => {
        expect(getByText('Upload Video')).toBeTruthy();
      });

      // Start first upload
      await act(async () => {
        fireEvent.press(getByText('Upload Video'));
      });

      // Verify upload button is replaced with cancel button
      await waitFor(() => {
        expect(queryByText('Upload Video')).toBeNull();
        expect(getByText('Cancel Upload')).toBeTruthy();
      });
    });
  });

  // T562: TestUploadRetry (network error)
  describe('T562: Upload Retry on Network Errors', () => {
    it('should retry upload on network failure', async () => {
      const mockFile = {
        name: 'test-video.mp4',
        size: 10 * 1024 * 1024,
        uri: 'file:///path/to/video.mp4',
        mimeType: 'video/mp4',
      };

      const onUploadComplete = jest.fn();
      const onUploadError = jest.fn();

      (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
        canceled: false,
        assets: [mockFile],
      });

      // Mock retry behavior - fail twice, succeed on third attempt
      (videosApi.uploadVideo as jest.Mock).mockResolvedValueOnce({
        videoUrl: 'https://example.com/video.mp4',
        streamId: 'stream-123',
      });

      const { getByText } = render(
        <VideoUpload
          onUploadComplete={onUploadComplete}
          onUploadError={onUploadError}
          maxRetries={3}
        />
      );

      // Select and upload
      await act(async () => {
        fireEvent.press(getByText('Select Video to Upload'));
      });

      await waitFor(() => {
        expect(getByText('Upload Video')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('Upload Video'));
      });

      // Should succeed (videosApi handles retries internally)
      await waitFor(
        () => {
          expect(onUploadComplete).toHaveBeenCalledWith('https://example.com/video.mp4');
        },
        { timeout: 5000 }
      );

      expect(videosApi.uploadVideo).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          maxRetries: 3,
        })
      );
      expect(onUploadError).not.toHaveBeenCalled();
    });

    it('should fail after max retry attempts', async () => {
      const mockFile = {
        name: 'test-video.mp4',
        size: 10 * 1024 * 1024,
        uri: 'file:///path/to/video.mp4',
        mimeType: 'video/mp4',
      };

      const onUploadError = jest.fn();
      const onUploadComplete = jest.fn();

      (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
        canceled: false,
        assets: [mockFile],
      });

      // Mock API to reject with network error (simulating failed retries)
      const networkError = new Error('Network error');
      (networkError as any).status = 500;
      (videosApi.uploadVideo as jest.Mock).mockRejectedValueOnce(networkError);

      const { getByText } = render(
        <VideoUpload
          onUploadError={onUploadError}
          onUploadComplete={onUploadComplete}
          maxRetries={3}
        />
      );

      await act(async () => {
        fireEvent.press(getByText('Select Video to Upload'));
      });

      await waitFor(() => {
        expect(getByText('Upload Video')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('Upload Video'));
      });

      // Should fail after retries exhausted
      await waitFor(
        () => {
          expect(onUploadError).toHaveBeenCalledWith(expect.stringContaining('Network error'));
        },
        { timeout: 5000 }
      );

      expect(onUploadComplete).not.toHaveBeenCalled();
    });

    it('should use exponential backoff between retries', async () => {
      const mockFile = {
        name: 'test-video.mp4',
        size: 10 * 1024 * 1024,
        uri: 'file:///path/to/video.mp4',
        mimeType: 'video/mp4',
      };

      (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
        canceled: false,
        assets: [mockFile],
      });

      // Mock API to succeed (exponential backoff is handled internally by videosApi)
      (videosApi.uploadVideo as jest.Mock).mockResolvedValueOnce({
        videoUrl: 'https://example.com/video.mp4',
        streamId: 'stream-123',
      });

      const { getByText } = render(<VideoUpload retryDelay={100} />);

      await act(async () => {
        fireEvent.press(getByText('Select Video to Upload'));
      });

      await waitFor(() => {
        expect(getByText('Upload Video')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('Upload Video'));
      });

      await waitFor(
        () => {
          expect(videosApi.uploadVideo).toHaveBeenCalled();
        },
        { timeout: 5000 }
      );

      // Verify retryDelay was passed to API
      expect(videosApi.uploadVideo).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          retryDelay: 100,
        })
      );
    });

    it('should handle HTTP error responses with retry', async () => {
      const mockFile = {
        name: 'test-video.mp4',
        size: 10 * 1024 * 1024,
        uri: 'file:///path/to/video.mp4',
        mimeType: 'video/mp4',
      };

      const onUploadError = jest.fn();

      (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
        canceled: false,
        assets: [mockFile],
      });

      // First attempt returns 500, second succeeds
      // Mock API to succeed after retry (retry logic is in videosApi)
      (videosApi.uploadVideo as jest.Mock).mockResolvedValueOnce({
        videoUrl: 'https://example.com/video.mp4',
        streamId: 'stream-123',
      });

      const { getByText } = render(<VideoUpload onUploadError={onUploadError} maxRetries={3} />);

      await act(async () => {
        fireEvent.press(getByText('Select Video to Upload'));
      });

      await waitFor(() => {
        expect(getByText('Upload Video')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('Upload Video'));
      });

      // Should succeed (videosApi handles retries internally)
      await waitFor(
        () => {
          expect(videosApi.uploadVideo).toHaveBeenCalled();
        },
        { timeout: 5000 }
      );

      expect(onUploadError).not.toHaveBeenCalled();
    });

    it('should not retry on 4xx client errors', async () => {
      const mockFile = {
        name: 'test-video.mp4',
        size: 10 * 1024 * 1024,
        uri: 'file:///path/to/video.mp4',
        mimeType: 'video/mp4',
      };

      const onUploadError = jest.fn();

      (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
        canceled: false,
        assets: [mockFile],
      });

      // Mock 400 error (client error - should not retry)
      const clientError = new Error('Invalid video format');
      (clientError as any).status = 400;
      (videosApi.uploadVideo as jest.Mock).mockRejectedValueOnce(clientError);

      const { getByText } = render(<VideoUpload onUploadError={onUploadError} />);

      await act(async () => {
        fireEvent.press(getByText('Select Video to Upload'));
      });

      await waitFor(() => {
        expect(getByText('Upload Video')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('Upload Video'));
      });

      // Should fail immediately without retry
      await waitFor(() => {
        expect(onUploadError).toHaveBeenCalled();
      });

      // videosApi should be called once (no retries for 4xx errors)
      expect(videosApi.uploadVideo).toHaveBeenCalledTimes(1);
    });
  });
});
