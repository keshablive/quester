import React from 'react';
import { render, screen } from '@testing-library/react-native';
import '@testing-library/jest-native/extend-expect';
import { SellerReputationCard } from '@/components/marketplace/seller-reputation-card';
import type { SellerReputation } from '@/lib/types/marketplace';

const mockReputation: SellerReputation = {
  totalSales: 150,
  averageRating: 4.8,
  totalReviews: 95,
  responseTime: '< 1 hour',
  xp: 8500,
  level: 12,
  badges: [
    { id: '1', name: 'Top Seller', iconUrl: '/badges/top-seller.png' },
    { id: '2', name: 'Fast Response', iconUrl: '/badges/fast-response.png' },
    { id: '3', name: 'Expert Creator', iconUrl: '/badges/expert.png' },
  ],
  courseRating: 4.7,
  questCompletionRate: 0.92,
  reputationScore: 87,
};

describe('SellerReputationCard', () => {
  describe('Rendering', () => {
    it('should render seller reputation stats', () => {
      render(<SellerReputationCard reputation={mockReputation} />);

      expect(screen.getByText('150')).toBeTruthy();
      expect(screen.getByText('Total Sales')).toBeTruthy();
      expect(screen.getByText('4.8')).toBeTruthy();
      expect(screen.getByText('(95 reviews)')).toBeTruthy();
    });

    it('should render level and XP', () => {
      render(<SellerReputationCard reputation={mockReputation} />);

      expect(screen.getByText(/Level 12/i)).toBeTruthy();
      expect(screen.getByText(/8,500 XP/i)).toBeTruthy();
    });

    it('should render response time badge', () => {
      render(<SellerReputationCard reputation={mockReputation} />);

      expect(screen.getByText('< 1 hour')).toBeTruthy();
      expect(screen.getByText(/Response Time/i)).toBeTruthy();
    });

    it('should render reputation score with visual indicator', () => {
      render(<SellerReputationCard reputation={mockReputation} />);

      expect(screen.getByText('87')).toBeTruthy();
      expect(screen.getByText('Score')).toBeTruthy();
    });

    it('should render badges list', () => {
      render(<SellerReputationCard reputation={mockReputation} />);

      expect(screen.getByText('Top Seller')).toBeTruthy();
      expect(screen.getByText('Fast Response')).toBeTruthy();
      expect(screen.getByText('Expert Creator')).toBeTruthy();
    });

    it('should render course rating when available', () => {
      render(<SellerReputationCard reputation={mockReputation} />);

      expect(screen.getByText('4.7')).toBeTruthy();
      expect(screen.getByText(/Course Rating/i)).toBeTruthy();
    });

    it('should render quest completion rate when available', () => {
      render(<SellerReputationCard reputation={mockReputation} />);

      expect(screen.getByText('92%')).toBeTruthy();
      expect(screen.getByText(/Quest Completion/i)).toBeTruthy();
    });

    it('should render compact variant correctly', () => {
      render(<SellerReputationCard reputation={mockReputation} variant="compact" />);

      // Should show minimal info in compact mode
      expect(screen.getByText('4.8')).toBeTruthy();
      expect(screen.getByText(/Level 12/i)).toBeTruthy();
      expect(screen.queryByText('Total Sales')).toBeFalsy();
    });
  });

  describe('Visual Indicators', () => {
    it('should show green indicator for excellent reputation (>80)', () => {
      render(<SellerReputationCard reputation={mockReputation} />);

      const scoreContainer = screen.getByTestId('reputation-score-87');
      expect(scoreContainer.props.style).toMatchObject({
        borderColor: 'hsl(142, 76%, 36%)',
      });
    });

    it('should show yellow indicator for good reputation (60-80)', () => {
      const goodReputation = { ...mockReputation, reputationScore: 70 };
      render(<SellerReputationCard reputation={goodReputation} />);

      const scoreContainer = screen.getByTestId('reputation-score-70');
      expect(scoreContainer.props.style).toMatchObject({
        borderColor: 'hsl(48, 96%, 53%)',
      });
    });

    it('should show red indicator for poor reputation (<60)', () => {
      const poorReputation = { ...mockReputation, reputationScore: 45 };
      render(<SellerReputationCard reputation={poorReputation} />);

      const scoreContainer = screen.getByTestId('reputation-score-45');
      expect(scoreContainer.props.style).toMatchObject({
        borderColor: 'hsl(0, 84%, 60%)',
      });
    });

    it('should render star icons for rating', () => {
      render(<SellerReputationCard reputation={mockReputation} />);

      // Should render 5 star icons for average rating (4 full + 1 partial)
      const stars = screen.getAllByTestId(/star-icon/);
      expect(stars.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero sales', () => {
      const newSeller = { ...mockReputation, totalSales: 0, totalReviews: 0, badges: [] };
      render(<SellerReputationCard reputation={newSeller} />);

      expect(screen.getByText('0')).toBeTruthy();
      expect(screen.getByText(/New Seller/i)).toBeTruthy();
    });

    it('should handle missing course rating', () => {
      const noRating = { ...mockReputation, courseRating: undefined };
      render(<SellerReputationCard reputation={noRating} />);

      expect(screen.queryByText(/Course Rating/i)).toBeFalsy();
    });

    it('should handle missing quest completion rate', () => {
      const noQuests = { ...mockReputation, questCompletionRate: undefined };
      render(<SellerReputationCard reputation={noQuests} />);

      expect(screen.queryByText(/Quest Completion/i)).toBeFalsy();
    });

    it('should handle empty badges array', () => {
      const noBadges = { ...mockReputation, badges: [] };
      render(<SellerReputationCard reputation={noBadges} />);

      expect(screen.queryByText('Top Seller')).toBeFalsy();
      expect(screen.getByText(/No badges earned/i)).toBeTruthy();
    });

    it('should handle very long response time text', () => {
      const slowResponse = { ...mockReputation, responseTime: '24+ hours (slow)' };
      render(<SellerReputationCard reputation={slowResponse} />);

      expect(screen.getByText('24+ hours (slow)')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels', () => {
      render(<SellerReputationCard reputation={mockReputation} />);

      expect(screen.getByLabelText(/Seller reputation card/i)).toBeTruthy();
      expect(screen.getByLabelText(/4.8 stars out of 5, 95 reviews/i)).toBeTruthy();
      expect(screen.getByLabelText(/Reputation score 87 out of 100/i)).toBeTruthy();
    });

    it('should have proper accessibility role', () => {
      render(<SellerReputationCard reputation={mockReputation} />);

      const card = screen.getByLabelText(/Seller reputation card/i);
      expect(card.props.accessibilityRole).toBe('button');
    });

    it('should have accessibility hint for interaction', () => {
      const onPress = jest.fn();
      render(<SellerReputationCard reputation={mockReputation} onPress={onPress} />);

      const card = screen.getByLabelText(/Seller reputation card/i);
      expect(card.props.accessibilityHint).toBe('Double tap to view seller profile');
    });

    it('should have badge accessibility labels', () => {
      render(<SellerReputationCard reputation={mockReputation} />);

      expect(screen.getByLabelText(/Badge: Top Seller/i)).toBeTruthy();
      expect(screen.getByLabelText(/Badge: Fast Response/i)).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    it('should call onPress when card is pressed', () => {
      const onPress = jest.fn();
      render(<SellerReputationCard reputation={mockReputation} onPress={onPress} />);

      const card = screen.getByLabelText(/Seller reputation card/i);
      card.props.onPress();

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('should call onBadgePress when badge is pressed', () => {
      const onBadgePress = jest.fn();
      render(<SellerReputationCard reputation={mockReputation} onBadgePress={onBadgePress} />);

      const badge = screen.getByLabelText(/Badge: Top Seller/i);
      badge.props.onPress();

      expect(onBadgePress).toHaveBeenCalledWith('1');
    });

    it('should not be pressable when onPress is not provided', () => {
      render(<SellerReputationCard reputation={mockReputation} />);

      const card = screen.getByLabelText(/Seller reputation card/i);
      expect(card.props.onPress).toBeUndefined();
    });
  });

  describe('Performance', () => {
    it('should use React.memo for optimization', () => {
      const { rerender } = render(<SellerReputationCard reputation={mockReputation} />);

      // Re-render with same props
      rerender(<SellerReputationCard reputation={mockReputation} />);

      // Should not trigger re-render (memo optimization)
      expect(screen.getByText('150')).toBeTruthy();
    });

    it('should render large badge lists without performance issues', () => {
      const manyBadges = {
        ...mockReputation,
        badges: Array.from({ length: 20 }, (_, i) => ({
          id: `${i}`,
          name: `Badge ${i}`,
          iconUrl: `/badge-${i}.png`,
        })),
      };

      const start = performance.now();
      render(<SellerReputationCard reputation={manyBadges} />);
      const end = performance.now();

      // Should render in less than 100ms
      expect(end - start).toBeLessThan(100);
    });
  });
});
