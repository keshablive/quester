import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { XPGainAnimation } from '@/components/gamification/xp-gain-animation';

describe('XPGainAnimation', () => {
  it('renders XP gain amount', () => {
    const tree = render(<XPGainAnimation amount={50} source="quest_completion" visible={true} />);
    expect(tree.getByText('+50 XP')).toBeTruthy();
  });

  it('renders source description', () => {
    const tree = render(<XPGainAnimation amount={25} source="lesson_completion" visible={true} />);
    expect(tree.getByText('Lesson Completion')).toBeTruthy();
  });

  it('does not render when not visible', () => {
    const tree = render(<XPGainAnimation amount={50} source="quest_completion" visible={false} />);
    expect(tree.queryByText('+50 XP')).toBeNull();
  });

  it('calls onComplete after animation duration', async () => {
    const onComplete = jest.fn();
    render(
      <XPGainAnimation
        amount={50}
        source="quest_completion"
        visible={true}
        duration={100}
        onComplete={onComplete}
      />
    );

    await waitFor(() => expect(onComplete).toHaveBeenCalled(), { timeout: 200 });
  });

  it('has proper accessibility announcement', () => {
    const tree = render(<XPGainAnimation amount={50} source="quest_completion" visible={true} />);
    const container = tree.getByTestId('xp-animation-container');
    expect(container.props.accessibilityLabel).toContain('Gained 50 experience points');
  });
});
