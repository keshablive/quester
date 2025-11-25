import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { RealTimeProvider, useRealTime } from '@/lib/contexts/real-time-context';
import { Text, View } from 'react-native';

const Consumer = () => {
  const { status, on, emit } = useRealTime();
  const [lastMessage, setLastMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    const callback = (data: any) => {
      setLastMessage(data.text);
    };
    on('test-event', callback);

    // Simulate emitting an event
    setTimeout(() => {
      emit('test-event', { text: 'hello from test' });
    }, 100);

    return () => {
      // cleanup if needed
    };
  }, [on, emit]);

  return (
    <View testID="consumer">
      <Text testID="status">{status}</Text>
      <Text testID="message">{lastMessage || 'none'}</Text>
    </View>
  );
};

describe('RealTimeContext', () => {
  it('provides WebSocketService status and event APIs to consumers', async () => {
    const tree = render(
      <RealTimeProvider wsUrl="ws://test:8080">
        <Consumer />
      </RealTimeProvider>
    );

    await waitFor(() => expect(tree.queryByTestId('status')).toBeTruthy());

    const statusNode = tree.getByTestId('status');
    // Initially disconnected or connected (depends on mock behavior)
    expect(['disconnected', 'connected', 'connecting']).toContain(statusNode.props.children);

    // Wait for the emitted event to be received
    await waitFor(
      () => {
        const messageNode = tree.getByTestId('message');
        expect(messageNode.props.children).toBe('hello from test');
      },
      { timeout: 500 }
    );
  });
});
