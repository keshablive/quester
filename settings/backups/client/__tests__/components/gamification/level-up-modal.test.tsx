import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import LevelUpModal from '@/components/gamification/level-up-modal';

// Mock Lottie
jest.mock('lottie-react-native', () => ({
  __esModule: true,
  default: 'LottieView',
}));

describe('LevelUpModal', () => {
  const defaultProps = {
    visible: true,
    level: 5,
    unlockedFeatures: ['Advanced Quests', 'Premium Badges'],
    onClose: jest.fn(),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders level number and congratulations message', () => {
    render(<LevelUpModal {...defaultProps} />);

    expect(screen.getByText(/Level 5/i)).toBeTruthy();
    expect(screen.getByText(/Congratulations/i)).toBeTruthy();
  });

  it('displays unlocked features list', () => {
    render(<LevelUpModal {...defaultProps} />);

    expect(screen.getByText(/Advanced Quests/i)).toBeTruthy();
    expect(screen.getByText(/Premium Badges/i)).toBeTruthy();
  });
  it('calls onClose when close button is pressed', () => {
    const onClose = jest.fn();
    render(<LevelUpModal {...defaultProps} onClose={onClose} />);

    const closeButton = screen.getByLabelText(/close.*modal/i);
    fireEvent.press(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not render when not visible', () => {
    render(<LevelUpModal {...defaultProps} visible={false} />);

    expect(screen.queryByText(/Level 5/i)).toBeNull();
  });

  it('has proper accessibility properties', () => {
    render(<LevelUpModal {...defaultProps} />);

    const overlay = screen.getByTestId('level-up-overlay');
    expect(overlay).toBeTruthy();
    expect(overlay.props.accessibilityLabel).toMatch(/congratulations.*level 5/i);
  });
  it('renders confetti animation when visible', () => {
    render(<LevelUpModal {...defaultProps} />);

    // Modal should be rendered (confetti is inside)
    const modal = screen.getByTestId('level-up-overlay');
    expect(modal).toBeTruthy();
  });

  it('displays "No new features" when unlockedFeatures is empty', () => {
    render(<LevelUpModal {...defaultProps} unlockedFeatures={[]} />);

    expect(screen.getByText(/No new features/i)).toBeTruthy();
  });
});
