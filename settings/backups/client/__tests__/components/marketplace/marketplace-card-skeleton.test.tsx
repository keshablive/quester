/**
 * MarketplaceCardSkeleton Component Tests
 *
 * Comprehensive tests for the MarketplaceCardSkeleton component covering:
 * - Grid variant rendering
 * - List variant rendering
 * - Skeleton element structure
 * - MarketplaceListSkeleton with multiple cards
 * - Edge cases
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import {
  MarketplaceCardSkeleton,
  MarketplaceListSkeleton,
} from '@/components/marketplace/marketplace-card-skeleton';

describe('MarketplaceCardSkeleton', () => {
  // ============================================================================
  // Grid Variant Tests
  // ============================================================================

  describe('Grid Variant', () => {
    it('should render grid variant by default', () => {
      render(<MarketplaceCardSkeleton />);

      expect(screen.getByTestId('skeleton-card')).toBeTruthy();
    });

    it('should render image skeleton in grid variant', () => {
      render(<MarketplaceCardSkeleton variant="grid" />);

      const imageSkeleton = screen.getByTestId('skeleton-image');
      expect(imageSkeleton).toBeTruthy();
    });

    it('should render title skeleton in grid variant', () => {
      render(<MarketplaceCardSkeleton variant="grid" />);

      const titleSkeleton = screen.getByTestId('skeleton-title');
      expect(titleSkeleton).toBeTruthy();
    });

    it('should render price skeleton in grid variant', () => {
      render(<MarketplaceCardSkeleton variant="grid" />);

      const priceSkeleton = screen.getByTestId('skeleton-price');
      expect(priceSkeleton).toBeTruthy();
    });

    it('should render seller info skeleton in grid variant', () => {
      render(<MarketplaceCardSkeleton variant="grid" />);

      const avatarSkeleton = screen.getByTestId('skeleton-avatar');
      const sellerSkeleton = screen.getByTestId('skeleton-seller');

      expect(avatarSkeleton).toBeTruthy();
      expect(sellerSkeleton).toBeTruthy();
    });

    it('should apply custom className to grid variant', () => {
      render(<MarketplaceCardSkeleton variant="grid" className="custom-class" />);

      const card = screen.getByTestId('skeleton-card');
      expect(card.props.className).toContain('custom-class');
    });
  });

  // ============================================================================
  // List Variant Tests
  // ============================================================================

  describe('List Variant', () => {
    it('should render list variant', () => {
      render(<MarketplaceCardSkeleton variant="list" />);

      expect(screen.getByTestId('skeleton-card-list')).toBeTruthy();
    });

    it('should render image skeleton in list variant', () => {
      render(<MarketplaceCardSkeleton variant="list" />);

      const imageSkeleton = screen.getByTestId('skeleton-image-list');
      expect(imageSkeleton).toBeTruthy();
    });

    it('should render title skeleton in list variant', () => {
      render(<MarketplaceCardSkeleton variant="list" />);

      const titleSkeleton = screen.getByTestId('skeleton-title-list');
      expect(titleSkeleton).toBeTruthy();
    });

    it('should render price skeleton in list variant', () => {
      render(<MarketplaceCardSkeleton variant="list" />);

      const priceSkeleton = screen.getByTestId('skeleton-price-list');
      expect(priceSkeleton).toBeTruthy();
    });

    it('should render metadata skeletons in list variant', () => {
      render(<MarketplaceCardSkeleton variant="list" />);

      const metadataSkeletons = screen.getAllByTestId(/skeleton-metadata-/);
      expect(metadataSkeletons.length).toBeGreaterThan(0);
    });

    it('should apply custom className to list variant', () => {
      render(<MarketplaceCardSkeleton variant="list" className="custom-list-class" />);

      const card = screen.getByTestId('skeleton-card-list');
      expect(card.props.className).toContain('custom-list-class');
    });

    it('should use horizontal layout in list variant', () => {
      render(<MarketplaceCardSkeleton variant="list" />);

      const content = screen.getByTestId('skeleton-list-content');
      expect(content.props.className).toContain('flex-row');
    });
  });

  // ============================================================================
  // Skeleton Structure Tests
  // ============================================================================

  describe('Skeleton Structure', () => {
    it('should render Card component wrapper', () => {
      render(<MarketplaceCardSkeleton />);

      expect(screen.getByTestId('skeleton-card')).toBeTruthy();
    });

    it('should render CardContent component', () => {
      render(<MarketplaceCardSkeleton />);

      expect(screen.getByTestId('skeleton-card-content')).toBeTruthy();
    });

    it('should render all required skeleton elements', () => {
      render(<MarketplaceCardSkeleton variant="grid" />);

      expect(screen.getByTestId('skeleton-image')).toBeTruthy();
      expect(screen.getByTestId('skeleton-title')).toBeTruthy();
      expect(screen.getByTestId('skeleton-price')).toBeTruthy();
      expect(screen.getByTestId('skeleton-avatar')).toBeTruthy();
      expect(screen.getByTestId('skeleton-seller')).toBeTruthy();
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle missing className prop', () => {
      expect(() => render(<MarketplaceCardSkeleton />)).not.toThrow();
    });

    it('should handle missing variant prop', () => {
      expect(() => render(<MarketplaceCardSkeleton />)).not.toThrow();
    });

    it('should handle empty className', () => {
      expect(() => render(<MarketplaceCardSkeleton className="" />)).not.toThrow();
    });

    it('should handle rapid variant changes', () => {
      const { rerender } = render(<MarketplaceCardSkeleton variant="grid" />);

      for (let i = 0; i < 10; i++) {
        rerender(<MarketplaceCardSkeleton variant={i % 2 === 0 ? 'grid' : 'list'} />);
      }

      expect(screen.getByTestId(/skeleton-card/)).toBeTruthy();
    });
  });

  // ============================================================================
  // Accessibility Tests
  // ============================================================================

  describe('Accessibility', () => {
    it('should have accessible structure for grid variant', () => {
      render(<MarketplaceCardSkeleton variant="grid" />);

      const card = screen.getByTestId('skeleton-card');
      expect(card.props.accessibilityLabel).toBe('Loading marketplace item');
    });

    it('should have accessible structure for list variant', () => {
      render(<MarketplaceCardSkeleton variant="list" />);

      const card = screen.getByTestId('skeleton-card-list');
      expect(card.props.accessibilityLabel).toBe('Loading marketplace item');
    });

    it('should mark skeleton as busy for screen readers', () => {
      render(<MarketplaceCardSkeleton />);

      const card = screen.getByTestId('skeleton-card');
      expect(card.props.accessibilityState).toEqual({ busy: true });
    });
  });

  // ============================================================================
  // Performance Tests
  // ============================================================================

  describe('Performance', () => {
    it('should render within acceptable time', () => {
      const startTime = Date.now();
      render(<MarketplaceCardSkeleton />);
      const renderTime = Date.now() - startTime;

      expect(renderTime).toBeLessThan(50);
    });

    it('should handle multiple rapid renders', () => {
      const { rerender } = render(<MarketplaceCardSkeleton />);

      for (let i = 0; i < 20; i++) {
        rerender(<MarketplaceCardSkeleton variant={i % 2 === 0 ? 'grid' : 'list'} />);
      }

      expect(screen.getByTestId(/skeleton-card/)).toBeTruthy();
    });
  });
});

// ============================================================================
// MarketplaceListSkeleton Tests
// ============================================================================

describe('MarketplaceListSkeleton', () => {
  describe('Grid Variant', () => {
    it('should render default count of 6 cards', () => {
      render(<MarketplaceListSkeleton variant="grid" />);

      const cards = screen.getAllByTestId('skeleton-card');
      expect(cards).toHaveLength(6);
    });

    it('should render custom count of cards', () => {
      render(<MarketplaceListSkeleton variant="grid" count={10} />);

      const cards = screen.getAllByTestId('skeleton-card');
      expect(cards).toHaveLength(10);
    });

    it('should render cards in grid layout', () => {
      render(<MarketplaceListSkeleton variant="grid" />);

      const container = screen.getByTestId('skeleton-list-container');
      expect(container.props.className).toContain('flex-row');
      expect(container.props.className).toContain('flex-wrap');
    });

    it('should render single card', () => {
      render(<MarketplaceListSkeleton variant="grid" count={1} />);

      const cards = screen.getAllByTestId('skeleton-card');
      expect(cards).toHaveLength(1);
    });

    it('should render large number of cards', () => {
      render(<MarketplaceListSkeleton variant="grid" count={50} />);

      const cards = screen.getAllByTestId('skeleton-card');
      expect(cards).toHaveLength(50);
    });
  });

  describe('List Variant', () => {
    it('should render default count of 6 cards', () => {
      render(<MarketplaceListSkeleton variant="list" />);

      const cards = screen.getAllByTestId('skeleton-card-list');
      expect(cards).toHaveLength(6);
    });

    it('should render custom count of cards', () => {
      render(<MarketplaceListSkeleton variant="list" count={8} />);

      const cards = screen.getAllByTestId('skeleton-card-list');
      expect(cards).toHaveLength(8);
    });

    it('should render cards in vertical layout', () => {
      render(<MarketplaceListSkeleton variant="list" />);

      const container = screen.getByTestId('skeleton-list-container');
      expect(container.props.className).not.toContain('flex-row');
    });

    it('should render single card', () => {
      render(<MarketplaceListSkeleton variant="list" count={1} />);

      const cards = screen.getAllByTestId('skeleton-card-list');
      expect(cards).toHaveLength(1);
    });
  });

  describe('Default Behavior', () => {
    it('should use grid variant by default', () => {
      render(<MarketplaceListSkeleton />);

      const cards = screen.getAllByTestId('skeleton-card');
      expect(cards).toHaveLength(6);
    });

    it('should render 6 cards by default', () => {
      render(<MarketplaceListSkeleton />);

      const cards = screen.getAllByTestId('skeleton-card');
      expect(cards).toHaveLength(6);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero count', () => {
      render(<MarketplaceListSkeleton count={0} />);

      const cards = screen.queryAllByTestId('skeleton-card');
      expect(cards).toHaveLength(0);
    });

    it('should handle negative count', () => {
      render(<MarketplaceListSkeleton count={-1} />);

      const cards = screen.queryAllByTestId('skeleton-card');
      expect(cards).toHaveLength(0);
    });

    it('should handle very large count', () => {
      const largeCount = 100;
      render(<MarketplaceListSkeleton count={largeCount} />);

      const cards = screen.getAllByTestId('skeleton-card');
      expect(cards).toHaveLength(largeCount);
    });

    it('should handle rapid count changes', () => {
      const { rerender } = render(<MarketplaceListSkeleton count={5} />);

      rerender(<MarketplaceListSkeleton count={10} />);
      expect(screen.getAllByTestId('skeleton-card')).toHaveLength(10);

      rerender(<MarketplaceListSkeleton count={3} />);
      expect(screen.getAllByTestId('skeleton-card')).toHaveLength(3);
    });

    it('should handle rapid variant changes', () => {
      const { rerender } = render(<MarketplaceListSkeleton variant="grid" />);

      for (let i = 0; i < 10; i++) {
        rerender(<MarketplaceListSkeleton variant={i % 2 === 0 ? 'grid' : 'list'} />);
      }

      expect(screen.getAllByTestId(/skeleton-card/)).toHaveLength(6);
    });
  });

  describe('Accessibility', () => {
    it('should have accessible container', () => {
      render(<MarketplaceListSkeleton />);

      const container = screen.getByTestId('skeleton-list-container');
      expect(container.props.accessibilityLabel).toBe('Loading marketplace items');
    });

    it('should mark all cards as loading', () => {
      render(<MarketplaceListSkeleton count={3} />);

      const cards = screen.getAllByTestId('skeleton-card');
      cards.forEach((card) => {
        expect(card.props.accessibilityState).toEqual({ busy: true });
      });
    });

    it('should have accessible role for container', () => {
      render(<MarketplaceListSkeleton />);

      const container = screen.getByTestId('skeleton-list-container');
      expect(container.props.accessibilityRole).toBe('list');
    });
  });

  describe('Performance', () => {
    it('should render within acceptable time for default count', () => {
      const startTime = Date.now();
      render(<MarketplaceListSkeleton />);
      const renderTime = Date.now() - startTime;

      expect(renderTime).toBeLessThan(100);
    });

    it('should render within acceptable time for large count', () => {
      const startTime = Date.now();
      render(<MarketplaceListSkeleton count={50} />);
      const renderTime = Date.now() - startTime;

      expect(renderTime).toBeLessThan(500);
    });

    it('should handle multiple rapid rerenders', () => {
      const { rerender } = render(<MarketplaceListSkeleton count={5} />);

      for (let i = 0; i < 20; i++) {
        rerender(
          <MarketplaceListSkeleton count={5 + (i % 5)} variant={i % 2 === 0 ? 'grid' : 'list'} />
        );
      }

      expect(screen.getAllByTestId(/skeleton-card/)).toBeTruthy();
    });
  });

  describe('Integration', () => {
    it('should work with grid variant and custom count', () => {
      render(<MarketplaceListSkeleton variant="grid" count={9} />);

      const cards = screen.getAllByTestId('skeleton-card');
      expect(cards).toHaveLength(9);

      const container = screen.getByTestId('skeleton-list-container');
      expect(container.props.className).toContain('flex-row');
    });

    it('should work with list variant and custom count', () => {
      render(<MarketplaceListSkeleton variant="list" count={4} />);

      const cards = screen.getAllByTestId('skeleton-card-list');
      expect(cards).toHaveLength(4);
    });
  });
});
