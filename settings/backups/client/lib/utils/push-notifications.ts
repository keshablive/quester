import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async (_notification: Notifications.Notification) => {
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    };
  },
});

// Handle notification received while app is foregrounded
export function setupForegroundNotificationHandler() {
  return Notifications.addNotificationReceivedListener((notification: Notifications.Notification) => {
    console.log('Foreground notification received:', notification);
    
    // Notification content available for future custom UI
    // const { title, body, data } = notification.request.content;
    
    // You can show a custom in-app notification UI here
    // or let the default system notification show
  });
}

// Handle notification tap/interaction
export function setupNotificationResponseHandler() {
  return Notifications.addNotificationResponseReceivedListener((response: Notifications.NotificationResponse) => {
    console.log('Notification response:', response);
    
    const { data } = response.notification.request.content;
    
    // Navigate based on notification data
    handleNotificationNavigation(data);
  });
}

// Handle background notification tap (when app was closed/killed)
export async function handleBackgroundNotification() {
  const lastNotificationResponse = await Notifications.getLastNotificationResponseAsync();
  
  if (lastNotificationResponse) {
    const { data } = lastNotificationResponse.notification.request.content;
    
    // Navigate based on notification data
    // Delay navigation to ensure app is fully loaded
    setTimeout(() => {
      handleNotificationNavigation(data);
    }, 1000);
  }
}

// Navigation handler based on notification data
function handleNotificationNavigation(data: any) {
  if (!data) return;

  const { type, user_id, group_id, badge_id, course_id, stream_id } = data;

  switch (type) {
    case 'message':
      // Navigate to chat screen
      if (user_id) {
        router.push({
          pathname: '/chat',
          params: {
            type: 'direct',
            id: user_id,
            name: data.username || 'Chat',
          },
        });
      } else if (group_id) {
        router.push({
          pathname: '/chat',
          params: {
            type: 'group',
            id: group_id,
            name: data.group_name || 'Group Chat',
          },
        });
      }
      break;

    case 'mention':
      // Navigate to specific message or content
      if (user_id) {
        router.push({
          pathname: '/chat',
          params: {
            type: 'direct',
            id: user_id,
            name: data.username || 'Chat',
          },
        });
      } else if (group_id) {
        router.push({
          pathname: '/chat',
          params: {
            type: 'group',
            id: group_id,
            name: data.group_name || 'Group Chat',
          },
        });
      }
      break;

    case 'badge_earned':
      // Navigate to badge details
      if (badge_id) {
        // Cast to any because generated route union types can be strict; this
        // keeps runtime routing correct while we reconcile types elsewhere.
        router.push({ pathname: '/badges/[id]', params: { id: badge_id } } as any);
      } else {
        router.push('/badges' as any);
      }
      break;

    case 'achievement':
      // Navigate to profile/achievements
      router.push('/profile');
      break;

    case 'course_completed':
    case 'lesson_available':
      // Navigate to course
      if (course_id) {
        router.push({ pathname: '/courses/[id]', params: { id: course_id } } as any);
      }
      break;

    case 'stream_started':
      // Navigate to live stream
      if (stream_id) {
        router.push({ pathname: '/live-stream/[id]', params: { id: stream_id } } as any);
      }
      break;

    case 'follow':
      // Navigate to user profile
      if (user_id) {
        router.push({ pathname: '/profile/[userId]', params: { userId: user_id } } as any);
      }
      break;

    case 'like':
    case 'comment':
      // Navigate to content (post, course, etc.)
      if (data.content_id) {
        // Generic content navigation
        router.push({ pathname: '/content/[id]', params: { id: data.content_id } } as any);
      }
      break;

    default:
      // Navigate to notifications screen
      router.push('/notifications' as any);
  }
}

// Schedule local notification
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: any,
  trigger?: Notifications.NotificationTriggerInput
) {
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        badge: 1,
      },
      trigger: trigger || null, // null = immediate
    });
    
    console.log('Scheduled notification:', id);
    return id;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return null;
  }
}

// Cancel specific notification
export async function cancelNotification(notificationId: string) {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    console.log('Cancelled notification:', notificationId);
  } catch (error) {
    console.error('Error cancelling notification:', error);
  }
}

// Cancel all notifications
export async function cancelAllNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('Cancelled all notifications');
  } catch (error) {
    console.error('Error cancelling all notifications:', error);
  }
}

// Get delivered notifications
export async function getDeliveredNotifications() {
  try {
    const notifications = await Notifications.getPresentedNotificationsAsync();
    return notifications;
  } catch (error) {
    console.error('Error getting delivered notifications:', error);
    return [];
  }
}

// Dismiss specific notification
export async function dismissNotification(notificationId: string) {
  try {
    await Notifications.dismissNotificationAsync(notificationId);
    console.log('Dismissed notification:', notificationId);
  } catch (error) {
    console.error('Error dismissing notification:', error);
  }
}

// Dismiss all notifications
export async function dismissAllNotifications() {
  try {
    await Notifications.dismissAllNotificationsAsync();
    console.log('Dismissed all notifications');
  } catch (error) {
    console.error('Error dismissing all notifications:', error);
  }
}

// Set badge count
export async function setBadgeCount(count: number) {
  try {
    await Notifications.setBadgeCountAsync(count);
    console.log('Set badge count:', count);
  } catch (error) {
    console.error('Error setting badge count:', error);
  }
}

// Get badge count
export async function getBadgeCount() {
  try {
    const count = await Notifications.getBadgeCountAsync();
    return count;
  } catch (error) {
    console.error('Error getting badge count:', error);
    return 0;
  }
}

// Create notification channel (Android)
export async function createNotificationChannel(
  channelId: string,
  channelName: string,
  importance: Notifications.AndroidImportance = Notifications.AndroidImportance.HIGH
) {
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync(channelId, {
        name: channelName,
        importance,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#007AFF',
        sound: 'default',
        enableVibrate: true,
      });
      console.log('Created notification channel:', channelId);
    } catch (error) {
      console.error('Error creating notification channel:', error);
    }
  }
}

// Initialize notification channels (Android)
export async function initializeNotificationChannels() {
  if (Platform.OS === 'android') {
    await createNotificationChannel('messages', 'Messages', Notifications.AndroidImportance.HIGH);
    await createNotificationChannel('badges', 'Badges & Achievements', Notifications.AndroidImportance.DEFAULT);
    await createNotificationChannel('courses', 'Courses', Notifications.AndroidImportance.DEFAULT);
    await createNotificationChannel('streams', 'Live Streams', Notifications.AndroidImportance.HIGH);
    await createNotificationChannel('social', 'Social', Notifications.AndroidImportance.DEFAULT);
  }
}
