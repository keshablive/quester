import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { GamificationProvider, useGamification } from '@/lib/contexts/gamification-context';

const Consumer = ({ userId }: { userId: string }) => {
  const { metrics, incrementPoints, awardBadge } = useGamification();

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      // perform some actions and rely on provider refresh to update metrics
      await incrementPoints(7);
      await awardBadge('context-badge');
      // force update via metrics change in provider
      if (!mounted) return;
    })();
    return () => {
      mounted = false;
    };
  }, [incrementPoints, awardBadge, userId]);

  return (
    // Render metrics JSON to test-id
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - RN Text not required for test
    <div testID="metrics">{metrics ? JSON.stringify(metrics) : 'loading'}</div>
  );
};

describe('GamificationContext', () => {
  it('provides metrics and actions to consumers', async () => {
    const userId = 'ctx-user-1';
    const tree = render(
      <GamificationProvider userId={userId}>
        <Consumer userId={userId} />
      </GamificationProvider>
    );

    await waitFor(() => expect(tree.queryByTestId('metrics')).toBeTruthy());

    await waitFor(() => {
      const node = tree.getByTestId('metrics');
      const text = node.props.children;
      // after actions, metrics should include points and the badge
      expect(text).toContain('context-badge');
      expect(text).toContain('7');
    });
  });
});
