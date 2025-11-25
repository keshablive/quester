import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { OfflineProvider, useOffline } from '@/lib/contexts/offline-context';
import { Text, View } from 'react-native';

const Consumer = () => {
  const { queueLength, queueOperation, clearQueue, isOnline } = useOffline();
  const [queued, setQueued] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      if (!queued) {
        await queueOperation({ type: 'test-op', payload: { value: 42 } });
        setQueued(true);
      }
    })();
  }, [queued, queueOperation]);

  return (
    <View testID="consumer">
      <Text testID="queue-length">{queueLength}</Text>
      <Text testID="online-status">{isOnline ? 'online' : 'offline'}</Text>
    </View>
  );
};

describe('OfflineContext', () => {
  it('provides queue length and operations to consumers', async () => {
    const tree = render(
      <OfflineProvider>
        <Consumer />
      </OfflineProvider>
    );

    await waitFor(() => expect(tree.queryByTestId('queue-length')).toBeTruthy());

    // After the consumer queues an operation, queueLength should be 1
    await waitFor(
      () => {
        const lengthNode = tree.getByTestId('queue-length');
        expect(lengthNode.props.children).toBe(1);
      },
      { timeout: 1000 }
    );
  });
});
