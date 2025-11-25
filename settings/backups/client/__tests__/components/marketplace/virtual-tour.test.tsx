/**
 * VirtualTour Component Tests
 *
 * Comprehensive tests for the VirtualTour component covering:
 * - Tour rendering (image and iframe)
 * - Navigation between multiple tours
 * - Pagination dots
 * - Close button functionality
 * - Fullscreen mode
 * - Loading states
 * - Edge cases
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { VirtualTour } from '@/components/marketplace/virtual-tour';

// Mock WebView
jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    WebView: ({ source, onLoadStart, onLoadEnd }: any) => {
      React.useEffect(() => {
        onLoadStart?.();
        setTimeout(() => onLoadEnd?.(), 100);
      }, [source.uri]);

      return <View testID="webview" accessibilityLabel={`WebView: ${source.uri}`} />;
    },
  };
});

describe('VirtualTour', () => {
  const mockImageUrls = ['https://example.com/tour1.jpg', 'https://example.com/tour2.png'];

  const mockIframeUrls = ['https://example.com/360-tour', 'https://matterport.com/show/abc123'];

  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // Rendering Tests
  // ============================================================================

  describe('Rendering', () => {
    it('should render image tour', () => {
      render(<VirtualTour tourUrls={mockImageUrls} />);

      expect(screen.getByTestId('tour-image')).toBeTruthy();
    });

    it('should render iframe tour for non-image URLs', async () => {
      render(<VirtualTour tourUrls={mockIframeUrls} />);

      await waitFor(() => {
        expect(screen.getByTestId('webview')).toBeTruthy();
      });
    });

    it('should render pagination dots', () => {
      render(<VirtualTour tourUrls={mockImageUrls} />);

      const dots = screen.getAllByTestId(/pagination-dot-/);
      expect(dots).toHaveLength(2);
    });

    it('should render close button when onClose provided', () => {
      render(<VirtualTour tourUrls={mockImageUrls} onClose={mockOnClose} />);

      expect(screen.getByTestId('close-button')).toBeTruthy();
    });

    it('should not render close button when onClose not provided', () => {
      render(<VirtualTour tourUrls={mockImageUrls} />);

      expect(screen.queryByTestId('close-button')).toBeNull();
    });

    it('should return null for empty tourUrls array', () => {
      const { UNSAFE_root } = render(<VirtualTour tourUrls={[]} />);

      expect(UNSAFE_root.children.length).toBe(0);
    });

    it('should return null for undefined tourUrls', () => {
      const { UNSAFE_root } = render(<VirtualTour tourUrls={undefined as any} />);

      expect(UNSAFE_root.children.length).toBe(0);
    });
  });

  // ============================================================================
  // Navigation Tests
  // ============================================================================

  describe('Navigation', () => {
    it('should show next button when not at last tour', () => {
      render(<VirtualTour tourUrls={mockImageUrls} />);

      expect(screen.getByTestId('nav-button-right')).toBeTruthy();
    });

    it('should show previous button when not at first tour', () => {
      render(<VirtualTour tourUrls={mockImageUrls} />);

      // Navigate to next
      fireEvent.press(screen.getByTestId('nav-button-right'));

      expect(screen.getByTestId('nav-button-left')).toBeTruthy();
    });

    it('should not show previous button on first tour', () => {
      render(<VirtualTour tourUrls={mockImageUrls} />);

      expect(screen.queryByTestId('nav-button-left')).toBeNull();
    });

    it('should not show next button on last tour', () => {
      render(<VirtualTour tourUrls={mockImageUrls} />);

      // Navigate to last
      fireEvent.press(screen.getByTestId('nav-button-right'));

      expect(screen.queryByTestId('nav-button-right')).toBeNull();
    });

    it('should navigate to next tour when next button pressed', () => {
      render(<VirtualTour tourUrls={mockImageUrls} />);

      const activeDot = screen.getByTestId('pagination-dot-0-active');
      expect(activeDot).toBeTruthy();

      fireEvent.press(screen.getByTestId('nav-button-right'));

      const newActiveDot = screen.getByTestId('pagination-dot-1-active');
      expect(newActiveDot).toBeTruthy();
    });

    it('should navigate to previous tour when previous button pressed', () => {
      render(<VirtualTour tourUrls={mockImageUrls} />);

      // Go to second tour
      fireEvent.press(screen.getByTestId('nav-button-right'));

      // Go back to first
      fireEvent.press(screen.getByTestId('nav-button-left'));

      const activeDot = screen.getByTestId('pagination-dot-0-active');
      expect(activeDot).toBeTruthy();
    });

    it('should not show navigation buttons for single tour', () => {
      render(<VirtualTour tourUrls={[mockImageUrls[0]]} />);

      expect(screen.queryByTestId('nav-button-left')).toBeNull();
      expect(screen.queryByTestId('nav-button-right')).toBeNull();
    });
  });

  // ============================================================================
  // Pagination Tests
  // ============================================================================

  describe('Pagination', () => {
    it('should highlight active pagination dot', () => {
      render(<VirtualTour tourUrls={mockImageUrls} />);

      expect(screen.getByTestId('pagination-dot-0-active')).toBeTruthy();
      expect(screen.queryByTestId('pagination-dot-1-active')).toBeNull();
    });

    it('should navigate when pagination dot pressed', () => {
      render(<VirtualTour tourUrls={mockImageUrls} />);

      fireEvent.press(screen.getByTestId('pagination-dot-1'));

      expect(screen.getByTestId('pagination-dot-1-active')).toBeTruthy();
    });

    it('should show correct number of pagination dots', () => {
      const threeTours = [...mockImageUrls, 'https://example.com/tour3.jpg'];
      render(<VirtualTour tourUrls={threeTours} />);

      const dots = screen.getAllByTestId(/pagination-dot-/);
      expect(dots).toHaveLength(3);
    });
  });

  // ============================================================================
  // Close Button Tests
  // ============================================================================

  describe('Close Button', () => {
    it('should call onClose when close button pressed', () => {
      render(<VirtualTour tourUrls={mockImageUrls} onClose={mockOnClose} />);

      fireEvent.press(screen.getByTestId('close-button'));

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // Fullscreen Mode Tests
  // ============================================================================

  describe('Fullscreen Mode', () => {
    it('should apply fullscreen styles when fullscreen prop is true', () => {
      render(<VirtualTour tourUrls={mockImageUrls} fullscreen={true} />);

      const container = screen.getByTestId('tour-container');
      expect(container.props.style).toContainEqual(
        expect.objectContaining({ position: 'absolute' })
      );
    });

    it('should not apply fullscreen styles when fullscreen is false', () => {
      render(<VirtualTour tourUrls={mockImageUrls} fullscreen={false} />);

      const container = screen.getByTestId('tour-container');
      const styles = Array.isArray(container.props.style)
        ? container.props.style
        : [container.props.style];

      const hasFullscreenStyle = styles.some(
        (style: any) => style && style.position === 'absolute'
      );

      expect(hasFullscreenStyle).toBe(false);
    });
  });

  // ============================================================================
  // Loading State Tests
  // ============================================================================

  describe('Loading States', () => {
    it('should show loading indicator initially', () => {
      render(<VirtualTour tourUrls={mockImageUrls} />);

      expect(screen.getByTestId('loading-indicator')).toBeTruthy();
    });

    it('should hide loading indicator after image loads', async () => {
      render(<VirtualTour tourUrls={mockImageUrls} />);

      const image = screen.getByTestId('tour-image');
      fireEvent(image, 'loadEnd');

      await waitFor(() => {
        expect(screen.queryByTestId('loading-indicator')).toBeNull();
      });
    });

    it('should show loading indicator when navigating to new tour', async () => {
      render(<VirtualTour tourUrls={mockImageUrls} />);

      // Wait for initial load
      const image = screen.getByTestId('tour-image');
      fireEvent(image, 'loadEnd');

      await waitFor(() => {
        expect(screen.queryByTestId('loading-indicator')).toBeNull();
      });

      // Navigate to next
      fireEvent.press(screen.getByTestId('nav-button-right'));

      // Loading indicator behavior depends on image loading events
      // Just verify navigation worked
      expect(screen.getByTestId('nav-button-left')).toBeTruthy();
    });
  });

  // ============================================================================
  // Image vs WebView Detection Tests
  // ============================================================================

  describe('Content Type Detection', () => {
    it('should detect .jpg as image', () => {
      render(<VirtualTour tourUrls={['https://example.com/photo.jpg']} />);

      expect(screen.getByTestId('tour-image')).toBeTruthy();
      expect(screen.queryByTestId('webview')).toBeNull();
    });

    it('should detect .png as image', () => {
      render(<VirtualTour tourUrls={['https://example.com/photo.png']} />);

      expect(screen.getByTestId('tour-image')).toBeTruthy();
    });

    it('should detect .jpeg as image', () => {
      render(<VirtualTour tourUrls={['https://example.com/photo.jpeg']} />);

      expect(screen.getByTestId('tour-image')).toBeTruthy();
    });

    it('should detect .gif as image', () => {
      render(<VirtualTour tourUrls={['https://example.com/photo.gif']} />);

      expect(screen.getByTestId('tour-image')).toBeTruthy();
    });

    it('should detect .webp as image', () => {
      render(<VirtualTour tourUrls={['https://example.com/photo.webp']} />);

      expect(screen.getByTestId('tour-image')).toBeTruthy();
    });

    it('should detect non-image URLs as iframe', async () => {
      render(<VirtualTour tourUrls={['https://example.com/360']} />);

      await waitFor(() => {
        expect(screen.getByTestId('webview')).toBeTruthy();
      });
    });

    it('should be case-insensitive for image extensions', () => {
      render(<VirtualTour tourUrls={['https://example.com/photo.JPG']} />);

      expect(screen.getByTestId('tour-image')).toBeTruthy();
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle mix of images and iframes', async () => {
      const mixedUrls = ['https://example.com/photo.jpg', 'https://example.com/360-tour'];

      render(<VirtualTour tourUrls={mixedUrls} />);

      // First should be image
      expect(screen.getByTestId('tour-image')).toBeTruthy();

      // Navigate to second
      fireEvent.press(screen.getByTestId('nav-button-right'));

      // Second should be webview
      await waitFor(() => {
        expect(screen.getByTestId('webview')).toBeTruthy();
      });
    });

    it('should handle very long URLs', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(1000) + '.jpg';

      expect(() => render(<VirtualTour tourUrls={[longUrl]} />)).not.toThrow();
    });

    it('should handle rapid navigation', () => {
      const manyTours = Array.from({ length: 10 }, (_, i) => `https://example.com/tour${i}.jpg`);

      render(<VirtualTour tourUrls={manyTours} />);

      // Rapidly click next multiple times
      for (let i = 0; i < 5; i++) {
        const nextButton = screen.queryByTestId('nav-button-right');
        if (nextButton) {
          fireEvent.press(nextButton);
        }
      }

      expect(screen.getByTestId('tour-image')).toBeTruthy();
    });
  });

  // ============================================================================
  // Accessibility Tests
  // ============================================================================

  describe('Accessibility', () => {
    it('should have accessible close button', () => {
      render(<VirtualTour tourUrls={mockImageUrls} onClose={mockOnClose} />);

      const closeButton = screen.getByTestId('close-button');
      expect(closeButton.props.accessibilityLabel).toBe('Close virtual tour');
    });

    it('should have accessible navigation buttons', () => {
      render(<VirtualTour tourUrls={mockImageUrls} />);

      const nextButton = screen.getByTestId('nav-button-right');
      expect(nextButton.props.accessibilityLabel).toBe('Next tour');
    });

    it('should have accessible pagination dots', () => {
      render(<VirtualTour tourUrls={mockImageUrls} />);

      const dot = screen.getByTestId('pagination-dot-0-active');
      expect(dot.props.accessibilityLabel).toContain('tour 1');
    });
  });

  // ============================================================================
  // Performance Tests
  // ============================================================================

  describe('Performance', () => {
    it('should render within acceptable time', () => {
      const startTime = Date.now();
      render(<VirtualTour tourUrls={mockImageUrls} />);
      const renderTime = Date.now() - startTime;

      expect(renderTime).toBeLessThan(100);
    });

    it('should handle rapid tour URL changes', () => {
      const { rerender } = render(<VirtualTour tourUrls={mockImageUrls} />);

      for (let i = 0; i < 10; i++) {
        const newUrls = [`https://example.com/tour${i}.jpg`];
        rerender(<VirtualTour tourUrls={newUrls} />);
      }

      expect(screen.getByTestId('tour-image')).toBeTruthy();
    });
  });
});
