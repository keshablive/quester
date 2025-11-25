import React from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { Search, Bell, User } from 'lucide-react-native';
import { useRouter, usePathname } from 'expo-router';
import { cn } from '@/lib/utils';

interface AppBarProps {
  className?: string;
}

export function AppBar({ className }: AppBarProps) {
  const router = useRouter();

  const handleSearch = () => {
    console.log('[AppBar] Search clicked');
    // TODO: Navigate to search or open search modal
  };

  const handleNotifications = () => {
    console.log('[AppBar] Notifications clicked');
    router.push('/notifications');
  };

  const handleProfile = () => {
    console.log('[AppBar] Profile clicked');
    router.push('/profile');
  };

  return (
    <View
      className={cn(
        'flex-row items-center justify-between bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800',
        Platform.OS === 'web' ? 'px-6 py-4' : 'px-4 py-3 pt-12',
        className
      )}
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 3,
      }}
    >
      {/* Left Side - Logo */}
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={() => router.push('/')}
          className="flex-row items-center gap-2"
          accessibilityRole="button"
          accessibilityLabel="Quester Home"
        >
          <View className="w-8 h-8 bg-blue-600 rounded-lg items-center justify-center">
            <Text className="text-white font-bold text-lg">Q</Text>
          </View>
          <Text className="text-xl font-bold text-gray-900 dark:text-white">
            Quester
          </Text>
        </Pressable>
      </View>

      {/* Right Side - Action Icons */}
      <View className="flex-row items-center gap-2">
        {/* Search Button */}
        <Pressable
          onPress={handleSearch}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700"
          accessibilityRole="button"
          accessibilityLabel="Search"
        >
          <Search size={22} className="text-gray-700 dark:text-gray-300" />
        </Pressable>

        {/* Notifications Button */}
        <Pressable
          onPress={handleNotifications}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 relative"
          accessibilityRole="button"
          accessibilityLabel="Notifications"
        >
          <Bell size={22} className="text-gray-700 dark:text-gray-300" />
          {/* Notification Badge */}
          <View className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </Pressable>

        {/* User Profile Button */}
        <Pressable
          onPress={handleProfile}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700"
          accessibilityRole="button"
          accessibilityLabel="User Profile"
        >
          <User size={22} className="text-gray-700 dark:text-gray-300" />
        </Pressable>
      </View>
    </View>
  );
}
