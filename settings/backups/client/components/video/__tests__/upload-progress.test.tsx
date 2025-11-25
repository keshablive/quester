/**
 * Tests for UploadProgress Component (T566)
 *
 * Tests visual progress indicator (0-100%)
 * Tests status display and retry information
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { Animated } from 'react-native';

// Make Animated.timing synchronous to avoid teardown issues
const originalTiming = Animated.timing;
(Animated as any).timing = jest.fn((value: any, config: any) => ({
  start: (callback?: (result: { finished: boolean }) => void) => {
    // Immediately set to target value
    value.setValue(config.toValue);
    if (callback) {
      // Call callback synchronously
      setTimeout(() => callback({ finished: true }), 0);
    }
  },
  stop: jest.fn(),
  reset: jest.fn(),
})) as any;

import { UploadProgress } from '../upload-progress';

describe('UploadProgress Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    // Restore original
    (Animated as any).timing = originalTiming;
  });

  describe('Progress Display', () => {
    it('should display progress percentage', () => {
      const { getByText } = render(
        <UploadProgress progress={45} isUploading={true} showPercentage={true} />
      );

      expect(getByText('45%')).toBeTruthy();
    });

    it('should hide percentage when showPercentage is false', () => {
      const { queryByText } = render(
        <UploadProgress progress={45} isUploading={true} showPercentage={false} />
      );

      expect(queryByText('45%')).toBeNull();
    });

    it('should round decimal progress to nearest integer', () => {
      const { getByText } = render(<UploadProgress progress={45.7} isUploading={true} />);

      expect(getByText('46%')).toBeTruthy();
    });

    it('should display 0% for zero progress', () => {
      const { getByText } = render(<UploadProgress progress={0} isUploading={true} />);

      expect(getByText('0%')).toBeTruthy();
    });

    it('should display 100% when complete', () => {
      const { getByText } = render(<UploadProgress progress={100} isUploading={false} />);

      expect(getByText('100%')).toBeTruthy();
    });
  });

  describe('Status Text', () => {
    it('should show "Uploading..." when in progress', () => {
      const { getByText } = render(<UploadProgress progress={45} isUploading={true} />);

      expect(getByText('Uploading...')).toBeTruthy();
    });

    it('should show "Upload Complete" when finished', () => {
      const { getByText } = render(<UploadProgress progress={100} isUploading={false} />);

      expect(getByText('Upload Complete')).toBeTruthy();
    });

    it('should show "Ready to upload" when idle', () => {
      const { getByText } = render(<UploadProgress progress={0} isUploading={false} />);

      expect(getByText('Ready to upload')).toBeTruthy();
    });

    it('should show retry attempt when retrying', () => {
      const { getByText } = render(
        <UploadProgress progress={30} isUploading={true} retryAttempt={2} />
      );

      expect(getByText('Retrying... (Attempt 3)')).toBeTruthy();
    });
  });

  describe('File Information', () => {
    it('should display file name when provided', () => {
      const { getByText } = render(
        <UploadProgress progress={45} isUploading={true} fileName="video.mp4" showFileName={true} />
      );

      expect(getByText('video.mp4')).toBeTruthy();
    });

    it('should hide file name when showFileName is false', () => {
      const { queryByText } = render(
        <UploadProgress
          progress={45}
          isUploading={true}
          fileName="video.mp4"
          showFileName={false}
        />
      );

      expect(queryByText('video.mp4')).toBeNull();
    });

    it('should display file size when provided', () => {
      const { getByText } = render(
        <UploadProgress progress={45} isUploading={true} fileSize="25.5 MB" />
      );

      expect(getByText('25.5 MB')).toBeTruthy();
    });

    it('should not display file size when not provided', () => {
      const { queryByText } = render(<UploadProgress progress={45} isUploading={true} />);

      expect(queryByText(/MB/)).toBeNull();
    });
  });

  describe('Retry Information', () => {
    it('should show retry info when retryAttempt > 0', () => {
      const { getByText } = render(
        <UploadProgress progress={30} isUploading={true} retryAttempt={1} />
      );

      expect(getByText(/Upload failed/)).toBeTruthy();
      expect(getByText(/exponential backoff/)).toBeTruthy();
    });

    it('should not show retry info when retryAttempt is 0', () => {
      const { queryByText } = render(
        <UploadProgress progress={30} isUploading={true} retryAttempt={0} />
      );

      expect(queryByText(/Upload failed/)).toBeNull();
    });

    it('should show correct retry attempt number', () => {
      const { getByText } = render(
        <UploadProgress progress={30} isUploading={true} retryAttempt={2} />
      );

      // retryAttempt is 0-indexed, so 2 means 3rd attempt
      expect(getByText('Retrying... (Attempt 3)')).toBeTruthy();
    });
  });

  describe('Upload Phases', () => {
    it('should show "Preparing upload..." for early progress', () => {
      const { getByText } = render(<UploadProgress progress={25} isUploading={true} />);

      expect(getByText('Preparing upload...')).toBeTruthy();
    });

    it('should show "Finalizing upload..." for late progress', () => {
      const { getByText } = render(<UploadProgress progress={75} isUploading={true} />);

      expect(getByText('Finalizing upload...')).toBeTruthy();
    });

    it('should not show phase info when complete', () => {
      const { queryByText } = render(<UploadProgress progress={100} isUploading={false} />);

      expect(queryByText(/Preparing/)).toBeNull();
      expect(queryByText(/Finalizing/)).toBeNull();
    });

    it('should not show phase info when idle', () => {
      const { queryByText } = render(<UploadProgress progress={0} isUploading={false} />);

      expect(queryByText(/Preparing/)).toBeNull();
      expect(queryByText(/Finalizing/)).toBeNull();
    });
  });

  describe('Visual States', () => {
    it('should render progress bar when uploading', () => {
      const { getByText } = render(<UploadProgress progress={45} isUploading={true} />);

      // Component should render with progress text
      expect(getByText('45%')).toBeTruthy();
    });

    it('should not render progress bar when idle with 0 progress', () => {
      const { queryByText } = render(<UploadProgress progress={0} isUploading={false} />);

      // No percentage should be shown
      expect(queryByText('0%')).toBeNull();
    });
  });

  describe('Complete Upload Flow', () => {
    it('should show full upload lifecycle', async () => {
      const { rerender, getByText } = render(
        <UploadProgress progress={0} isUploading={false} fileName="video.mp4" fileSize="25.5 MB" />
      );

      // Initial state
      expect(getByText('Ready to upload')).toBeTruthy();

      // Start uploading
      rerender(
        <UploadProgress progress={10} isUploading={true} fileName="video.mp4" fileSize="25.5 MB" />
      );
      expect(getByText('Uploading...')).toBeTruthy();
      expect(getByText('10%')).toBeTruthy();

      // Mid-progress
      rerender(
        <UploadProgress progress={50} isUploading={true} fileName="video.mp4" fileSize="25.5 MB" />
      );
      expect(getByText('50%')).toBeTruthy();
      expect(getByText('Finalizing upload...')).toBeTruthy();

      // Complete
      rerender(
        <UploadProgress
          progress={100}
          isUploading={false}
          fileName="video.mp4"
          fileSize="25.5 MB"
        />
      );
      expect(getByText('Upload Complete')).toBeTruthy();
      expect(getByText('100%')).toBeTruthy();
    });

    it('should show retry flow', async () => {
      const { rerender, getByText } = render(
        <UploadProgress progress={30} isUploading={true} fileName="video.mp4" />
      );

      expect(getByText('Uploading...')).toBeTruthy();
      expect(getByText('30%')).toBeTruthy();

      // First retry
      rerender(
        <UploadProgress progress={30} isUploading={true} fileName="video.mp4" retryAttempt={1} />
      );
      expect(getByText('Retrying... (Attempt 2)')).toBeTruthy();
      expect(getByText(/Upload failed/)).toBeTruthy();

      // Second retry
      rerender(
        <UploadProgress progress={30} isUploading={true} fileName="video.mp4" retryAttempt={2} />
      );
      expect(getByText('Retrying... (Attempt 3)')).toBeTruthy();

      // Success after retry
      rerender(
        <UploadProgress progress={100} isUploading={false} fileName="video.mp4" retryAttempt={0} />
      );
      expect(getByText('Upload Complete')).toBeTruthy();
    });
  });

  describe('Props Validation', () => {
    it('should handle all props correctly', () => {
      const { getByText } = render(
        <UploadProgress
          progress={67}
          isUploading={true}
          fileName="test-video.mp4"
          fileSize="50 MB"
          showPercentage={true}
          showFileName={true}
          retryAttempt={0}
        />
      );

      expect(getByText('67%')).toBeTruthy();
      expect(getByText('Uploading...')).toBeTruthy();
      expect(getByText('test-video.mp4')).toBeTruthy();
      expect(getByText('50 MB')).toBeTruthy();
    });

    it('should use default values for optional props', () => {
      const { getByText } = render(<UploadProgress progress={50} isUploading={true} />);

      // Should show percentage by default
      expect(getByText('50%')).toBeTruthy();
      // Should show status
      expect(getByText('Uploading...')).toBeTruthy();
    });
  });
});
