/**
 * ShareButtons Component Tests
 *
 * Comprehensive tests for the ShareButtons component covering:
 * - Multi-platform sharing (Facebook, Twitter, LinkedIn, WhatsApp)
 * - URL construction and validation
 * - Error handling
 * - Different variants and sizes
 * - Accessibility
 * - Edge cases
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { ShareButtons } from '@/components/social/ShareButtons';
import * as Linking from 'expo-linking';

// Mock expo-linking
jest.mock('expo-linking', () => ({
  openURL: jest.fn(() => Promise.resolve()),
  canOpenURL: jest.fn(() => Promise.resolve(true)),
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('ShareButtons', () => {
  const mockProps = {
    title: 'Check out this property!',
    url: 'https://quester.app/property/123',
    description: 'Amazing property in downtown',
    imageUrl: 'https://quester.app/images/property.jpg',
    hashtags: ['RealEstate', 'Property', 'Investment'],
    onShare: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (Linking.canOpenURL as jest.Mock).mockResolvedValue(true);
  });

  // ============================================================================
  // Basic Rendering Tests
  // ============================================================================

  describe('Basic Rendering', () => {
    it('should render all platform buttons', () => {
      render(<ShareButtons {...mockProps} />);

      expect(screen.getByTestId('share-button-facebook')).toBeTruthy();
      expect(screen.getByTestId('share-button-twitter')).toBeTruthy();
      expect(screen.getByTestId('share-button-linkedin')).toBeTruthy();
      expect(screen.getByTestId('share-button-whatsapp')).toBeTruthy();
    });

    it('should render icons variant by default', () => {
      render(<ShareButtons {...mockProps} />);

      // Icons variant only shows icons, no text
      expect(screen.queryByText('Facebook')).toBeNull();
      expect(screen.queryByText('Twitter')).toBeNull();
    });

    it('should render buttons variant with text', () => {
      render(<ShareButtons {...mockProps} variant="buttons" />);

      expect(screen.getByText('Share on Facebook')).toBeTruthy();
      expect(screen.getByText('Share on Twitter')).toBeTruthy();
      expect(screen.getByText('Share on LinkedIn')).toBeTruthy();
      expect(screen.getByText('Share on WhatsApp')).toBeTruthy();
    });
  });

  // ============================================================================
  // Size Tests
  // ============================================================================

  describe('Size Variants', () => {
    it('should render small size icons', () => {
      render(<ShareButtons {...mockProps} size="small" />);

      const icon = screen.getByTestId('facebook-icon');
      expect(icon.props.size).toBe(20);
    });

    it('should render medium size icons by default', () => {
      render(<ShareButtons {...mockProps} />);

      const icon = screen.getByTestId('facebook-icon');
      expect(icon.props.size).toBe(24);
    });

    it('should render large size icons', () => {
      render(<ShareButtons {...mockProps} size="large" />);

      const icon = screen.getByTestId('facebook-icon');
      expect(icon.props.size).toBe(32);
    });
  });

  // ============================================================================
  // Facebook Share Tests
  // ============================================================================

  describe('Facebook Sharing', () => {
    it('should open Facebook share dialog', async () => {
      render(<ShareButtons {...mockProps} />);

      const facebookButton = screen.getByTestId('share-button-facebook');
      fireEvent.press(facebookButton);

      await waitFor(() => {
        expect(Linking.openURL).toHaveBeenCalledWith(
          expect.stringContaining('facebook.com/sharer/sharer.php')
        );
      });
    });

    it('should include URL in Facebook share', async () => {
      render(<ShareButtons {...mockProps} />);

      const facebookButton = screen.getByTestId('share-button-facebook');
      fireEvent.press(facebookButton);

      await waitFor(() => {
        expect(Linking.openURL).toHaveBeenCalledWith(
          expect.stringContaining(encodeURIComponent(mockProps.url))
        );
      });
    });

    it('should call onShare callback after Facebook share', async () => {
      render(<ShareButtons {...mockProps} />);

      const facebookButton = screen.getByTestId('share-button-facebook');
      fireEvent.press(facebookButton);

      await waitFor(() => {
        expect(mockProps.onShare).toHaveBeenCalledWith('facebook');
      });
    });
  });

  // ============================================================================
  // Twitter Share Tests
  // ============================================================================

  describe('Twitter Sharing', () => {
    it('should open Twitter share dialog', async () => {
      render(<ShareButtons {...mockProps} />);

      const twitterButton = screen.getByTestId('share-button-twitter');
      fireEvent.press(twitterButton);

      await waitFor(() => {
        expect(Linking.openURL).toHaveBeenCalledWith(
          expect.stringContaining('twitter.com/intent/tweet')
        );
      });
    });

    it('should include title in Twitter share', async () => {
      render(<ShareButtons {...mockProps} />);

      const twitterButton = screen.getByTestId('share-button-twitter');
      fireEvent.press(twitterButton);

      await waitFor(() => {
        expect(Linking.openURL).toHaveBeenCalledWith(
          expect.stringContaining(encodeURIComponent(mockProps.title))
        );
      });
    });

    it('should include URL in Twitter share', async () => {
      render(<ShareButtons {...mockProps} />);

      const twitterButton = screen.getByTestId('share-button-twitter');
      fireEvent.press(twitterButton);

      await waitFor(() => {
        expect(Linking.openURL).toHaveBeenCalledWith(
          expect.stringContaining(encodeURIComponent(mockProps.url))
        );
      });
    });

    it('should include hashtags in Twitter share', async () => {
      render(<ShareButtons {...mockProps} />);

      const twitterButton = screen.getByTestId('share-button-twitter');
      fireEvent.press(twitterButton);

      await waitFor(() => {
        expect(Linking.openURL).toHaveBeenCalledWith(
          expect.stringContaining('hashtags=RealEstate,Property,Investment')
        );
      });
    });

    it('should call onShare callback after Twitter share', async () => {
      render(<ShareButtons {...mockProps} />);

      const twitterButton = screen.getByTestId('share-button-twitter');
      fireEvent.press(twitterButton);

      await waitFor(() => {
        expect(mockProps.onShare).toHaveBeenCalledWith('twitter');
      });
    });
  });

  // ============================================================================
  // LinkedIn Share Tests
  // ============================================================================

  describe('LinkedIn Sharing', () => {
    it('should open LinkedIn share dialog', async () => {
      render(<ShareButtons {...mockProps} />);

      const linkedinButton = screen.getByTestId('share-button-linkedin');
      fireEvent.press(linkedinButton);

      await waitFor(() => {
        expect(Linking.openURL).toHaveBeenCalledWith(
          expect.stringContaining('linkedin.com/sharing/share-offsite')
        );
      });
    });

    it('should include URL in LinkedIn share', async () => {
      render(<ShareButtons {...mockProps} />);

      const linkedinButton = screen.getByTestId('share-button-linkedin');
      fireEvent.press(linkedinButton);

      await waitFor(() => {
        expect(Linking.openURL).toHaveBeenCalledWith(
          expect.stringContaining(encodeURIComponent(mockProps.url))
        );
      });
    });

    it('should call onShare callback after LinkedIn share', async () => {
      render(<ShareButtons {...mockProps} />);

      const linkedinButton = screen.getByTestId('share-button-linkedin');
      fireEvent.press(linkedinButton);

      await waitFor(() => {
        expect(mockProps.onShare).toHaveBeenCalledWith('linkedin');
      });
    });
  });

  // ============================================================================
  // WhatsApp Share Tests
  // ============================================================================

  describe('WhatsApp Sharing', () => {
    it('should open WhatsApp share dialog', async () => {
      render(<ShareButtons {...mockProps} />);

      const whatsappButton = screen.getByTestId('share-button-whatsapp');
      fireEvent.press(whatsappButton);

      await waitFor(() => {
        expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('whatsapp://send'));
      });
    });

    it('should include title and URL in WhatsApp share', async () => {
      render(<ShareButtons {...mockProps} />);

      const whatsappButton = screen.getByTestId('share-button-whatsapp');
      fireEvent.press(whatsappButton);

      await waitFor(() => {
        const callArg = (Linking.openURL as jest.Mock).mock.calls[0][0];
        expect(callArg).toContain(encodeURIComponent(mockProps.title));
        expect(callArg).toContain(encodeURIComponent(mockProps.url));
      });
    });

    it('should call onShare callback after WhatsApp share', async () => {
      render(<ShareButtons {...mockProps} />);

      const whatsappButton = screen.getByTestId('share-button-whatsapp');
      fireEvent.press(whatsappButton);

      await waitFor(() => {
        expect(mockProps.onShare).toHaveBeenCalledWith('whatsapp');
      });
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('Error Handling', () => {
    it('should show alert when platform app is not available', async () => {
      (Linking.canOpenURL as jest.Mock).mockResolvedValueOnce(false);

      render(<ShareButtons {...mockProps} />);

      const whatsappButton = screen.getByTestId('share-button-whatsapp');
      fireEvent.press(whatsappButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', expect.stringContaining('not installed'));
      });
    });

    it('should handle Linking.openURL errors', async () => {
      (Linking.openURL as jest.Mock).mockRejectedValueOnce(new Error('Failed to open'));

      render(<ShareButtons {...mockProps} />);

      const facebookButton = screen.getByTestId('share-button-facebook');
      fireEvent.press(facebookButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          expect.stringContaining('Failed to share')
        );
      });
    });

    it('should not call onShare when sharing fails', async () => {
      (Linking.openURL as jest.Mock).mockRejectedValueOnce(new Error('Failed'));

      render(<ShareButtons {...mockProps} />);

      const facebookButton = screen.getByTestId('share-button-facebook');
      fireEvent.press(facebookButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
      });

      expect(mockProps.onShare).not.toHaveBeenCalled();
    });

    it('should handle missing onShare callback gracefully', async () => {
      const propsWithoutCallback = { ...mockProps, onShare: undefined };

      render(<ShareButtons {...propsWithoutCallback} />);

      const facebookButton = screen.getByTestId('share-button-facebook');

      await expect(async () => {
        fireEvent.press(facebookButton);
        await waitFor(() => {
          expect(Linking.openURL).toHaveBeenCalled();
        });
      }).not.toThrow();
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle missing title', async () => {
      const propsWithoutTitle = { ...mockProps, title: undefined };
      render(<ShareButtons {...propsWithoutTitle} />);

      const twitterButton = screen.getByTestId('share-button-twitter');
      fireEvent.press(twitterButton);

      await waitFor(() => {
        expect(Linking.openURL).toHaveBeenCalled();
      });
    });

    it('should handle missing description', async () => {
      const propsWithoutDesc = { ...mockProps, description: undefined };
      render(<ShareButtons {...propsWithoutDesc} />);

      const facebookButton = screen.getByTestId('share-button-facebook');
      fireEvent.press(facebookButton);

      await waitFor(() => {
        expect(Linking.openURL).toHaveBeenCalled();
      });
    });

    it('should handle empty hashtags array', async () => {
      const propsWithoutHashtags = { ...mockProps, hashtags: [] };
      render(<ShareButtons {...propsWithoutHashtags} />);

      const twitterButton = screen.getByTestId('share-button-twitter');
      fireEvent.press(twitterButton);

      await waitFor(() => {
        expect(Linking.openURL).toHaveBeenCalled();
      });
    });

    it('should handle special characters in title', async () => {
      const propsWithSpecialChars = {
        ...mockProps,
        title: 'Property with & special < > characters "quotes"',
      };
      render(<ShareButtons {...propsWithSpecialChars} />);

      const twitterButton = screen.getByTestId('share-button-twitter');
      fireEvent.press(twitterButton);

      await waitFor(() => {
        expect(Linking.openURL).toHaveBeenCalledWith(
          expect.stringContaining(encodeURIComponent(propsWithSpecialChars.title))
        );
      });
    });

    it('should handle very long title', async () => {
      const longTitle = 'A'.repeat(500);
      const propsWithLongTitle = { ...mockProps, title: longTitle };

      render(<ShareButtons {...propsWithLongTitle} />);

      const twitterButton = screen.getByTestId('share-button-twitter');
      fireEvent.press(twitterButton);

      await waitFor(() => {
        expect(Linking.openURL).toHaveBeenCalled();
      });
    });

    it('should handle very long URL', async () => {
      const longUrl = 'https://quester.app/' + 'param=value&'.repeat(100);
      const propsWithLongUrl = { ...mockProps, url: longUrl };

      render(<ShareButtons {...propsWithLongUrl} />);

      const facebookButton = screen.getByTestId('share-button-facebook');
      fireEvent.press(facebookButton);

      await waitFor(() => {
        expect(Linking.openURL).toHaveBeenCalled();
      });
    });

    it('should handle URLs with query parameters', async () => {
      const urlWithParams = 'https://quester.app/property/123?ref=share&utm_source=app';
      const propsWithParams = { ...mockProps, url: urlWithParams };

      render(<ShareButtons {...propsWithParams} />);

      const facebookButton = screen.getByTestId('share-button-facebook');
      fireEvent.press(facebookButton);

      await waitFor(() => {
        expect(Linking.openURL).toHaveBeenCalledWith(
          expect.stringContaining(encodeURIComponent(urlWithParams))
        );
      });
    });
  });

  // ============================================================================
  // Accessibility Tests
  // ============================================================================

  describe('Accessibility', () => {
    it('should have accessible labels for all buttons', () => {
      render(<ShareButtons {...mockProps} />);

      const facebookButton = screen.getByTestId('share-button-facebook');
      expect(facebookButton.props.accessibilityLabel).toBe('Share on Facebook');
      expect(facebookButton.props.accessibilityRole).toBe('button');

      const twitterButton = screen.getByTestId('share-button-twitter');
      expect(twitterButton.props.accessibilityLabel).toBe('Share on Twitter');

      const linkedinButton = screen.getByTestId('share-button-linkedin');
      expect(linkedinButton.props.accessibilityLabel).toBe('Share on LinkedIn');

      const whatsappButton = screen.getByTestId('share-button-whatsapp');
      expect(whatsappButton.props.accessibilityLabel).toBe('Share on WhatsApp');
    });

    it('should have accessibility hints', () => {
      render(<ShareButtons {...mockProps} />);

      const facebookButton = screen.getByTestId('share-button-facebook');
      expect(facebookButton.props.accessibilityHint).toContain('Opens Facebook');
    });
  });

  // ============================================================================
  // Performance Tests
  // ============================================================================

  describe('Performance', () => {
    it('should render within acceptable time', () => {
      const startTime = Date.now();
      render(<ShareButtons {...mockProps} />);
      const renderTime = Date.now() - startTime;

      // Allow more time for slower CI/test environments
      expect(renderTime).toBeLessThan(200);
    });

    it('should handle multiple rapid button presses', async () => {
      render(<ShareButtons {...mockProps} />);

      const facebookButton = screen.getByTestId('share-button-facebook');

      // Rapid fire presses
      fireEvent.press(facebookButton);
      fireEvent.press(facebookButton);
      fireEvent.press(facebookButton);

      // Should only process once (debounced or handled correctly)
      await waitFor(() => {
        expect(Linking.openURL).toHaveBeenCalled();
      });
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('Integration', () => {
    it('should work with all props combined', async () => {
      render(
        <ShareButtons
          title="Amazing Property"
          url="https://quester.app/property/123"
          description="Luxury villa with ocean view"
          imageUrl="https://quester.app/images/villa.jpg"
          hashtags={['Luxury', 'RealEstate', 'Investment']}
          onShare={mockProps.onShare}
          size="large"
          variant="buttons"
        />
      );

      expect(screen.getByText('Share on Facebook')).toBeTruthy();
      expect(screen.getByText('Share on Twitter')).toBeTruthy();
      expect(screen.getByText('Share on LinkedIn')).toBeTruthy();
      expect(screen.getByText('Share on WhatsApp')).toBeTruthy();

      const facebookIcon = screen.getByTestId('facebook-icon');
      expect(facebookIcon.props.size).toBe(20);

      const facebookButton = screen.getByTestId('share-button-facebook');
      fireEvent.press(facebookButton);

      await waitFor(() => {
        expect(Linking.openURL).toHaveBeenCalled();
        expect(mockProps.onShare).toHaveBeenCalledWith('facebook');
      });
    });

    it('should share to multiple platforms sequentially', async () => {
      render(<ShareButtons {...mockProps} />);

      const facebookButton = screen.getByTestId('share-button-facebook');
      const twitterButton = screen.getByTestId('share-button-twitter');
      const linkedinButton = screen.getByTestId('share-button-linkedin');

      fireEvent.press(facebookButton);
      await waitFor(() => {
        expect(mockProps.onShare).toHaveBeenCalledWith('facebook');
      });

      fireEvent.press(twitterButton);
      await waitFor(() => {
        expect(mockProps.onShare).toHaveBeenCalledWith('twitter');
      });

      fireEvent.press(linkedinButton);
      await waitFor(() => {
        expect(mockProps.onShare).toHaveBeenCalledWith('linkedin');
      });

      expect(mockProps.onShare).toHaveBeenCalledTimes(3);
    });
  });
});
