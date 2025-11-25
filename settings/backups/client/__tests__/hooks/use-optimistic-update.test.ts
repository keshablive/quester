/**
 * Tests for useOptimisticUpdate hook
 * Covers optimistic state updates with rollback on error
 */

import { renderHook, act } from '@testing-library/react-native';
import { useOptimisticUpdate } from '@/lib/hooks/use-optimistic-update';

describe('useOptimisticUpdate', () => {
  describe('Initialization', () => {
    it('should initialize with provided initial value', () => {
      const { result } = renderHook(() =>
        useOptimisticUpdate({ initialValue: 5 })
      );

      expect(result.current.value).toBe(5);
      expect(result.current.isOptimistic).toBe(false);
      expect(result.current.isPending).toBe(false);
    });

    it('should initialize with undefined if no initial value', () => {
      const { result } = renderHook(() => useOptimisticUpdate({}));

      expect(result.current.value).toBeUndefined();
      expect(result.current.isOptimistic).toBe(false);
    });

    it('should initialize with null if provided', () => {
      const { result } = renderHook(() =>
        useOptimisticUpdate({ initialValue: null })
      );

      expect(result.current.value).toBeNull();
    });
  });

  describe('Optimistic Updates', () => {
    it('should immediately apply optimistic update', async () => {
      const { result } = renderHook(() =>
        useOptimisticUpdate({ initialValue: 0 })
      );

      await act(async () => {
        await result.current.update(
          10,
          async () => {
            // Simulated API call
            return 10;
          }
        );
      });

      // Value should update immediately
      expect(result.current.value).toBe(10);
    });

    it('should use actual value from server response', async () => {
      const { result } = renderHook(() =>
        useOptimisticUpdate({ initialValue: 0 })
      );

      await act(async () => {
        await result.current.update(
          10, // Optimistic value
          async () => {
            await new Promise((resolve) => setTimeout(resolve, 10));
            return 15; // Actual server value
          }
        );
      });

      // Should use server value, not optimistic
      expect(result.current.value).toBe(15);
      expect(result.current.isOptimistic).toBe(false);
    });

    it('should support function updater for optimistic value', async () => {
      const { result } = renderHook(() =>
        useOptimisticUpdate({ initialValue: 5 })
      );

      await act(async () => {
        await result.current.update(
          (prev: number) => prev + 1,
          async () => 6
        );
      });

      expect(result.current.value).toBe(6);
    });
  });

  describe('Rollback on Error', () => {
    it('should rollback to previous value on error', async () => {
      const { result } = renderHook(() =>
        useOptimisticUpdate({ initialValue: 5 })
      );

      await act(async () => {
        try {
          await result.current.update(
            10,
            async () => {
              throw new Error('API Error');
            }
          );
        } catch (error) {
          // Expected to throw
        }
      });

      // Should rollback to original value
      expect(result.current.value).toBe(5);
      expect(result.current.isOptimistic).toBe(false);
      expect(result.current.isPending).toBe(false);
    });

    it('should call onError callback with error and previous value', async () => {
      const onError = jest.fn();
      const { result } = renderHook(() =>
        useOptimisticUpdate({ initialValue: 5, onError })
      );

      const error = new Error('API Error');

      await act(async () => {
        try {
          await result.current.update(
            10,
            async () => {
              throw error;
            }
          );
        } catch (err) {
          // Expected
        }
      });

      expect(onError).toHaveBeenCalledWith(error, 5, 10);
      expect(result.current.value).toBe(5);
    });

    it('should preserve isOptimistic=false after rollback', async () => {
      const { result } = renderHook(() =>
        useOptimisticUpdate({ initialValue: 5 })
      );

      await act(async () => {
        try {
          await result.current.update(
            10,
            async () => {
              throw new Error('Fail');
            }
          );
        } catch (error) {
          // Expected
        }
      });

      expect(result.current.isOptimistic).toBe(false);
    });

    it('should rethrow error after rollback', async () => {
      const { result } = renderHook(() =>
        useOptimisticUpdate({ initialValue: 5 })
      );

      await expect(
        act(async () => {
          await result.current.update(
            10,
            async () => {
              throw new Error('API Error');
            }
          );
        })
      ).rejects.toThrow('API Error');

      expect(result.current.value).toBe(5);
    });
  });

  describe('Success Callback', () => {
    it('should call onSuccess with actual value', async () => {
      const onSuccess = jest.fn();
      const { result } = renderHook(() =>
        useOptimisticUpdate({ initialValue: 5, onSuccess })
      );

      await act(async () => {
        await result.current.update(
          10,
          async () => 15
        );
      });

      expect(onSuccess).toHaveBeenCalledWith(15, 10, 5);
    });

    it('should not call onSuccess on error', async () => {
      const onSuccess = jest.fn();
      const { result } = renderHook(() =>
        useOptimisticUpdate({ initialValue: 5, onSuccess })
      );

      await act(async () => {
        try {
          await result.current.update(
            10,
            async () => {
              throw new Error('Fail');
            }
          );
        } catch (error) {
          // Expected
        }
      });

      expect(onSuccess).not.toHaveBeenCalled();
    });
  });

  describe('Multiple Sequential Updates', () => {
    it('should handle sequential updates correctly', async () => {
      const { result } = renderHook(() =>
        useOptimisticUpdate({ initialValue: 0 })
      );

      await act(async () => {
        await result.current.update(
          1,
          async () => 1
        );
      });

      expect(result.current.value).toBe(1);

      await act(async () => {
        await result.current.update(
          2,
          async () => 2
        );
      });

      expect(result.current.value).toBe(2);
    });

    it('should use latest committed value as rollback target', async () => {
      const { result } = renderHook(() =>
        useOptimisticUpdate({ initialValue: 0 })
      );

      // First successful update
      await act(async () => {
        await result.current.update(
          5,
          async () => 5
        );
      });

      // Second update fails
      await act(async () => {
        try {
          await result.current.update(
            10,
            async () => {
              throw new Error('Fail');
            }
          );
        } catch (error) {
          // Expected
        }
      });

      // Should rollback to committed value (5), not initial (0)
      expect(result.current.value).toBe(5);
    });
  });

  describe('Concurrent Updates', () => {
    it('should handle last update wins for concurrent updates', async () => {
      const { result } = renderHook(() =>
        useOptimisticUpdate({ initialValue: 0 })
      );

      await act(async () => {
        // Start two updates concurrently
        const promise1 = result.current.update(
          1,
          async () => {
            await new Promise((resolve) => setTimeout(resolve, 20));
            return 1;
          }
        );

        const promise2 = result.current.update(
          2,
          async () => {
            await new Promise((resolve) => setTimeout(resolve, 10));
            return 2;
          }
        );

        await Promise.all([promise1, promise2]);
      });

      // Last update should win
      expect(result.current.value).toBe(2);
    });

    it('should rollback only if latest update fails', async () => {
      const { result } = renderHook(() =>
        useOptimisticUpdate({ initialValue: 0 })
      );

      await act(async () => {
        const promise1 = result.current.update(
          1,
          async () => {
            await new Promise((resolve) => setTimeout(resolve, 20));
            throw new Error('First fails');
          }
        );

        const promise2 = result.current.update(
          2,
          async () => {
            await new Promise((resolve) => setTimeout(resolve, 10));
            return 2;
          }
        );

        await Promise.allSettled([promise1, promise2]);
      });

      // Second update succeeded, should use its value
      expect(result.current.value).toBe(2);
    });
  });

  describe('Reset Functionality', () => {
    it('should reset to initial value', async () => {
      const { result } = renderHook(() =>
        useOptimisticUpdate({ initialValue: 5 })
      );

      await act(async () => {
        await result.current.update(
          10,
          async () => 10
        );
      });

      expect(result.current.value).toBe(10);

      act(() => {
        result.current.reset();
      });

      expect(result.current.value).toBe(5);
      expect(result.current.isOptimistic).toBe(false);
      expect(result.current.isPending).toBe(false);
    });

    it('should reset to provided value if specified', async () => {
      const { result } = renderHook(() =>
        useOptimisticUpdate({ initialValue: 5 })
      );

      await act(async () => {
        await result.current.update(
          10,
          async () => 10
        );
      });

      act(() => {
        result.current.reset(20);
      });

      expect(result.current.value).toBe(20);
    });
  });

  describe('Manual Value Setting', () => {
    it('should allow setting value directly', () => {
      const { result } = renderHook(() =>
        useOptimisticUpdate({ initialValue: 5 })
      );

      act(() => {
        result.current.setValue(10);
      });

      expect(result.current.value).toBe(10);
      expect(result.current.isOptimistic).toBe(false);
    });

    it('should support function updater for setValue', () => {
      const { result } = renderHook(() =>
        useOptimisticUpdate({ initialValue: 5 })
      );

      act(() => {
        result.current.setValue((prev: number) => prev + 1);
      });

      expect(result.current.value).toBe(6);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle like/unlike toggle pattern', async () => {
      const { result } = renderHook(() =>
        useOptimisticUpdate({ initialValue: false })
      );

      // Like
      await act(async () => {
        await result.current.update(
          true,
          async () => {
            await new Promise((resolve) => setTimeout(resolve, 10));
            return true;
          }
        );
      });

      expect(result.current.value).toBe(true);

      // Unlike
      await act(async () => {
        await result.current.update(
          false,
          async () => {
            await new Promise((resolve) => setTimeout(resolve, 10));
            return false;
          }
        );
      });

      expect(result.current.value).toBe(false);
    });

    it('should handle counter increment pattern', async () => {
      const { result } = renderHook(() =>
        useOptimisticUpdate({ initialValue: 0 })
      );

      // Increment
      await act(async () => {
        await result.current.update(
          (prev: number) => prev + 1,
          async () => {
            await new Promise((resolve) => setTimeout(resolve, 10));
            return 1;
          }
        );
      });

      expect(result.current.value).toBe(1);

      // Increment again
      await act(async () => {
        await result.current.update(
          (prev: number) => prev + 1,
          async () => {
            await new Promise((resolve) => setTimeout(resolve, 10));
            return 2;
          }
        );
      });

      expect(result.current.value).toBe(2);
    });

    it('should handle list addition pattern', async () => {
      const { result } = renderHook(() =>
        useOptimisticUpdate<string[]>({ initialValue: [] })
      );

      await act(async () => {
        await result.current.update(
          (prev: string[]) => [...prev, 'item1'],
          async () => {
            await new Promise((resolve) => setTimeout(resolve, 10));
            return ['item1'];
          }
        );
      });

      expect(result.current.value).toEqual(['item1']);

      await act(async () => {
        await result.current.update(
          (prev: string[]) => [...prev, 'item2'],
          async () => ['item1', 'item2']
        );
      });

      expect(result.current.value).toEqual(['item1', 'item2']);
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('should handle undefined error object', async () => {
      const onError = jest.fn();
      const { result } = renderHook(() =>
        useOptimisticUpdate({ initialValue: 5, onError })
      );

      await act(async () => {
        try {
          await result.current.update(
            10,
            async () => {
              throw undefined;
            }
          );
        } catch (error) {
          // Expected
        }
      });

      expect(onError).toHaveBeenCalled();
      expect(result.current.value).toBe(5);
    });

    it('should handle null error object', async () => {
      const onError = jest.fn();
      const { result } = renderHook(() =>
        useOptimisticUpdate({ initialValue: 5, onError })
      );

      await act(async () => {
        try {
          await result.current.update(
            10,
            async () => {
              throw null;
            }
          );
        } catch (error) {
          // Expected
        }
      });

      expect(onError).toHaveBeenCalled();
      expect(result.current.value).toBe(5);
    });
  });

  describe('Cleanup', () => {
    it('should not update state after unmount', async () => {
      const { result, unmount } = renderHook(() =>
        useOptimisticUpdate({ initialValue: 5 })
      );

      let updatePromise: Promise<void>;

      await act(async () => {
        updatePromise = result.current.update(
          10,
          async () => {
            await new Promise((resolve) => setTimeout(resolve, 50));
            return 10;
          }
        );
      });

      unmount();

      // Should not throw or cause warnings
      await expect(updatePromise!).resolves.not.toThrow();
    });

    it('should cancel pending operations on unmount', async () => {
      const onSuccess = jest.fn();
      const { result, unmount } = renderHook(() =>
        useOptimisticUpdate({ initialValue: 5, onSuccess })
      );

      await act(async () => {
        result.current.update(
          10,
          async () => {
            await new Promise((resolve) => setTimeout(resolve, 50));
            return 10;
          }
        );
      });

      unmount();

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Callbacks should not fire after unmount
      expect(onSuccess).not.toHaveBeenCalled();
    });
  });
});
