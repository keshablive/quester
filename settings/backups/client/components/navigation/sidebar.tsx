import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Home, BookOpen, Trophy, BarChart3, User, ChevronRight, ChevronLeft } from 'lucide-react-native';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/lib/contexts/sidebar-context';

interface NavItem {
  id: string;
  label: string;
  icon: typeof Home;
  route: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: Home, route: '/' },
  { id: 'courses', label: 'Courses', icon: BookOpen, route: '/courses' },
  { id: 'quests', label: 'Quests', icon: Trophy, route: '/quests' },
  { id: 'leaderboard', label: 'Leaderboard', icon: BarChart3, route: '/leaderboard' },
  { id: 'profile', label: 'Profile', icon: User, route: '/profile' },
];

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { isExpanded, toggleSidebar, isMobile } = useSidebar();

  const handleNavigation = (route: string) => {
    router.push(route as any);
  };

  const isActive = (route: string) => {
    if (route === '/') return pathname === '/';
    return pathname?.startsWith(route);
  };

  // Mobile: Bottom Navigation Bar
  if (isMobile) {
    return (
      <View
        className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
          elevation: 8,
        }}
      >
        <View className="flex-row items-center justify-around px-2 py-2 safe-area-bottom">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.route);
            return (
              <Pressable
                key={item.id}
                onPress={() => handleNavigation(item.route)}
                className={cn(
                  'flex-1 items-center justify-center py-2 px-1 rounded-lg',
                  active && 'bg-blue-50 dark:bg-blue-900/20'
                )}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                accessibilityState={{ selected: active }}
              >
                <Icon
                  size={24}
                  className={cn(
                    active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
                  )}
                />
                <Text
                  className={cn(
                    'text-xs mt-1',
                    active
                      ? 'text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-gray-600 dark:text-gray-400'
                  )}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  // Desktop & Tablet: Expandable Rail
  if (!isMobile) {
    const sidebarWidth = isExpanded ? 240 : 64;
    return (
      <View
        className="h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300"
        style={{
          width: sidebarWidth,
        }}
      >
        {/* Toggle Button (Chevron) */}
        <View className="absolute -right-3 top-20 z-10">
          <Pressable
            onPress={toggleSidebar}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full p-1 shadow-md"
            accessibilityRole="button"
            accessibilityLabel={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {isExpanded ? (
              <ChevronLeft size={16} className="text-gray-600 dark:text-gray-400" />
            ) : (
              <ChevronRight size={16} className="text-gray-600 dark:text-gray-400" />
            )}
          </Pressable>
        </View>

        {/* Navigation Items */}
        <View className="flex-1 pt-4 pb-4">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.route);
            return (
              <Pressable
                key={item.id}
                onPress={() => handleNavigation(item.route)}
                className={cn(
                  'flex-row items-center py-3 mx-2 my-1 rounded-lg',
                  isExpanded ? 'px-4' : 'justify-center px-0',
                  active && 'bg-blue-50 dark:bg-blue-900/20'
                )}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                accessibilityState={{ selected: active }}
              >
                <Icon
                  size={24}
                  className={cn(
                    active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
                  )}
                />
                {isExpanded && (
                  <Text
                    className={cn(
                      'ml-3 text-base',
                      active
                        ? 'text-blue-600 dark:text-blue-400 font-semibold'
                        : 'text-gray-700 dark:text-gray-300'
                    )}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  return null;
}
