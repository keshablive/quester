import React from 'react';
import { render } from '@testing-library/react-native';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Text, View } from 'react-native';

const ThrowingComponent = () => {
  throw new Error('Test error');
};

const SafeComponent = () => {
  return (
    <View testID="safe-child">
      <Text>Safe content</Text>
    </View>
  );
};

describe('ScreenWrapper', () => {
  it('renders children when no error occurs', () => {
    const tree = render(
      <ScreenWrapper screenName="TestScreen">
        <SafeComponent />
      </ScreenWrapper>
    );

    expect(tree.getByTestId('safe-child')).toBeTruthy();
  });

  it('catches render errors and displays error boundary fallback', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = jest.fn();

    const tree = render(
      <ScreenWrapper screenName="TestScreen">
        <ThrowingComponent />
      </ScreenWrapper>
    );

    // Should render error boundary fallback instead of children
    expect(tree.queryByTestId('safe-child')).toBeNull();
    // Check for error boundary UI (we'll add testID in implementation)
    expect(tree.queryByTestId('error-boundary-fallback')).toBeTruthy();

    console.error = originalError;
  });

  it('provides accessibility props to wrapper', () => {
    const tree = render(
      <ScreenWrapper screenName="TestScreen">
        <SafeComponent />
      </ScreenWrapper>
    );

    const wrapper = tree.getByTestId('screen-wrapper');
    expect(wrapper.props.accessibilityRole).toBe('none');
    expect(wrapper.props.accessibilityLabel).toContain('TestScreen');
  });
});
