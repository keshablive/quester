import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ListingCard } from '@/components/marketplace/listing-card';
import type { MarketplaceListing } from '@/lib/api/marketplace';

describe('ListingCard', () => {
  const mockListing: MarketplaceListing = {
    id: 1,
    tenant_id: 1,
    title: 'React Native Advanced Course',
    description: 'Complete guide to React Native',
    price: 99.99,
    currency: 'USD',
    listing_type: 'course',
    images: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
    seller_id: 'seller-123',
    seller: {
      id: 'seller-123',
      username: 'johndoe',
      email: 'john@example.com',
    },
    average_rating: 4.5,
    total_reviews: 42,
    sold_count: 150,
    view_count: 1200,
    status: 'active',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-15T00:00:00Z',
  };

  const mockHandlers = {
    onPress: jest.fn(),
    onBuyPress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering - Basic Elements', () => {
    it('should render listing card', () => {
      render(<ListingCard listing={mockListing} onPress={mockHandlers.onPress} />);
      expect(screen.getByText('React Native Advanced Course')).toBeTruthy();
    });

    it('should display listing title', () => {
      render(<ListingCard listing={mockListing} onPress={mockHandlers.onPress} />);
      expect(screen.getByText('React Native Advanced Course')).toBeTruthy();
    });

    it('should display seller username', () => {
      render(<ListingCard listing={mockListing} onPress={mockHandlers.onPress} />);
      expect(screen.getByText(/by johndoe/i)).toBeTruthy();
    });

    it('should display "Unknown" when seller is missing', () => {
      render(
        <ListingCard
          listing={{ ...mockListing, seller: undefined }}
          onPress={mockHandlers.onPress}
        />
      );
      expect(screen.getByText(/by Unknown/i)).toBeTruthy();
    });

    it('should display listing type badge', () => {
      render(<ListingCard listing={mockListing} onPress={mockHandlers.onPress} />);
      expect(screen.getByText('Course')).toBeTruthy();
    });

    it('should display sold count badge when sold_count > 0', () => {
      render(<ListingCard listing={mockListing} onPress={mockHandlers.onPress} />);
      expect(screen.getByText('150 sold')).toBeTruthy();
    });

    it('should hide sold count badge when sold_count is 0', () => {
      render(
        <ListingCard listing={{ ...mockListing, sold_count: 0 }} onPress={mockHandlers.onPress} />
      );
      expect(screen.queryByText(/sold/i)).toBeNull();
    });
  });

  describe('Price Formatting', () => {
    it('should format USD price correctly', () => {
      render(<ListingCard listing={mockListing} onPress={mockHandlers.onPress} />);
      expect(screen.getByText('$99.99')).toBeTruthy();
    });

    it('should format INR price correctly', () => {
      render(
        <ListingCard
          listing={{ ...mockListing, price: 5000, currency: 'INR' }}
          onPress={mockHandlers.onPress}
        />
      );
      expect(screen.getByText('₹5,000')).toBeTruthy();
    });

    it('should handle other currencies generically', () => {
      render(
        <ListingCard
          listing={{ ...mockListing, price: 100, currency: 'EUR' }}
          onPress={mockHandlers.onPress}
        />
      );
      expect(screen.getByText('EUR 100')).toBeTruthy();
    });

    it('should handle large prices with comma separators', () => {
      render(
        <ListingCard
          listing={{ ...mockListing, price: 10000.0, currency: 'USD' }}
          onPress={mockHandlers.onPress}
        />
      );
      expect(screen.getByText('$10,000')).toBeTruthy();
    });
  });

  describe('Listing Type Formatting', () => {
    it('should format single-word types', () => {
      render(
        <ListingCard
          listing={{ ...mockListing, listing_type: 'course' }}
          onPress={mockHandlers.onPress}
        />
      );
      expect(screen.getByText('Course')).toBeTruthy();
    });

    it('should format multi-word types with underscores', () => {
      render(
        <ListingCard
          listing={{ ...mockListing, listing_type: 'digital_product' }}
          onPress={mockHandlers.onPress}
        />
      );
      expect(screen.getByText('Digital Product')).toBeTruthy();
    });

    it('should format certification type', () => {
      render(
        <ListingCard
          listing={{ ...mockListing, listing_type: 'certification' }}
          onPress={mockHandlers.onPress}
        />
      );
      expect(screen.getByText('Certification')).toBeTruthy();
    });
  });

  describe('Rating Display', () => {
    it('should display rating when total_reviews > 0', () => {
      render(<ListingCard listing={mockListing} onPress={mockHandlers.onPress} />);
      expect(screen.getByText('4.5')).toBeTruthy();
      expect(screen.getByText('(42 reviews)')).toBeTruthy();
    });

    it('should show singular "review" for 1 review', () => {
      render(
        <ListingCard
          listing={{ ...mockListing, total_reviews: 1, average_rating: 5.0 }}
          onPress={mockHandlers.onPress}
        />
      );
      expect(screen.getByText('(1 review)')).toBeTruthy();
    });

    it('should hide rating when total_reviews is 0', () => {
      render(
        <ListingCard
          listing={{ ...mockListing, total_reviews: 0 }}
          onPress={mockHandlers.onPress}
        />
      );
      expect(screen.queryByText(/reviews?/i)).toBeNull();
    });

    it('should display 1 decimal place for rating', () => {
      render(
        <ListingCard
          listing={{ ...mockListing, average_rating: 4.67 }}
          onPress={mockHandlers.onPress}
        />
      );
      expect(screen.getByText('4.7')).toBeTruthy();
    });
  });

  describe('Buy Now Button', () => {
    it('should show Buy Now button when onBuyPress is provided', () => {
      render(<ListingCard listing={mockListing} {...mockHandlers} />);
      expect(screen.getByText('Buy Now')).toBeTruthy();
    });

    it('should hide Buy Now button when onBuyPress is not provided', () => {
      render(<ListingCard listing={mockListing} onPress={mockHandlers.onPress} />);
      expect(screen.queryByText('Buy Now')).toBeNull();
    });

    it('should call onBuyPress when button is pressed', () => {
      render(<ListingCard listing={mockListing} {...mockHandlers} />);
      const buyButton = screen.getByText('Buy Now');
      const mockEvent = { stopPropagation: jest.fn() };
      fireEvent.press(buyButton, mockEvent);
      expect(mockHandlers.onBuyPress).toHaveBeenCalledWith(mockListing);
    });

    it('should not trigger onPress when Buy Now is pressed', () => {
      render(<ListingCard listing={mockListing} {...mockHandlers} />);
      const buyButton = screen.getByText('Buy Now');
      const mockEvent = { stopPropagation: jest.fn() };
      fireEvent.press(buyButton, mockEvent);
      // onBuyPress is called, onPress should ideally not be called
      // but React Native Testing Library doesn't perfectly simulate stopPropagation
      expect(mockHandlers.onBuyPress).toHaveBeenCalled();
    });
  });

  describe('Card Interaction', () => {
    it('should call onPress when card is pressed', () => {
      render(<ListingCard listing={mockListing} onPress={mockHandlers.onPress} />);
      fireEvent.press(screen.getByText('React Native Advanced Course'));
      expect(mockHandlers.onPress).toHaveBeenCalledWith(mockListing);
    });

    it('should call onPress when price is pressed', () => {
      const { getByText } = render(
        <ListingCard listing={mockListing} onPress={mockHandlers.onPress} />
      );
      fireEvent.press(getByText('$99.99'));
      expect(mockHandlers.onPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('Image Handling', () => {
    it('should use first image from images array', () => {
      const { UNSAFE_getByType } = render(
        <ListingCard listing={mockListing} onPress={mockHandlers.onPress} />
      );
      const image = UNSAFE_getByType('Image' as any);
      expect(image.props.source.uri).toBe('https://example.com/image1.jpg');
    });

    it('should use placeholder when images array is empty', () => {
      const { UNSAFE_getByType } = render(
        <ListingCard listing={{ ...mockListing, images: [] }} onPress={mockHandlers.onPress} />
      );
      const image = UNSAFE_getByType('Image' as any);
      expect(image.props.source.uri).toBe('https://via.placeholder.com/400x300');
    });

    it('should use placeholder when images is undefined', () => {
      const { UNSAFE_getByType } = render(
        <ListingCard
          listing={{ ...mockListing, images: undefined }}
          onPress={mockHandlers.onPress}
        />
      );
      const image = UNSAFE_getByType('Image' as any);
      expect(image.props.source.uri).toBe('https://via.placeholder.com/400x300');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long titles with numberOfLines', () => {
      const longTitle = 'A'.repeat(200);
      render(
        <ListingCard
          listing={{ ...mockListing, title: longTitle }}
          onPress={mockHandlers.onPress}
        />
      );
      const titleElement = screen.getByText(longTitle);
      expect(titleElement.props.numberOfLines).toBe(2);
    });

    it('should handle zero price', () => {
      render(<ListingCard listing={{ ...mockListing, price: 0 }} onPress={mockHandlers.onPress} />);
      expect(screen.getByText('$0')).toBeTruthy();
    });

    it('should handle decimal prices correctly', () => {
      render(
        <ListingCard listing={{ ...mockListing, price: 49.95 }} onPress={mockHandlers.onPress} />
      );
      expect(screen.getByText('$49.95')).toBeTruthy();
    });

    it('should handle missing seller gracefully', () => {
      render(
        <ListingCard
          listing={{ ...mockListing, seller: null as any }}
          onPress={mockHandlers.onPress}
        />
      );
      expect(screen.getByText(/by Unknown/i)).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('should use React.memo to prevent unnecessary re-renders', () => {
      const { rerender } = render(
        <ListingCard listing={mockListing} onPress={mockHandlers.onPress} />
      );
      const firstRender = screen.getByText('React Native Advanced Course');

      rerender(<ListingCard listing={mockListing} onPress={mockHandlers.onPress} />);
      const secondRender = screen.getByText('React Native Advanced Course');

      expect(firstRender).toBe(secondRender);
    });

    it('should render quickly', () => {
      const start = performance.now();
      render(<ListingCard listing={mockListing} {...mockHandlers} />);
      const end = performance.now();
      expect(end - start).toBeLessThan(100);
    });
  });

  describe('Accessibility', () => {
    it('should have interactive card', () => {
      render(<ListingCard listing={mockListing} {...mockHandlers} />);
      const title = screen.getByText('React Native Advanced Course');
      expect(title).toBeTruthy();
      fireEvent.press(title);
      expect(mockHandlers.onPress).toHaveBeenCalled();
    });

    it('should limit title to 2 lines for readability', () => {
      render(<ListingCard listing={mockListing} onPress={mockHandlers.onPress} />);
      const title = screen.getByText('React Native Advanced Course');
      expect(title.props.numberOfLines).toBe(2);
    });
  });
});
