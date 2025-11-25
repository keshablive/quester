import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';

interface AssessmentQuestion {
  id: string;
  question: string;
  type: 'multiple_choice' | 'true_false';
  options?: string[];
  points: number;
}

interface AssessmentFormProps {
  questions: AssessmentQuestion[];
  timeLimit?: number; // in seconds
  onSubmit: (answers: Record<string, string | boolean>) => void;
  onTimeUp?: () => void;
}

export function AssessmentForm({ questions, timeLimit, onSubmit, onTimeUp }: AssessmentFormProps) {
  const [answers, setAnswers] = useState<Record<string, string | boolean>>({});
  const [timeRemaining, setTimeRemaining] = useState(timeLimit);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Timer countdown
  useEffect(() => {
    if (!timeLimit || !timeRemaining) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev && prev <= 1) {
          clearInterval(timer);
          onTimeUp?.();
          return 0;
        }
        return prev ? prev - 1 : 0;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLimit, timeRemaining, onTimeUp]);

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const allQuestionsAnswered = questions.every((q) => answers[q.id] !== undefined);

  const handleAnswer = (questionId: string, answer: string | boolean) => {
    setAnswers({ ...answers, [questionId]: answer });
  };

  const handleNext = () => {
    if (!isLastQuestion) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = () => {
    onSubmit(answers);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View className="flex-1 bg-white">
      {/* Header with Timer and Progress */}
      <View className="border-b border-blue-200 bg-blue-50 p-4">
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-lg font-bold text-gray-900">Assessment</Text>
          {timeRemaining !== undefined && (
            <View
              className={`rounded-full px-3 py-1 ${
                timeRemaining < 60 ? 'bg-red-100' : 'bg-blue-100'
              }`}>
              <Text
                className={`text-sm font-bold ${
                  timeRemaining < 60 ? 'text-red-700' : 'text-blue-700'
                }`}>
                ⏱️ {formatTime(timeRemaining)}
              </Text>
            </View>
          )}
        </View>

        {/* Progress Indicator */}
        <View className="mb-2 flex-row justify-between">
          <Text className="text-sm font-semibold text-gray-700">
            Question {currentQuestionIndex + 1} of {questions.length}
          </Text>
          <Text className="text-sm text-gray-600">{Object.keys(answers).length} answered</Text>
        </View>
        <View className="h-2 overflow-hidden rounded-full bg-gray-200">
          <View
            className="h-full rounded-full bg-blue-500 transition-all"
            style={{
              width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`,
            }}
          />
        </View>
      </View>

      {/* Question Content */}
      <ScrollView className="flex-1 p-4">
        <View className="mb-6">
          {/* Question Text */}
          <Text className="mb-2 text-xl font-bold text-gray-900">{currentQuestion.question}</Text>
          <Text className="mb-4 text-sm text-gray-600">Points: {currentQuestion.points}</Text>

          {/* Multiple Choice Options */}
          {currentQuestion.type === 'multiple_choice' && currentQuestion.options && (
            <View className="space-y-3">
              {currentQuestion.options.map((option, index) => {
                const isSelected = answers[currentQuestion.id] === option;
                return (
                  <Pressable
                    key={index}
                    onPress={() => handleAnswer(currentQuestion.id, option)}
                    className={`rounded-lg border-2 p-4 transition-colors ${
                      isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'
                    }`}>
                    <View className="flex-row items-center">
                      <View
                        className={`mr-3 h-6 w-6 items-center justify-center rounded-full border-2 ${
                          isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-400'
                        }`}>
                        {isSelected && <View className="h-3 w-3 rounded-full bg-white" />}
                      </View>
                      <Text
                        className={`flex-1 text-base ${
                          isSelected ? 'font-semibold text-blue-900' : 'text-gray-900'
                        }`}>
                        {option}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* True/False Options */}
          {currentQuestion.type === 'true_false' && (
            <View className="flex-row gap-4">
              <Pressable
                onPress={() => handleAnswer(currentQuestion.id, true)}
                className={`flex-1 rounded-lg border-2 p-6 ${
                  answers[currentQuestion.id] === true
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 bg-white'
                }`}>
                <Text
                  className={`text-center text-lg font-bold ${
                    answers[currentQuestion.id] === true ? 'text-green-700' : 'text-gray-700'
                  }`}>
                  True
                </Text>
              </Pressable>
              <Pressable
                onPress={() => handleAnswer(currentQuestion.id, false)}
                className={`flex-1 rounded-lg border-2 p-6 ${
                  answers[currentQuestion.id] === false
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-300 bg-white'
                }`}>
                <Text
                  className={`text-center text-lg font-bold ${
                    answers[currentQuestion.id] === false ? 'text-red-700' : 'text-gray-700'
                  }`}>
                  False
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Question Navigator */}
        <View className="mt-6 border-t border-gray-200 pt-6">
          <Text className="mb-3 text-sm font-semibold text-gray-700">Quick Navigation</Text>
          <View className="flex-row flex-wrap gap-2">
            {questions.map((q, index) => (
              <Pressable
                key={q.id}
                onPress={() => setCurrentQuestionIndex(index)}
                className={`h-12 w-12 items-center justify-center rounded-lg border-2 ${
                  index === currentQuestionIndex
                    ? 'border-blue-500 bg-blue-500'
                    : answers[q.id] !== undefined
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-300 bg-white'
                }`}>
                <Text
                  className={`text-sm font-bold ${
                    index === currentQuestionIndex
                      ? 'text-white'
                      : answers[q.id] !== undefined
                        ? 'text-green-700'
                        : 'text-gray-700'
                  }`}>
                  {index + 1}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Navigation Footer */}
      <View className="border-t border-gray-200 bg-gray-50 p-4">
        <View className="mb-3 flex-row justify-between">
          <Pressable
            onPress={handlePrevious}
            disabled={currentQuestionIndex === 0}
            className={`rounded-lg px-6 py-3 ${
              currentQuestionIndex === 0 ? 'bg-gray-300' : 'bg-gray-600 active:opacity-80'
            }`}>
            <Text className="font-semibold text-white">← Previous</Text>
          </Pressable>

          {!isLastQuestion ? (
            <Pressable
              onPress={handleNext}
              className="rounded-lg bg-blue-500 px-6 py-3 active:opacity-80">
              <Text className="font-semibold text-white">Next →</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={handleSubmit}
              disabled={!allQuestionsAnswered}
              className={`rounded-lg px-6 py-3 ${
                !allQuestionsAnswered ? 'bg-gray-300' : 'bg-green-500 active:opacity-80'
              }`}>
              <Text className="font-semibold text-white">Submit Assessment</Text>
            </Pressable>
          )}
        </View>

        {!allQuestionsAnswered && isLastQuestion && (
          <Text className="text-center text-xs text-orange-600">
            ⚠️ Please answer all questions before submitting
          </Text>
        )}
      </View>
    </View>
  );
}

// Assessment Timer Warning Modal
export function AssessmentTimerWarning({ onContinue }: { onContinue: () => void }) {
  return (
    <View className="flex-1 items-center justify-center bg-black/50 p-6">
      <View className="w-full max-w-md rounded-lg bg-white p-6">
        <Text className="mb-2 text-2xl">⏱️</Text>
        <Text className="mb-2 text-xl font-bold text-gray-900">Time's Up!</Text>
        <Text className="mb-6 text-sm text-gray-600">
          Your assessment has been automatically submitted.
        </Text>
        <Pressable
          onPress={onContinue}
          className="rounded-lg bg-blue-500 px-6 py-3 active:opacity-80">
          <Text className="text-center font-semibold text-white">View Results</Text>
        </Pressable>
      </View>
    </View>
  );
}
