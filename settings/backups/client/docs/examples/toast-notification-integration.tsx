/**
 * Toast Notification Integration Example
 * Feature 003: Real-Time Collaboration
 *
 * This example demonstrates how to integrate the toast notification system
 * into your app. It shows:
 * - Root layout integration with ToastNotificationManager
 * - Using useToastNotifications hook in components
 * - Different notification types and actions
 * - Real-world usage patterns
 */

import React from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastNotificationManager } from '@/components/real-time/toast-notification-manager';
import { useToastNotifications } from '@/lib/hooks/use-toast-notifications';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

/**
 * Root Layout Component
 * Add ToastNotificationManager here to make notifications available globally
 */
export function RootLayout({ children }: { children: React.ReactNode }) {
  const { notifications, dismiss } = useToastNotifications();

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1 }}>
        {children}

        {/* Toast Notification Manager - positioned at top of screen */}
        <ToastNotificationManager
          notifications={notifications}
          onDismiss={dismiss}
          onPress={(notification) => {
            console.log('Notification pressed:', notification);
            // Handle notification press (e.g., navigate to relevant screen)
          }}
        />
      </View>
    </SafeAreaProvider>
  );
}

/**
 * Example Component - Quest Completion
 * Shows success notifications when user completes quests
 */
export function QuestCompletionExample() {
  const { success, show } = useToastNotifications();

  const handleQuestComplete = () => {
    // Simple success notification
    success('Quest Completed!', '+50 XP earned');
  };

  const handleQuestCompleteWithAction = () => {
    // Success notification with action button
    show({
      type: 'success',
      title: 'Epic Quest Completed!',
      message: '+100 XP and rare item earned',
      duration: 7000, // Show for 7 seconds
      action: {
        label: 'View Rewards',
        onPress: () => {
          console.log('Navigate to rewards screen');
        },
      },
    });
  };

  return (
    <View style={{ padding: 16 }}>
      <Button onPress={handleQuestComplete}>
        <Text>Complete Quest</Text>
      </Button>

      <Button onPress={handleQuestCompleteWithAction} style={{ marginTop: 12 }}>
        <Text>Complete Epic Quest</Text>
      </Button>
    </View>
  );
}

/**
 * Example Component - Error Handling
 * Shows error notifications when operations fail
 */
export function ErrorHandlingExample() {
  const { error, warning } = useToastNotifications();

  const handleNetworkError = () => {
    error('Network Error', 'Could not connect to server. Please check your connection.');
  };

  const handleValidationWarning = () => {
    warning('Invalid Input', 'Username must be at least 3 characters');
  };

  return (
    <View style={{ padding: 16 }}>
      <Button onPress={handleNetworkError} variant="destructive">
        <Text>Trigger Network Error</Text>
      </Button>

      <Button onPress={handleValidationWarning} style={{ marginTop: 12 }}>
        <Text>Trigger Validation Warning</Text>
      </Button>
    </View>
  );
}

/**
 * Example Component - Social Notifications
 * Shows message notifications with user avatars
 */
export function SocialNotificationsExample() {
  const { show } = useToastNotifications();

  const handleNewMessage = () => {
    show({
      type: 'message',
      title: 'New Message',
      message: 'Alice: Hey, want to join our quest party?',
      avatar: 'https://example.com/avatars/alice.jpg',
      duration: 0, // Don't auto-dismiss
      action: {
        label: 'Reply',
        onPress: () => {
          console.log('Open chat with Alice');
        },
      },
    });
  };

  const handleFriendRequest = () => {
    show({
      type: 'info',
      title: 'Friend Request',
      message: 'Bob wants to connect with you',
      avatar: 'https://example.com/avatars/bob.jpg',
      action: {
        label: 'View',
        onPress: () => {
          console.log('Navigate to friend request');
        },
      },
    });
  };

  return (
    <View style={{ padding: 16 }}>
      <Button onPress={handleNewMessage}>
        <Text>Receive Message</Text>
      </Button>

      <Button onPress={handleFriendRequest} style={{ marginTop: 12 }}>
        <Text>Receive Friend Request</Text>
      </Button>
    </View>
  );
}

/**
 * Example Component - Multiple Notifications
 * Demonstrates queue management with max visible limit
 */
export function MultipleNotificationsExample() {
  const { info, success, warning, dismissAll } = useToastNotifications({ maxVisible: 3 });

  const handleShowMultiple = () => {
    info('First Notification', 'This is the first one');

    setTimeout(() => {
      success('Second Notification', 'This is the second one');
    }, 500);

    setTimeout(() => {
      warning('Third Notification', 'This is the third one');
    }, 1000);

    setTimeout(() => {
      info('Fourth Notification', 'First one should be removed');
    }, 1500);
  };

  return (
    <View style={{ padding: 16 }}>
      <Button onPress={handleShowMultiple}>
        <Text>Show Multiple Notifications</Text>
      </Button>

      <Button onPress={dismissAll} variant="outline" style={{ marginTop: 12 }}>
        <Text>Dismiss All</Text>
      </Button>
    </View>
  );
}

/**
 * Integration with WebSocket (Future)
 * This shows how real-time notifications will work
 */
export function WebSocketIntegrationExample() {
  // Example usage - commented out to avoid unused variable error
  // const showQuestCompletedToast = () => {
  //   show({
  //     type: 'success',
  //     title: 'Quest Completed!',
  //     message: 'Your quest was completed',
  //     action: {
  //       label: 'View',
  //       onPress: () => {
  //         // Navigate to quest details
  //       },
  //     },
  //   });
  // };

  return (
    <View style={{ padding: 16 }}>
      <Text>WebSocket notifications will appear here automatically</Text>
    </View>
  );
}

/**
 * Complete App Example
 */
export default function App() {
  return (
    <RootLayout>
      <ScrollView style={{ flex: 1 }}>
        <View style={{ padding: 16 }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>
            Toast Notification Examples
          </Text>

          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8 }}>
              Quest Completion
            </Text>
            <QuestCompletionExample />
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8 }}>Error Handling</Text>
            <ErrorHandlingExample />
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8 }}>
              Social Notifications
            </Text>
            <SocialNotificationsExample />
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8 }}>
              Multiple Notifications
            </Text>
            <MultipleNotificationsExample />
          </View>
        </View>
      </ScrollView>
    </RootLayout>
  );
}
