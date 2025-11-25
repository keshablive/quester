import React, { useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { Video, ResizeMode } from 'expo-av';
import Markdown from 'react-native-markdown-display';

interface LessonContent {
  video?: {
    url: string;
    duration: number;
  };
  text?: {
    markdown: string;
  };
  quiz?: {
    questions: QuizQuestion[];
  };
}

interface QuizQuestion {
  id: string;
  question: string;
  type: 'multiple_choice' | 'true_false';
  options?: string[];
  correctAnswer: string | boolean;
}

interface CoursePlayerProps {
  contentType: 'video' | 'text' | 'quiz';
  content: LessonContent;
  onComplete: (grade?: number) => void;
  isCompleted: boolean;
}

export function CoursePlayer({ contentType, content, onComplete, isCompleted }: CoursePlayerProps) {
  if (contentType === 'video' && content.video) {
    return <VideoPlayer video={content.video} onComplete={onComplete} isCompleted={isCompleted} />;
  }

  if (contentType === 'text' && content.text) {
    return <TextReader text={content.text} onComplete={onComplete} isCompleted={isCompleted} />;
  }

  if (contentType === 'quiz' && content.quiz) {
    return <QuizPlayer quiz={content.quiz} onComplete={onComplete} isCompleted={isCompleted} />;
  }

  return (
    <View className="flex-1 items-center justify-center p-8">
      <Text className="text-xl text-gray-600">Unsupported content type</Text>
    </View>
  );
}

// Video Player Component
function VideoPlayer({
  video,
  onComplete,
  isCompleted,
}: {
  video: { url: string; duration: number };
  onComplete: () => void;
  isCompleted: boolean;
}) {
  const [hasWatched, setHasWatched] = useState(isCompleted);

  const handlePlaybackStatusUpdate = (status: any) => {
    if (status.didJustFinish && !hasWatched) {
      setHasWatched(true);
    }
  };

  return (
    <View className="flex-1 bg-black">
      <Video
        source={{ uri: video.url }}
        className="h-64 w-full"
        useNativeControls
        resizeMode={ResizeMode.CONTAIN}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
      />

      <View className="flex-1 bg-white p-4">
        <Text className="mb-2 text-lg font-semibold text-gray-900">Video Lesson</Text>
        <Text className="mb-4 text-sm text-gray-600">
          Duration: {Math.floor(video.duration / 60)}:
          {(video.duration % 60).toString().padStart(2, '0')}
        </Text>

        {hasWatched && !isCompleted && (
          <Pressable
            onPress={onComplete}
            className="items-center rounded-lg bg-blue-500 px-6 py-3 active:opacity-80">
            <Text className="text-base font-semibold text-white">Mark as Complete</Text>
          </Pressable>
        )}

        {isCompleted && (
          <View className="rounded-lg border border-green-200 bg-green-50 p-4">
            <Text className="text-center font-semibold text-green-800">✅ Completed</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// Text Reader Component
function TextReader({
  text,
  onComplete,
  isCompleted,
}: {
  text: { markdown: string };
  onComplete: () => void;
  isCompleted: boolean;
}) {
  return (
    <ScrollView className="flex-1 bg-white">
      <View className="p-4">
        <Markdown>{text.markdown}</Markdown>

        <View className="mt-6 border-t border-gray-200 pt-6">
          {!isCompleted ? (
            <Pressable
              onPress={onComplete}
              className="items-center rounded-lg bg-blue-500 px-6 py-3 active:opacity-80">
              <Text className="text-base font-semibold text-white">Mark as Complete</Text>
            </Pressable>
          ) : (
            <View className="rounded-lg border border-green-200 bg-green-50 p-4">
              <Text className="text-center font-semibold text-green-800">✅ Completed</Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

// Quiz Player Component
function QuizPlayer({
  quiz,
  onComplete,
  isCompleted,
}: {
  quiz: { questions: QuizQuestion[] };
  onComplete: (grade: number) => void;
  isCompleted: boolean;
}) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | boolean>>({});
  const [showResults, setShowResults] = useState(isCompleted);

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1;

  const handleAnswer = (answer: string | boolean) => {
    setAnswers({ ...answers, [currentQuestion.id]: answer });
  };

  const handleNext = () => {
    if (isLastQuestion) {
      handleSubmit();
    } else {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = () => {
    // Calculate grade
    let correctCount = 0;
    quiz.questions.forEach((q) => {
      if (answers[q.id] === q.correctAnswer) {
        correctCount++;
      }
    });
    const grade = (correctCount / quiz.questions.length) * 100;
    setShowResults(true);
    onComplete(grade);
  };

  if (showResults) {
    const correctCount = quiz.questions.filter((q) => answers[q.id] === q.correctAnswer).length;
    const grade = (correctCount / quiz.questions.length) * 100;

    return (
      <ScrollView className="flex-1 bg-white p-4">
        <View className="mb-6 items-center">
          <Text className="mb-2 text-3xl">{grade >= 70 ? '🎉' : '📊'}</Text>
          <Text className="mb-2 text-2xl font-bold text-gray-900">Quiz Complete!</Text>
          <Text className="text-xl font-semibold text-blue-600">Score: {grade.toFixed(0)}%</Text>
          <Text className="text-sm text-gray-600">
            {correctCount} out of {quiz.questions.length} correct
          </Text>
        </View>

        {/* Review Questions */}
        <View className="space-y-4">
          {quiz.questions.map((question, index) => {
            const userAnswer = answers[question.id];
            const isCorrect = userAnswer === question.correctAnswer;

            return (
              <View
                key={question.id}
                className={`rounded-lg border-2 p-4 ${
                  isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                }`}>
                <Text className="mb-2 font-semibold text-gray-900">
                  {index + 1}. {question.question}
                </Text>
                <Text className={`text-sm ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                  {isCorrect ? '✅ Correct' : '❌ Incorrect'}
                </Text>
                <Text className="mt-1 text-sm text-gray-600">
                  Your answer: {String(userAnswer)}
                </Text>
                {!isCorrect && (
                  <Text className="text-sm text-gray-600">
                    Correct answer: {String(question.correctAnswer)}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {/* Progress Bar */}
      <View className="border-b border-gray-200 bg-gray-50 p-4">
        <View className="mb-2 flex-row justify-between">
          <Text className="text-sm font-semibold text-gray-700">
            Question {currentQuestionIndex + 1} of {quiz.questions.length}
          </Text>
          <Text className="text-sm text-gray-600">{Object.keys(answers).length} answered</Text>
        </View>
        <View className="h-2 overflow-hidden rounded-full bg-gray-200">
          <View
            className="h-full rounded-full bg-blue-500"
            style={{
              width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%`,
            }}
          />
        </View>
      </View>

      <ScrollView className="flex-1 p-4">
        {/* Question */}
        <Text className="mb-6 text-xl font-bold text-gray-900">{currentQuestion.question}</Text>

        {/* Multiple Choice Options */}
        {currentQuestion.type === 'multiple_choice' && currentQuestion.options && (
          <View className="space-y-3">
            {currentQuestion.options.map((option, index) => (
              <Pressable
                key={index}
                onPress={() => handleAnswer(option)}
                className={`rounded-lg border-2 p-4 ${
                  answers[currentQuestion.id] === option
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 bg-white'
                }`}>
                <Text
                  className={`text-base ${
                    answers[currentQuestion.id] === option
                      ? 'font-semibold text-blue-900'
                      : 'text-gray-900'
                  }`}>
                  {option}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* True/False Options */}
        {currentQuestion.type === 'true_false' && (
          <View className="flex-row space-x-4">
            <Pressable
              onPress={() => handleAnswer(true)}
              className={`flex-1 rounded-lg border-2 p-4 ${
                answers[currentQuestion.id] === true
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-300 bg-white'
              }`}>
              <Text
                className={`text-center text-base font-semibold ${
                  answers[currentQuestion.id] === true ? 'text-green-900' : 'text-gray-900'
                }`}>
                True
              </Text>
            </Pressable>
            <Pressable
              onPress={() => handleAnswer(false)}
              className={`flex-1 rounded-lg border-2 p-4 ${
                answers[currentQuestion.id] === false
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-300 bg-white'
              }`}>
              <Text
                className={`text-center text-base font-semibold ${
                  answers[currentQuestion.id] === false ? 'text-red-900' : 'text-gray-900'
                }`}>
                False
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Navigation Buttons */}
      <View className="border-t border-gray-200 bg-gray-50 p-4">
        <View className="flex-row justify-between">
          <Pressable
            onPress={handlePrevious}
            disabled={currentQuestionIndex === 0}
            className={`rounded-lg px-6 py-3 ${
              currentQuestionIndex === 0 ? 'bg-gray-300' : 'bg-gray-500 active:opacity-80'
            }`}>
            <Text className="font-semibold text-white">Previous</Text>
          </Pressable>

          <Pressable
            onPress={handleNext}
            disabled={!answers[currentQuestion.id]}
            className={`rounded-lg px-6 py-3 ${
              !answers[currentQuestion.id] ? 'bg-gray-300' : 'bg-blue-500 active:opacity-80'
            }`}>
            <Text className="font-semibold text-white">{isLastQuestion ? 'Submit' : 'Next'}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
