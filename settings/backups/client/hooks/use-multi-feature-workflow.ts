import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface WorkflowStep {
  id: string;
  featureType: 'quests' | 'learning' | 'marketplace' | 'social' | 'certificates';
  action: string;
  targetId: string;
}

interface WorkflowDefinition {
  id: string;
  name: string;
  steps: WorkflowStep[];
}

interface WorkflowOptions {
  onComplete?: (workflowId: string) => void;
  onStepComplete?: (stepId: string, step: WorkflowStep) => void;
  allowNonSequential?: boolean;
}

interface WorkflowState {
  currentStepIndex: number;
  completedSteps: string[];
}

export default function useMultiFeatureWorkflow(
  definition: WorkflowDefinition,
  options: WorkflowOptions = {}
) {
  const { onComplete, onStepComplete, allowNonSequential = false } = options;

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const storageKey = `workflow_${definition.id}`;

  // Load workflow state from AsyncStorage
  useEffect(() => {
    const loadState = async () => {
      try {
        const savedState = await AsyncStorage.getItem(storageKey);
        if (savedState) {
          const state: WorkflowState = JSON.parse(savedState);
          setCurrentStepIndex(state.currentStepIndex);
          setCompletedSteps(state.completedSteps);
        }
      } catch (error) {
        console.error('Failed to load workflow state:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadState();
  }, [storageKey]);

  // Save workflow state to AsyncStorage
  const saveState = useCallback(
    async (stepIndex: number, completed: string[]) => {
      try {
        const state: WorkflowState = {
          currentStepIndex: stepIndex,
          completedSteps: completed,
        };
        await AsyncStorage.setItem(storageKey, JSON.stringify(state));
      } catch (error) {
        console.error('Failed to save workflow state:', error);
      }
    },
    [storageKey]
  );

  // Calculate progress percentage
  const progress = (completedSteps.length / definition.steps.length) * 100;

  // Check if workflow is complete
  const isComplete = completedSteps.length === definition.steps.length;

  // Get current step
  const currentStep = definition.steps[currentStepIndex];

  // Check if a specific step is completed
  const isStepCompleted = useCallback(
    (stepId: string) => {
      return completedSteps.includes(stepId);
    },
    [completedSteps]
  );

  // Complete a step
  const completeStep = useCallback(
    (stepId: string) => {
      const stepIndex = definition.steps.findIndex(s => s.id === stepId);
      
      if (stepIndex === -1) return;

      // Check if step can be completed
      if (!allowNonSequential && stepIndex !== currentStepIndex) {
        return; // Can't complete out of order
      }

      if (completedSteps.includes(stepId)) {
        return; // Already completed
      }

      const newCompletedSteps = [...completedSteps, stepId];
      setCompletedSteps(newCompletedSteps);

      // Call step complete callback
      if (onStepComplete) {
        onStepComplete(stepId, definition.steps[stepIndex]);
      }

      // Advance to next step if sequential
      if (!allowNonSequential && stepIndex === currentStepIndex) {
        const nextIndex = currentStepIndex + 1;
        setCurrentStepIndex(nextIndex);
        saveState(nextIndex, newCompletedSteps);
      } else {
        saveState(currentStepIndex, newCompletedSteps);
      }

      // Check if workflow is complete
      if (newCompletedSteps.length === definition.steps.length) {
        if (onComplete) {
          onComplete(definition.id);
        }
      }
    },
    [
      definition,
      currentStepIndex,
      completedSteps,
      allowNonSequential,
      onComplete,
      onStepComplete,
      saveState,
    ]
  );

  // Navigate to a specific step
  const goToStep = useCallback(
    (stepIndex: number) => {
      if (stepIndex >= 0 && stepIndex < definition.steps.length) {
        setCurrentStepIndex(stepIndex);
        saveState(stepIndex, completedSteps);
      }
    },
    [definition.steps.length, completedSteps, saveState]
  );

  // Reset workflow
  const reset = useCallback(async () => {
    setCurrentStepIndex(0);
    setCompletedSteps([]);
    await saveState(0, []);
  }, [saveState]);

  // Get steps with their status
  const steps = definition.steps.map((step, index) => ({
    ...step,
    status:
      completedSteps.includes(step.id)
        ? ('completed' as const)
        : index === currentStepIndex
        ? ('current' as const)
        : ('upcoming' as const),
  }));

  return {
    currentStepIndex,
    currentStep,
    steps,
    completedSteps,
    progress,
    isComplete,
    isLoading,
    completeStep,
    goToStep,
    reset,
    isStepCompleted,
  };
}
