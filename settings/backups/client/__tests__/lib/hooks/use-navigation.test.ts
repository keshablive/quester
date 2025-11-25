import { renderHook, act } from '@testing-library/react-native';
import { useNavigation } from '@/lib/hooks/use-navigation';

describe('useNavigation', () => {
  it('initializes with default notification counts', () => {
    const { result } = renderHook(() => useNavigation());

    expect(result.current.notificationCounts).toEqual({
      quests: 0,
      learning: 0,
      marketplace: 0,
      social: 0,
      messages: 0,
    });
  });

  it('updates notification count for a feature', () => {
    const { result } = renderHook(() => useNavigation());

    act(() => {
      result.current.setNotificationCount('quests', 5);
    });

    expect(result.current.notificationCounts.quests).toBe(5);
  });

  it('tracks current feature', () => {
    const { result } = renderHook(() => useNavigation());

    act(() => {
      result.current.setCurrentFeature('learning');
    });

    expect(result.current.currentFeature).toBe('learning');
  });

  it('clears notification count for a feature', () => {
    const { result } = renderHook(() => useNavigation());

    act(() => {
      result.current.setNotificationCount('marketplace', 10);
      result.current.clearNotificationCount('marketplace');
    });

    expect(result.current.notificationCounts.marketplace).toBe(0);
  });

  it('returns total notification count', () => {
    const { result } = renderHook(() => useNavigation());

    act(() => {
      result.current.setNotificationCount('quests', 2);
      result.current.setNotificationCount('messages', 3);
    });

    expect(result.current.getTotalNotifications()).toBe(5);
  });
});
