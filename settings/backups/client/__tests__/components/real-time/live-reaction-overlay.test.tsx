/**
 * LiveReactionOverlay Component Tests (T150)
 * Feature 003: Real-Time Collaboration
 * Phase 9 US7: Real-Time Collaboration & Social Engagement
 *
 * Tests for live reaction overlay including:
 * - Rendering reactions
 * - Float animations
 * - Multiple simultaneous reactions
 * - Auto-removal after animation
 * - Reaction types (heart, thumbsup, clap, fire, star)
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { LiveReactionOverlay } from '@/components/real-time/live-reaction-overlay';
import { LiveReaction } from '@/lib/types/real-time';

describe('LiveReactionOverlay', () => {
  beforeEach(() => {
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const mockReaction: LiveReaction = {
    id: 'reaction-1',
    type: 'heart',
    userId: 'user-1',
    timestamp: Date.now(),
    x: 0.5,
    y: 0.8,
  };

  describe('Rendering', () => {
    test('should render reaction overlay container', () => {
      const { toJSON } = render(<LiveReactionOverlay reactions={[mockReaction]} />);
      expect(toJSON()).toBeTruthy();
    });

    test('should render heart emoji for heart reaction', () => {
      const { toJSON } = render(<LiveReactionOverlay reactions={[mockReaction]} />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('❤️');
    });

    test('should render thumbsup emoji for thumbsup reaction', () => {
      const reaction = { ...mockReaction, type: 'thumbsup' as const };
      const { toJSON } = render(<LiveReactionOverlay reactions={[reaction]} />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('👍');
    });

    test('should render clap emoji for clap reaction', () => {
      const reaction = { ...mockReaction, type: 'clap' as const };
      const { toJSON } = render(<LiveReactionOverlay reactions={[reaction]} />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('👏');
    });

    test('should render fire emoji for fire reaction', () => {
      const reaction = { ...mockReaction, type: 'fire' as const };
      const { toJSON } = render(<LiveReactionOverlay reactions={[reaction]} />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('🔥');
    });

    test('should render star emoji for star reaction', () => {
      const reaction = { ...mockReaction, type: 'star' as const };
      const { toJSON } = render(<LiveReactionOverlay reactions={[reaction]} />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('⭐');
    });
  });

  describe('Multiple Reactions', () => {
    test('should render multiple reactions simultaneously', () => {
      const reactions: LiveReaction[] = [
        { ...mockReaction, id: 'r1', x: 0.3 },
        { ...mockReaction, id: 'r2', type: 'thumbsup', x: 0.5 },
        { ...mockReaction, id: 'r3', type: 'fire', x: 0.7 },
      ];

      const { toJSON } = render(<LiveReactionOverlay reactions={reactions} />);
      const json = JSON.stringify(toJSON());

      expect(json).toContain('❤️');
      expect(json).toContain('👍');
      expect(json).toContain('🔥');
    });

    test('should handle many reactions at once', () => {
      const reactions: LiveReaction[] = Array.from({ length: 10 }, (_, i) => ({
        ...mockReaction,
        id: `reaction-${i}`,
        x: i / 10,
      }));

      const { toJSON } = render(<LiveReactionOverlay reactions={reactions} />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Auto-removal', () => {
    test('should call onReactionComplete after animation duration', () => {
      const onComplete = jest.fn();
      render(
        <LiveReactionOverlay
          reactions={[mockReaction]}
          animationDuration={3000}
          onReactionComplete={onComplete}
        />
      );

      expect(onComplete).not.toHaveBeenCalled();

      jest.advanceTimersByTime(3000);
      expect(onComplete).toHaveBeenCalledWith('reaction-1');
    });

    test('should call onReactionComplete for each reaction', () => {
      const onComplete = jest.fn();
      const reactions: LiveReaction[] = [
        { ...mockReaction, id: 'r1' },
        { ...mockReaction, id: 'r2' },
      ];

      render(<LiveReactionOverlay reactions={reactions} onReactionComplete={onComplete} />);

      jest.advanceTimersByTime(3000);

      expect(onComplete).toHaveBeenCalledTimes(2);
      expect(onComplete).toHaveBeenCalledWith('r1');
      expect(onComplete).toHaveBeenCalledWith('r2');
    });

    test('should use custom animation duration', () => {
      const onComplete = jest.fn();
      render(
        <LiveReactionOverlay
          reactions={[mockReaction]}
          animationDuration={5000}
          onReactionComplete={onComplete}
        />
      );

      // Animation completes at 5000ms, check that it's called by then
      jest.advanceTimersByTime(5000);
      expect(onComplete).toHaveBeenCalledWith('reaction-1');
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('Empty State', () => {
    test('should render overlay container even when reactions array is empty', () => {
      const { toJSON } = render(<LiveReactionOverlay reactions={[]} />);
      expect(toJSON()).toBeTruthy();
    });

    test('should handle transition from reactions to empty', () => {
      const { rerender, toJSON } = render(<LiveReactionOverlay reactions={[mockReaction]} />);

      let json = JSON.stringify(toJSON());
      expect(json).toContain('❤️');

      rerender(<LiveReactionOverlay reactions={[]} />);

      json = JSON.stringify(toJSON());
      expect(json).not.toContain('❤️');
    });
  });

  describe('Accessibility', () => {
    test('should have correct accessibility props', () => {
      const { toJSON } = render(<LiveReactionOverlay reactions={[mockReaction]} />);
      const json = toJSON();

      // Check root has accessibility props
      expect(json).toHaveProperty('props.accessibilityRole', 'none');
      expect(json).toHaveProperty('props.importantForAccessibility', 'no-hide-descendants');
      expect(json).toHaveProperty('props.accessibilityLabel', 'Live reactions overlay');
    });
  });

  describe('Edge Cases', () => {
    test('should handle reactions with same timestamp', () => {
      const timestamp = Date.now();
      const reactions: LiveReaction[] = [
        { ...mockReaction, id: 'r1', timestamp },
        { ...mockReaction, id: 'r2', timestamp },
        { ...mockReaction, id: 'r3', timestamp },
      ];

      const { toJSON } = render(<LiveReactionOverlay reactions={reactions} />);
      expect(toJSON()).toBeTruthy();
    });

    test('should handle invalid x coordinates gracefully', () => {
      const reactions: LiveReaction[] = [
        { ...mockReaction, id: 'r1', x: -0.5 },
        { ...mockReaction, id: 'r2', x: 1.5 },
      ];

      const { toJSON } = render(<LiveReactionOverlay reactions={reactions} />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Styling', () => {
    test('should apply custom className', () => {
      const { toJSON } = render(
        <LiveReactionOverlay reactions={[mockReaction]} className="custom-class" />
      );

      const json = toJSON();
      expect(json).toHaveProperty('props.className');
      expect(json?.props.className).toContain('custom-class');
    });
  });
});
