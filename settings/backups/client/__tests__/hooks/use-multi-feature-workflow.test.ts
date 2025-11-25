import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useMultiFeatureWorkflow from '@/hooks/use-multi-feature-workflow';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

describe('useMultiFeatureWorkflow', () => {
  const mockWorkflow = {
    id: 'quest-to-certificate',
    name: 'Complete Quest and Earn Certificate',
    steps: [
      {
        id: 'step1',
        featureType: 'quests' as const,
        action: 'complete',
        targetId: 'quest123',
      },
      {
        id: 'step2',
        featureType: 'learning' as const,
        action: 'enroll',
        targetId: 'course456',
      },
      {
        id: 'step3',
        featureType: 'certificates' as const,
        action: 'claim',
        targetId: 'cert789',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default state', async () => {
      const { result } = renderHook(() => useMultiFeatureWorkflow(mockWorkflow));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.currentStepIndex).toBe(0);
      expect(result.current.completedSteps).toEqual([]);
      expect(result.current.progress).toBe(0);
      expect(result.current.isComplete).toBe(false);
      expect(result.current.currentStep).toEqual(mockWorkflow.steps[0]);
    });

    it('should load saved state from AsyncStorage', async () => {
      const savedState = {
        currentStepIndex: 1,
        completedSteps: ['step1'],
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(savedState));

      const { result } = renderHook(() => useMultiFeatureWorkflow(mockWorkflow));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.currentStepIndex).toBe(1);
      expect(result.current.completedSteps).toEqual(['step1']);
      expect(result.current.progress).toBeCloseTo(33.33, 2);
    });

    it('should handle AsyncStorage errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => useMultiFeatureWorkflow(mockWorkflow));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.currentStepIndex).toBe(0);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Step Completion', () => {
    it('should complete a step in sequential mode', async () => {
      const { result } = renderHook(() => useMultiFeatureWorkflow(mockWorkflow));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.completeStep('step1');
      });

      await waitFor(() => {
        expect(result.current.completedSteps).toContain('step1');
      });

      expect(result.current.currentStepIndex).toBe(1);
      expect(result.current.progress).toBeCloseTo(33.33, 2);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'workflow_quest-to-certificate',
        JSON.stringify({
          currentStepIndex: 1,
          completedSteps: ['step1'],
        })
      );
    });

    it('should not complete steps out of order in sequential mode', async () => {
      const { result } = renderHook(() => useMultiFeatureWorkflow(mockWorkflow));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.completeStep('step2'); // Try to complete step 2 before step 1
      });

      await waitFor(() => {
        expect(result.current.completedSteps).toEqual([]);
      });

      expect(result.current.currentStepIndex).toBe(0);
    });

    it('should allow non-sequential completion when enabled', async () => {
      const { result } = renderHook(() =>
        useMultiFeatureWorkflow(mockWorkflow, { allowNonSequential: true })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.completeStep('step2'); // Complete step 2 first
      });

      await waitFor(() => {
        expect(result.current.completedSteps).toContain('step2');
      });

      expect(result.current.currentStepIndex).toBe(0); // Index doesn't advance
      expect(result.current.progress).toBeCloseTo(33.33, 2);
    });

    it('should not complete the same step twice', async () => {
      const { result } = renderHook(() => useMultiFeatureWorkflow(mockWorkflow));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.completeStep('step1');
      });

      await waitFor(() => {
        expect(result.current.completedSteps).toContain('step1');
      });

      const completedCountBefore = result.current.completedSteps.length;

      act(() => {
        result.current.completeStep('step1'); // Try again
      });

      await waitFor(() => {
        expect(result.current.completedSteps.length).toBe(completedCountBefore);
      });
    });

    it('should call onStepComplete callback', async () => {
      const onStepComplete = jest.fn();
      const { result } = renderHook(() =>
        useMultiFeatureWorkflow(mockWorkflow, { onStepComplete })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.completeStep('step1');
      });

      await waitFor(() => {
        expect(onStepComplete).toHaveBeenCalledWith('step1', mockWorkflow.steps[0]);
      });
    });

    it('should ignore invalid step IDs', async () => {
      const { result } = renderHook(() => useMultiFeatureWorkflow(mockWorkflow));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.completeStep('invalid-step');
      });

      await waitFor(() => {
        expect(result.current.completedSteps).toEqual([]);
      });
    });
  });

  describe('Workflow Completion', () => {
    it('should detect workflow completion', async () => {
      const { result } = renderHook(() => useMultiFeatureWorkflow(mockWorkflow));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.completeStep('step1');
      });

      await waitFor(() => {
        expect(result.current.completedSteps).toContain('step1');
      });

      act(() => {
        result.current.completeStep('step2');
      });

      await waitFor(() => {
        expect(result.current.completedSteps).toContain('step2');
      });

      act(() => {
        result.current.completeStep('step3');
      });

      await waitFor(() => {
        expect(result.current.isComplete).toBe(true);
      });

      expect(result.current.progress).toBe(100);
    });

    it('should call onComplete callback when workflow finishes', async () => {
      const onComplete = jest.fn();
      const { result } = renderHook(() =>
        useMultiFeatureWorkflow(mockWorkflow, { onComplete })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Complete all steps
      act(() => {
        result.current.completeStep('step1');
      });

      await waitFor(() => {
        expect(result.current.completedSteps).toContain('step1');
      });

      act(() => {
        result.current.completeStep('step2');
      });

      await waitFor(() => {
        expect(result.current.completedSteps).toContain('step2');
      });

      act(() => {
        result.current.completeStep('step3');
      });

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalledWith('quest-to-certificate');
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to a specific step', async () => {
      const { result } = renderHook(() => useMultiFeatureWorkflow(mockWorkflow));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.goToStep(2);
      });

      await waitFor(() => {
        expect(result.current.currentStepIndex).toBe(2);
      });

      expect(result.current.currentStep).toEqual(mockWorkflow.steps[2]);
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should not navigate to invalid step index', async () => {
      const { result } = renderHook(() => useMultiFeatureWorkflow(mockWorkflow));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.goToStep(-1);
      });

      expect(result.current.currentStepIndex).toBe(0);

      act(() => {
        result.current.goToStep(10);
      });

      expect(result.current.currentStepIndex).toBe(0);
    });
  });

  describe('Reset', () => {
    it('should reset workflow state', async () => {
      const savedState = {
        currentStepIndex: 2,
        completedSteps: ['step1', 'step2'],
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(savedState));

      const { result } = renderHook(() => useMultiFeatureWorkflow(mockWorkflow));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.currentStepIndex).toBe(2);

      act(() => {
        result.current.reset();
      });

      await waitFor(() => {
        expect(result.current.currentStepIndex).toBe(0);
      });

      expect(result.current.completedSteps).toEqual([]);
      expect(result.current.progress).toBe(0);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'workflow_quest-to-certificate',
        JSON.stringify({
          currentStepIndex: 0,
          completedSteps: [],
        })
      );
    });
  });

  describe('Step Status', () => {
    it('should return correct step status', async () => {
      const savedState = {
        currentStepIndex: 1,
        completedSteps: ['step1'],
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(savedState));

      const { result } = renderHook(() => useMultiFeatureWorkflow(mockWorkflow));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.steps[0].status).toBe('completed');
      expect(result.current.steps[1].status).toBe('current');
      expect(result.current.steps[2].status).toBe('upcoming');
    });

    it('should check if a step is completed', async () => {
      const { result } = renderHook(() => useMultiFeatureWorkflow(mockWorkflow));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.completeStep('step1');
      });

      await waitFor(() => {
        expect(result.current.isStepCompleted('step1')).toBe(true);
      });

      expect(result.current.isStepCompleted('step2')).toBe(false);
    });
  });

  describe('Progress Calculation', () => {
    it('should calculate progress percentage correctly', async () => {
      const { result } = renderHook(() => useMultiFeatureWorkflow(mockWorkflow));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.progress).toBe(0);

      act(() => {
        result.current.completeStep('step1');
      });

      await waitFor(() => {
        expect(result.current.progress).toBeCloseTo(33.33, 1);
      });

      act(() => {
        result.current.completeStep('step2');
      });

      await waitFor(() => {
        expect(result.current.progress).toBeCloseTo(66.67, 1);
      });

      act(() => {
        result.current.completeStep('step3');
      });

      await waitFor(() => {
        expect(result.current.progress).toBe(100);
      });
    });
  });

  describe('AsyncStorage Persistence', () => {
    it('should save state after each step completion', async () => {
      const { result } = renderHook(() => useMultiFeatureWorkflow(mockWorkflow));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.completeStep('step1');
      });

      await waitFor(() => {
        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          'workflow_quest-to-certificate',
          expect.any(String)
        );
      });
    });

    it('should handle save errors gracefully', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Save error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => useMultiFeatureWorkflow(mockWorkflow));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.completeStep('step1');
      });

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle workflow with single step', async () => {
      const singleStepWorkflow = {
        id: 'single-step',
        name: 'Single Step Workflow',
        steps: [
          {
            id: 'only-step',
            featureType: 'quests' as const,
            action: 'complete',
            targetId: 'quest1',
          },
        ],
      };

      const onComplete = jest.fn();
      const { result } = renderHook(() =>
        useMultiFeatureWorkflow(singleStepWorkflow, { onComplete })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.completeStep('only-step');
      });

      await waitFor(() => {
        expect(result.current.isComplete).toBe(true);
      });

      expect(result.current.progress).toBe(100);
      expect(onComplete).toHaveBeenCalledWith('single-step');
    });

    it('should handle workflow with no steps', async () => {
      const emptyWorkflow = {
        id: 'empty',
        name: 'Empty Workflow',
        steps: [],
      };

      const { result } = renderHook(() => useMultiFeatureWorkflow(emptyWorkflow));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isComplete).toBe(true);
      expect(result.current.progress).toBeNaN(); // 0/0
      expect(result.current.currentStep).toBeUndefined();
    });
  });
});
