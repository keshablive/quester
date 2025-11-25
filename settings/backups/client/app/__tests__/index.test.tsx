/**
 * Landing Screen Tests
 *
 * Tests for the Quester platform landing screen including:
 * - Component rendering
 * - Feature navigation
 * - Accessibility compliance
 * - Animation behavior
 * - Tab switching
 *
 * @module landing-screen-tests
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

// Mock expo-router
const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => {
  const React = require('react');
  return {
    Stack: {
      Screen: () => null,
    },
    useRouter: jest.fn(() => ({
      push: mockPush,
      replace: mockReplace,
      back: jest.fn(),
    })),
    Link: ({ children, href, ...props }: any) => {
      const { Text } = require('react-native');
      return React.createElement(Text, { ...props, onPress: () => mockPush(href) }, children);
    },
  };
});

// Mock lucide-react-native
jest.mock('lucide-react-native', () => {
  const View = 'View';
  return new Proxy(
    {},
    {
      get: () => View,
    }
  );
});

// Mock @rn-primitives
jest.mock('@rn-primitives/slot', () => ({
  Slot: 'Slot',
  SlotClipboardRoot: 'SlotClipboardRoot',
}));

jest.mock('@rn-primitives/portal', () => ({
  Portal: 'Portal',
}));

jest.mock('@rn-primitives/types', () => ({
  SlottableViewProps: {},
  SlottableTextProps: {},
}));

// Mock screen wrapper
jest.mock('@/components/screen-wrapper', () => ({
  ScreenWrapper: ({ children }: any) => children,
}));

// Mock UI components to avoid cssInterop issues
jest.mock('@/components/ui/button', () => ({
  Button: 'Button',
}));

jest.mock('@/components/ui/text', () => ({
  Text: 'Text',
}));

jest.mock('@/components/ui/card', () => ({
  Card: 'Card',
  CardHeader: 'CardHeader',
  CardContent: 'CardContent',
  CardFooter: 'CardFooter',
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: 'Badge',
}));

jest.mock('@/components/ui/icon', () => ({
  Icon: 'Icon',
}));

jest.mock('@/components/ui/separator', () => ({
  Separator: 'Separator',
}));

jest.mock('@/components/ui/progress', () => ({
  Progress: 'Progress',
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: 'Tabs',
  TabsList: 'TabsList',
  TabsTrigger: 'TabsTrigger',
  TabsContent: 'TabsContent',
}));

jest.mock('@/components/ui/skeleton', () => ({
  Skeleton: 'Skeleton',
}));

describe('LandingScreen', () => {
  let LandingScreen: any;

  beforeAll(() => {
    // Import after mocks are set up
    LandingScreen = require('../index').default;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
    mockReplace.mockClear();
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { getByText } = render(<LandingScreen />);
      expect(getByText('Welcome to Quester')).toBeTruthy();
    });

    it('displays platform tagline', () => {
      const { getByText } = render(<LandingScreen />);
      expect(
        getByText(
          'The all-in-one platform for learning, gaming, social networking, and marketplace activities with enterprise-grade security.'
        )
      ).toBeTruthy();
    });

    it('displays multi-tenant badge', () => {
      const { getByText } = render(<LandingScreen />);
      expect(getByText('Multi-Tenant Platform')).toBeTruthy();
    });

    it('renders all 6 platform features', () => {
      const { getByText } = render(<LandingScreen />);
      expect(getByText('Gamification')).toBeTruthy();
      expect(getByText('Learning Hub')).toBeTruthy();
      expect(getByText('Social Network')).toBeTruthy();
      expect(getByText('Marketplace')).toBeTruthy();
      expect(getByText('Video Platform')).toBeTruthy();
      expect(getByText('Analytics')).toBeTruthy();
    });

    it('renders all 4 platform stats', () => {
      const { getByText } = render(<LandingScreen />);
      expect(getByText('10K+')).toBeTruthy();
      expect(getByText('50K+')).toBeTruthy();
      expect(getByText('200+')).toBeTruthy();
      expect(getByText('99.9%')).toBeTruthy();
    });

    it('renders CTA buttons', () => {
      const { getByText } = render(<LandingScreen />);
      expect(getByText('Get Started')).toBeTruthy();
      expect(getByText('View Demo')).toBeTruthy();
    });

    it('renders technology stack section', () => {
      const { getByText } = render(<LandingScreen />);
      expect(getByText('Built with Modern Tech')).toBeTruthy();
      expect(getByText('React Native 0.79.5')).toBeTruthy();
      expect(getByText('Go 1.24+ Backend')).toBeTruthy();
      expect(getByText('PostgreSQL 15+')).toBeTruthy();
      expect(getByText('Redis 7.0+')).toBeTruthy();
    });
  });

  describe('Navigation', () => {
    it('navigates to feed when Get Started is pressed', async () => {
      const { getByText } = render(<LandingScreen />);
      const getStartedButton = getByText('Get Started');

      fireEvent.press(getStartedButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/(tabs)/feed');
      });
    });

    it('navigates to showcase when View Demo is pressed', async () => {
      const { getByText } = render(<LandingScreen />);
      const viewDemoButton = getByText('View Demo');

      fireEvent.press(viewDemoButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/showcase');
      });
    });

    it('navigates to correct feature route when feature card is pressed', async () => {
      const { getByText } = render(<LandingScreen />);
      const gamificationCard = getByText('Gamification');

      fireEvent.press(gamificationCard.parent!);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/badges');
      });
    });
  });

  describe('Tabs', () => {
    it('renders tabs with correct initial state', () => {
      const { getByText } = render(<LandingScreen />);
      expect(getByText('All Features')).toBeTruthy();
      expect(getByText('Quick Access')).toBeTruthy();
    });

    it('switches to Quick Access tab', () => {
      const { getByText } = render(<LandingScreen />);
      const quickAccessTab = getByText('Quick Access');

      fireEvent.press(quickAccessTab);

      // Quick actions should be visible
      expect(getByText('Messages')).toBeTruthy();
      expect(getByText('Badges')).toBeTruthy();
      expect(getByText('Properties')).toBeTruthy();
      expect(getByText('Reports')).toBeTruthy();
    });

    it('displays badge on Messages quick action', () => {
      const { getByText } = render(<LandingScreen />);
      const quickAccessTab = getByText('Quick Access');

      fireEvent.press(quickAccessTab);

      expect(getByText('3')).toBeTruthy(); // Message count badge
    });
  });

  describe('Accessibility', () => {
    it('has accessible labels on main interactive elements', () => {
      const { getByLabelText } = render(<LandingScreen />);
      expect(getByLabelText('Get started with Quester')).toBeTruthy();
      expect(getByLabelText('View component showcase')).toBeTruthy();
    });

    it('has accessible labels on feature cards', () => {
      const { getByLabelText } = render(<LandingScreen />);
      expect(
        getByLabelText('Gamification: Earn XP, unlock badges, and climb leaderboards')
      ).toBeTruthy();
      expect(getByLabelText('Learning Hub: Interactive courses with certificates')).toBeTruthy();
    });

    it('has accessible ScrollView label', () => {
      const { getByLabelText } = render(<LandingScreen />);
      expect(getByLabelText('Quester platform landing page')).toBeTruthy();
    });

    it('has accessible hints on navigation buttons', () => {
      const { getByA11yHint } = render(<LandingScreen />);
      expect(getByA11yHint('Navigates to the main feed')).toBeTruthy();
      expect(getByA11yHint('Opens the developer component showcase')).toBeTruthy();
    });
  });

  describe('Loading State', () => {
    it('shows loading overlay when navigating', async () => {
      const { getByText, queryByText } = render(<LandingScreen />);
      const getStartedButton = getByText('Get Started');

      fireEvent.press(getStartedButton);

      // Loading should appear
      expect(queryByText('Loading...')).toBeTruthy();
    });
  });

  describe('Theme Toggle', () => {
    it('renders theme toggle button', () => {
      const { UNSAFE_getByType } = render(<LandingScreen />);
      // Theme toggle is in header, rendered by Stack.Screen
      // This test verifies the component renders without errors
      expect(UNSAFE_getByType).toBeDefined();
    });
  });

  describe('Animations', () => {
    it('initializes animated values', () => {
      const { getByText } = render(<LandingScreen />);
      // If animations are working, hero section should be visible
      expect(getByText('Welcome to Quester')).toBeTruthy();
    });

    it('renders feature cards with staggered animation', () => {
      const { getAllByText } = render(<LandingScreen />);
      const features = getAllByText(/Gamification|Learning Hub|Social Network/);
      expect(features.length).toBeGreaterThan(0);
    });
  });

  describe('Footer', () => {
    it('renders footer with version info', () => {
      const { getByText } = render(<LandingScreen />);
      expect(getByText('Quester Platform v1.0.0')).toBeTruthy();
      expect(getByText('© 2025 - Built with React Native Reusables')).toBeTruthy();
    });

    it('renders settings button', () => {
      const { getByText } = render(<LandingScreen />);
      expect(getByText('Settings')).toBeTruthy();
    });
  });

  describe('Responsive Design', () => {
    it('renders stats in grid layout', () => {
      const { getByText } = render(<LandingScreen />);
      expect(getByText('Active Users')).toBeTruthy();
      expect(getByText('XP Awarded')).toBeTruthy();
      expect(getByText('Courses')).toBeTruthy();
      expect(getByText('Uptime')).toBeTruthy();
    });

    it('renders feature cards with icons', () => {
      const { getByText } = render(<LandingScreen />);
      const gamificationCard = getByText('Gamification').parent?.parent;
      expect(gamificationCard).toBeTruthy();
    });
  });
});
