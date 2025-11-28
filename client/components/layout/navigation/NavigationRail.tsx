import * as React from 'react';
import { View, Pressable, Animated, ScrollView } from 'react-native';
import { usePathname } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { NavigationItem } from './NavigationItem';
import { NavigationProps } from './types';
import { cn, appConfig, animationConfig, layoutConfig } from '@/core';

/**
 * NavigationRail Component
 * 
 * A vertical navigation sidebar for desktop/tablet layouts.
 * Supports expansion/collapse and scrollable content.
 * 
 * @param isExpanded - Whether the rail is expanded
 * @param onToggle - Function to toggle expansion state
 */
const NavigationRailComponent = ({ isExpanded, onToggle }: NavigationProps) => {
  const pathname = usePathname();
  const animatedWidth = React.useRef(
    new Animated.Value(
      isExpanded ? layoutConfig.navigationRail.expandedWidth : layoutConfig.navigationRail.collapsedWidth
    )
  ).current;
  const [containerHeight, setContainerHeight] = React.useState(0);
  const [contentHeight, setContentHeight] = React.useState(0);

  React.useEffect(() => {
    Animated.spring(animatedWidth, {
      toValue: isExpanded 
        ? layoutConfig.navigationRail.expandedWidth 
        : layoutConfig.navigationRail.collapsedWidth,
      useNativeDriver: false,
      friction: animationConfig.spring.friction,
      tension: animationConfig.spring.tension,
    }).start();
  }, [isExpanded, animatedWidth]);

  const needsScroll = !isExpanded && contentHeight > containerHeight;

  const contentContainerStyle = React.useMemo(
    () => ({
      paddingRight: isExpanded ? 4 : 0,
      flexGrow: isExpanded ? 1 : 0,
      justifyContent: isExpanded ? ('center' as const) : undefined,
    }),
    [isExpanded]
  );

  const navItemsClasses = React.useMemo(
    () => cn('flex-row flex-wrap gap-4 justify-center'),
    [isExpanded]
  );

  return (
    <SafeAreaView edges={['top', 'bottom']} className="border-r border-border bg-card">
      <Animated.View
        style={{ width: animatedWidth }}
        className="relative h-full flex-col overflow-hidden border-r border-border bg-card">
        {/* Expand/Collapse Toggle Button */}
        <View className="absolute right-0 top-1/2 -translate-y-1/2" style={{ zIndex: 9999 }}>
          <Pressable
            onPress={onToggle}
            className={cn(
              'h-12 w-6 rounded-l-full',
              'items-center justify-center bg-primary',
              'shadow-lg transition-transform active:scale-95'
            )}
            style={{
              transform: [{ translateY: -24 }],
              shadowColor: '#000',
              shadowOffset: { width: -4, height: 0 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 8,
            }}>
            {isExpanded ? (
              <ChevronLeft className="text-primary-foreground" size={16} strokeWidth={3} />
            ) : (
              <ChevronRight className="text-primary-foreground" size={16} strokeWidth={3} />
            )}
          </Pressable>
        </View>

        {/* Navigation Items - Scrollable */}
        {isExpanded ? (
          <ScrollView
            className="flex-1 p-4"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={contentContainerStyle}>
            <View className={navItemsClasses}>
              {appConfig.navigation.map((item) => (
                <NavigationItem
                  key={item.href}
                  item={item}
                  isActive={pathname === item.href}
                  isExpanded={isExpanded}
                  orientation="vertical"
                />
              ))}
            </View>
          </ScrollView>
        ) : needsScroll ? (
          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}>
            <View
              className="flex-col items-start"
              onLayout={(e) => setContentHeight(e.nativeEvent.layout.height)}>
              {appConfig.navigation.map((item) => (
                <NavigationItem
                  key={item.href}
                  item={item}
                  isActive={pathname === item.href}
                  isExpanded={isExpanded}
                  orientation="vertical"
                />
              ))}
            </View>
          </ScrollView>
        ) : (
          <View
            className="flex-1 flex-col items-start justify-evenly p-1"
            onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}>
            <View onLayout={(e) => setContentHeight(e.nativeEvent.layout.height)}>
              {appConfig.navigation.map((item) => (
                <NavigationItem
                  key={item.href}
                  item={item}
                  isActive={pathname === item.href}
                  isExpanded={isExpanded}
                  orientation="vertical"
                />
              ))}
            </View>
          </View>
        )}
      </Animated.View>
    </SafeAreaView>
  );
};

/**
 * Memoized NavigationRail to prevent unnecessary re-renders
 */
export const NavigationRail = React.memo(NavigationRailComponent);
