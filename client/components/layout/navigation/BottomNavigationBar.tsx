import * as React from 'react';
import { View, Pressable, Animated, ScrollView } from 'react-native';
import { usePathname } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronUp, ChevronDown } from 'lucide-react-native';
import { NavigationItem } from './NavigationItem';
import { NavigationProps } from './types';
import { cn, appConfig, animationConfig, layoutConfig } from '@/core';

/**
 * BottomNavigationBar Component
 * 
 * A horizontal navigation bar for mobile layouts.
 * Supports expansion/collapse and scrollable content.
 * 
 * @param isExpanded - Whether the bar is expanded
 * @param onToggle - Function to toggle expansion state
 */
const BottomNavigationBarComponent = ({ isExpanded, onToggle }: NavigationProps) => {
  const pathname = usePathname();
  const animatedHeight = React.useRef(
    new Animated.Value(
      isExpanded ? layoutConfig.bottomNav.expandedHeight : layoutConfig.bottomNav.collapsedHeight
    )
  ).current;
  const [containerWidth, setContainerWidth] = React.useState(0);
  const [contentWidth, setContentWidth] = React.useState(0);

  React.useEffect(() => {
    Animated.spring(animatedHeight, {
      toValue: isExpanded 
        ? layoutConfig.bottomNav.expandedHeight 
        : layoutConfig.bottomNav.collapsedHeight,
      useNativeDriver: false,
      friction: animationConfig.spring.friction,
      tension: animationConfig.spring.tension,
    }).start();
  }, [isExpanded, animatedHeight]);

  const needsScroll = !isExpanded && contentWidth > containerWidth;

  const expandedContentStyle = React.useMemo(
    () => ({
      paddingBottom: 8,
      flexGrow: 1,
      justifyContent: 'center' as const,
    }),
    []
  );

  return (
    <SafeAreaView edges={['bottom']} className="border-t border-border bg-card">
      <Animated.View style={{ height: animatedHeight }} className="relative overflow-hidden">
        {/* Expand/Collapse Toggle Button */}
        <Pressable
          onPress={onToggle}
          className={cn(
            'absolute -top-3 left-1/2 h-6 w-12 rounded-t-full',
            'items-center justify-center bg-primary shadow-lg',
            'transition-transform active:scale-95'
          )}
          style={{
            zIndex: 9999,
            transform: [{ translateX: -24 }],
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 8,
          }}>
          {isExpanded ? (
            <ChevronDown size={16} className="text-primary-foreground" strokeWidth={3} />
          ) : (
            <ChevronUp size={16} className="text-primary-foreground" strokeWidth={3} />
          )}
        </Pressable>

        {/* Navigation Items - Scrollable */}
        {isExpanded ? (
          <ScrollView
            className="flex-1 p-4 pt-6"
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={expandedContentStyle}>
            <View className="flex-row flex-wrap items-center justify-center gap-4">
              {appConfig.navigation.map((item) => (
                <NavigationItem
                  key={item.href}
                  item={item}
                  isActive={pathname === item.href}
                  isExpanded={isExpanded}
                  orientation="horizontal"
                />
              ))}
            </View>
          </ScrollView>
        ) : needsScroll ? (
          <ScrollView
            horizontal
            className="flex-1"
            showsHorizontalScrollIndicator={false}
            onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}>
            <View
              className="flex-row items-start p-1"
              onLayout={(e) => setContentWidth(e.nativeEvent.layout.width)}>
              {appConfig.navigation.map((item) => (
                <NavigationItem
                  key={item.href}
                  item={item}
                  isActive={pathname === item.href}
                  isExpanded={isExpanded}
                  orientation="horizontal"
                />
              ))}
            </View>
          </ScrollView>
        ) : (
          <View
            className="flex-1 flex-row items-start justify-evenly"
            onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}>
            <View
              className="flex-row"
              onLayout={(e) => setContentWidth(e.nativeEvent.layout.width)}>
              {appConfig.navigation.map((item) => (
                <NavigationItem
                  key={item.href}
                  item={item}
                  isActive={pathname === item.href}
                  isExpanded={isExpanded}
                  orientation="horizontal"
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
 * Memoized BottomNavigationBar to prevent unnecessary re-renders
 */
export const BottomNavigationBar = React.memo(BottomNavigationBarComponent);
