/**
 * Quester Platform - Landing Screen
 *
 * Comprehensive landing page showcasing all platform features:
 * - Multi-tenant authentication system
 * - Gamification (XP, badges, leaderboards)
 * - LMS with courses and certificates
 * - Social features (feed, messaging, groups)
 * - Marketplace (properties, classifieds, escrow)
 * - Video streaming (live, reels, DVR)
 * - Analytics and reporting
 *
 * Implements WCAG 2.1 AA accessibility standards with React Native Reusables.
 *
 * @module landing-screen
 */

import React, { useState, useCallback } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { Link, Stack, useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { LinearGradient } from 'expo-linear-gradient';
import {
  MoonStarIcon,
  SunIcon,
  TrophyIcon,
  GraduationCapIcon,
  UsersIcon,
  ShoppingBagIcon,
  VideoIcon,
  BarChartIcon,
  ShieldIcon,
  ZapIcon,
  SparklesIcon,
  RocketIcon,
  StarIcon,
  ChevronRightIcon,
  MessageSquareIcon,
  AwardIcon,
  MapPinIcon,
  TrendingUpIcon,
  BellIcon,
  XIcon,
} from 'lucide-react-native';

// UI Components
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

// Feature Components
import { ScreenWrapper } from '@/components/screen-wrapper';
// import { useNotifications } from '@/lib/hooks/useNotifications';

const SCREEN_OPTIONS = {
  title: 'Quester Platform',
  headerTransparent: true,
  headerRight: () => (
    <View className="flex-row items-center gap-3">
      <NotificationBell />
      <ThemeToggle />
    </View>
  ),
};

// Platform features configuration
const PLATFORM_FEATURES = [
  {
    id: 'gamification',
    icon: TrophyIcon,
    title: 'Gamification',
    description: 'Earn XP, unlock badges, and climb leaderboards',
    route: '/badges',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    stats: { value: '1,234', label: 'XP Earned' },
  },
  {
    id: 'lms',
    icon: GraduationCapIcon,
    title: 'Learning Hub',
    description: 'Interactive courses with certificates',
    route: '/(tabs)/courses',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    stats: { value: '24', label: 'Active Courses' },
  },
  {
    id: 'social',
    icon: UsersIcon,
    title: 'Social Network',
    description: 'Connect, share, and engage with community',
    route: '/(tabs)/feed',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    stats: { value: '5.2K', label: 'Members' },
  },
  {
    id: 'marketplace',
    icon: ShoppingBagIcon,
    title: 'Marketplace',
    description: 'Properties, classifieds, and secure escrow',
    route: '/marketplace',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    stats: { value: '342', label: 'Listings' },
  },
  {
    id: 'video',
    icon: VideoIcon,
    title: 'Video Platform',
    description: 'Live streams, reels, and DVR playback',
    route: '/(tabs)/videos',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    stats: { value: 'Live', label: 'Now Streaming' },
  },
  {
    id: 'analytics',
    icon: BarChartIcon,
    title: 'Analytics',
    description: 'Real-time insights and custom reports',
    route: '/analytics-dashboard',
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10',
    stats: { value: '98%', label: 'Platform Uptime' },
  },
] as const;

// Quick actions for authenticated users
const QUICK_ACTIONS = [
  { icon: MessageSquareIcon, label: 'Messages', route: '/(tabs)/messages', badge: '3' },
  { icon: AwardIcon, label: 'Badges', route: '/badges', badge: null },
  { icon: MapPinIcon, label: 'Properties', route: '/properties', badge: null },
  { icon: TrendingUpIcon, label: 'Reports', route: '/reports', badge: null },
] as const;

// Platform stats
const PLATFORM_STATS = [
  { value: '10K+', label: 'Active Users', icon: UsersIcon },
  { value: '50K+', label: 'XP Awarded', icon: SparklesIcon },
  { value: '200+', label: 'Courses', icon: GraduationCapIcon },
  { value: '99.9%', label: 'Uptime', icon: ZapIcon },
] as const;

export default function LandingScreen() {
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState('features');
  const [isLoading, setIsLoading] = useState(false);

  // Animated value for hero section
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(50);

  // Animate hero on mount
  React.useEffect(() => {
    opacity.value = withSpring(1, { damping: 20, stiffness: 90 });
    translateY.value = withSpring(0, { damping: 20, stiffness: 90 });
  }, []);

  // Navigate to feature
  const handleFeaturePress = useCallback(
    (route: string) => {
      setIsLoading(true);
      setTimeout(() => {
        router.push(route as any);
        setIsLoading(false);
      }, 300);
    },
    [router]
  );

  return (
    <ScreenWrapper screenName="LandingScreen">
      <Stack.Screen options={SCREEN_OPTIONS} />
      <ScrollView
        className="flex-1 bg-background"
        showsVerticalScrollIndicator={false}
        accessibilityLabel="Quester platform landing page">
        {/* Hero Section */}
        <Animated.View
          style={useAnimatedStyle(() => ({
            opacity: opacity.value,
            transform: [{ translateY: translateY.value }],
          }))}>
          <View className="relative overflow-hidden px-6 pb-8 pt-20">
            {/* Animated Gradient Background - Enhanced */}
            <LinearGradient
              colors={[
                'rgba(139, 92, 246, 0.3)',
                'rgba(59, 130, 246, 0.25)',
                'rgba(236, 72, 153, 0.15)',
                'rgba(139, 92, 246, 0.1)',
                'transparent',
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="absolute inset-0"
            />

            {/* Logo & Title */}
            <View className="items-center gap-4">
              {/* Glassmorphism Logo Container - Enhanced with Float Animation */}
              <View className="relative animate-float">
                <LinearGradient
                  colors={['rgba(139, 92, 246, 0.95)', 'rgba(59, 130, 246, 0.95)', 'rgba(236, 72, 153, 0.9)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  className="h-24 w-24 items-center justify-center rounded-3xl shadow-2xl"
                  style={{
                    shadowColor: '#8B5CF6',
                    shadowOffset: { width: 0, height: 12 },
                    shadowOpacity: 0.6,
                    shadowRadius: 24,
                    elevation: 15,
                  }}>
                  <Icon as={RocketIcon} size={44} className="text-white animate-glow-pulse" />
                </LinearGradient>
                {/* Enhanced Glow Effect */}
                <View
                  className="absolute -inset-3 rounded-3xl opacity-40"
                  style={{
                    backgroundColor: 'rgba(139, 92, 246, 0.5)',
                    filter: 'blur(30px)',
                  }}
                />
              </View>

              <View className="items-center gap-2">
                <Text variant="h1" className="text-center">
                  Welcome to Quester
                </Text>
                <Badge variant="secondary" className="mt-2">
                  <Icon as={ShieldIcon} size={12} />
                  <Text className="ml-1 text-xs">Multi-Tenant Platform</Text>
                </Badge>
              </View>

              <Text variant="muted" className="max-w-md text-center">
                The all-in-one platform for learning, gaming, social networking, and marketplace
                activities with enterprise-grade security.
              </Text>
            </View>

            {/* CTA Buttons */}
            <View className="mt-8">
              <Button
                className="w-full"
                size="lg"
                onPress={() => handleFeaturePress('/(tabs)/feed')}
                accessibilityLabel="Get started with Quester"
                accessibilityHint="Navigates to the main feed">
                <Icon as={RocketIcon} size={20} />
                <Text className="text-base font-semibold">Get Started</Text>
              </Button>
            </View>
          </View>
        </Animated.View>

        {/* Platform Stats - Enhanced */}
        <View className="px-6 py-8">
          <View className="flex-row flex-wrap justify-between gap-4">
            {PLATFORM_STATS.map((stat, index) => (
              <Card key={stat.label} className="w-[48%] border-2 border-primary/20 bg-card/80 backdrop-blur-sm">
                <CardContent className="items-center gap-2 pt-6">
                  <Icon as={stat.icon} size={28} className="text-primary animate-glow-pulse" />
                  <AnimatedCounter value={stat.value} delay={index * 150} />
                  <Text
                    variant="muted"
                    className="text-center text-xs font-medium"
                    testID={`stat-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}>
                    {stat.label}
                  </Text>
                </CardContent>
              </Card>
            ))}
          </View>
        </View>

        <Separator />

        {/* Features Section */}
        <View className="px-6 py-8">
          <View className="mb-6">
            <Text variant="h2" className="mb-2">
              Platform Features
            </Text>
            <Text variant="muted">Everything you need in one powerful platform</Text>
          </View>

          <Tabs
            value={selectedTab}
            onValueChange={setSelectedTab}
            className="w-full"
            accessibilityRole="tablist"
            accessibilityLabel="Feature categories">
            <TabsList className="w-full">
              <TabsTrigger value="features" className="flex-1">
                <Text>All Features</Text>
              </TabsTrigger>
              <TabsTrigger value="quick" className="flex-1">
                <Text>Quick Access</Text>
              </TabsTrigger>
            </TabsList>

            {/* All Features Tab */}
            <TabsContent value="features">
              <View className="gap-4 pt-4">
                {PLATFORM_FEATURES.map((feature, index) => (
                  <FeatureCard
                    key={feature.id}
                    feature={feature}
                    onPress={() => handleFeaturePress(feature.route)}
                    index={index}
                    accessibilityLabel={`${feature.title}: ${feature.description}`}
                    accessibilityHint={`Navigate to ${feature.title}`}
                  />
                ))}
              </View>
            </TabsContent>

            {/* Quick Actions Tab */}
            <TabsContent value="quick">
              <View className="gap-4 pt-4">
                {QUICK_ACTIONS.map((action) => (
                  <Card
                    key={action.label}
                    className="border-muted"
                    accessibilityRole="button"
                    accessibilityLabel={action.label}>
                    <Pressable
                      onPress={() => handleFeaturePress(action.route)}
                      className="active:opacity-70">
                      <CardContent className="flex-row items-center justify-between py-4">
                        <View className="flex-row items-center gap-3">
                          <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            <Icon as={action.icon} size={20} className="text-primary" />
                          </View>
                          <Text variant="large">{action.label}</Text>
                        </View>

                        <View className="flex-row items-center gap-2">
                          {action.badge && (
                            <Badge variant="destructive">
                              <Text className="text-xs">{action.badge}</Text>
                            </Badge>
                          )}
                          <Icon as={ChevronRightIcon} size={20} className="text-muted-foreground" />
                        </View>
                      </CardContent>
                    </Pressable>
                  </Card>
                ))}
              </View>
            </TabsContent>
          </Tabs>
        </View>

        <Separator />

        {/* Technology Stack */}
        <View className="px-6 py-8">
          <View className="mb-6">
            <Text variant="h2" className="mb-2">
              Built with Modern Tech
            </Text>
            <Text variant="muted">
              Powered by React Native, Go, PostgreSQL, and enterprise-grade infrastructure
            </Text>
          </View>

          <Card className="border-muted">
            <CardContent className="gap-4 pt-6">
              <TechStackItem
                label="React Native 0.79.5"
                description="Cross-platform mobile development"
                progress={100}
              />
              <TechStackItem
                label="Go 1.24+ Backend"
                description="High-performance API server"
                progress={100}
              />
              <TechStackItem
                label="PostgreSQL 15+"
                description="Robust multi-tenant database"
                progress={100}
              />
              <TechStackItem
                label="Redis 7.0+"
                description="Caching and real-time features"
                progress={100}
              />
            </CardContent>
          </Card>
        </View>

        <Separator />

        {/* Footer */}
        <View className="items-center gap-4 px-6 py-12">
          <View className="flex-row gap-3">
            <Link href="https://reactnativereusables.com" asChild>
              <Button variant="outline" size="sm">
                <Text>RNR Docs</Text>
                <Icon as={StarIcon} size={14} />
              </Button>
            </Link>

            <Button variant="outline" size="sm" onPress={() => handleFeaturePress('/settings')}>
              <Text>Settings</Text>
            </Button>
          </View>

          <Text variant="muted" className="text-center text-xs">
            Quester Platform v1.0.0
          </Text>
          <Text variant="muted" className="text-center text-xs">
            © 2025 - Built with React Native Reusables
          </Text>
        </View>

        {/* Loading Overlay */}
        {isLoading && (
          <View className="absolute inset-0 items-center justify-center bg-background/80">
            <Card className="w-48 border-muted">
              <CardContent className="items-center gap-4 py-6">
                <Skeleton className="h-12 w-12 rounded-full" />
                <Text variant="muted">Loading...</Text>
              </CardContent>
            </Card>
          </View>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

// Feature Card Component
interface FeatureCardProps {
  feature: (typeof PLATFORM_FEATURES)[number];
  onPress: () => void;
  index: number;
  accessibilityLabel: string;
  accessibilityHint: string;
}

function FeatureCard({
  feature,
  onPress,
  index,
  accessibilityLabel,
  accessibilityHint,
}: FeatureCardProps) {
  const cardOpacity = useSharedValue(0);
  const scale = useSharedValue(1);
  const iconRotation = useSharedValue(0);
  const iconScale = useSharedValue(1);

  React.useEffect(() => {
    setTimeout(() => {
      cardOpacity.value = withSpring(1, { damping: 15 });
      // Add subtle icon pulse animation
      iconScale.value = withRepeat(
        withSequence(withTiming(1.1, { duration: 1000 }), withTiming(1, { duration: 1000 })),
        -1,
        true
      );
    }, index * 100);
  }, [index]);

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 150 });
    iconRotation.value = withSpring(5, { damping: 10 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
    iconRotation.value = withSpring(0, { damping: 10 });
  };

  const animatedCardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: scale.value }],
  }));

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${iconRotation.value}deg` }, { scale: iconScale.value }],
  }));

  return (
    <Animated.View style={animatedCardStyle}>
      <Card
        className="relative overflow-hidden border-muted"
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}>
        {/* Gradient Border Effect - Enhanced */}
        <LinearGradient
          colors={['rgba(139, 92, 246, 0.5)', 'rgba(59, 130, 246, 0.4)', 'rgba(236, 72, 153, 0.3)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="absolute inset-0 rounded-lg"
          style={{ opacity: 0.6 }}
        />
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          className="active:opacity-90">
          <CardContent className="flex-row items-center gap-4 py-4">
            {/* Icon with Animation */}
            <Animated.View
              style={animatedIconStyle}
              className={`h-14 w-14 items-center justify-center rounded-xl ${feature.bgColor}`}>
              <Icon as={feature.icon} size={28} className={feature.color} />
            </Animated.View>

            {/* Content */}
            <View className="flex-1 gap-1">
              <Text variant="large" className="font-semibold">
                {feature.title}
              </Text>
              <Text variant="muted" className="text-sm">
                {feature.description}
              </Text>

              {/* Stats */}
              <View className="mt-2 flex-row items-center gap-2">
                <Badge variant="secondary">
                  <Text className="text-xs">{feature.stats.value}</Text>
                </Badge>
                <Text variant="muted" className="text-xs">
                  {feature.stats.label}
                </Text>
              </View>
            </View>

            {/* Arrow */}
            <Icon as={ChevronRightIcon} size={24} className="text-muted-foreground" />
          </CardContent>
        </Pressable>
      </Card>
    </Animated.View>
  );
}

// Tech Stack Item Component
interface TechStackItemProps {
  label: string;
  description: string;
  progress: number;
}

function TechStackItem({ label, description, progress }: TechStackItemProps) {
  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text variant="large" className="font-medium">
            {label}
          </Text>
          <Text variant="muted" className="text-sm">
            {description}
          </Text>
        </View>
        <Badge variant="outline">
          <Text className="text-xs">{progress}%</Text>
        </Badge>
      </View>
      <Progress value={progress} className="h-2" aria-label={`${label} implementation progress`} />
    </View>
  );
}

// Theme Toggle Component
const THEME_ICONS = {
  light: SunIcon,
  dark: MoonStarIcon,
};

function ThemeToggle() {
  const { colorScheme, toggleColorScheme } = useColorScheme();

  return (
    <Button
      onPress={toggleColorScheme}
      size="icon"
      variant="ghost"
      className="ios:size-9 rounded-full"
      accessibilityRole="button"
      accessibilityLabel={`Switch to ${colorScheme === 'light' ? 'dark' : 'light'} mode`}
      accessibilityHint="Toggles between light and dark theme">
      <Icon as={THEME_ICONS[colorScheme ?? 'light']} className="size-5" />
    </Button>
  );
}

// Animated Counter Component
interface AnimatedCounterProps {
  value: string;
  delay?: number;
}

function AnimatedCounter({ value, delay = 0 }: AnimatedCounterProps) {
  // Extract number from string like "10K+" or "99.9%"
  const numericValue = parseFloat(value.replace(/[^0-9.]/g, ''));
  const suffix = value.replace(/[0-9.]/g, '');
  const isPercentage = suffix.includes('%');
  const hasK = suffix.includes('K');
  const hasPlus = suffix.includes('+');

  const count = useSharedValue(0);
  const [displayValue, setDisplayValue] = useState('0');

  React.useEffect(() => {
    setTimeout(() => {
      count.value = withTiming(numericValue, {
        duration: 2000,
        easing: (t) => {
          // Ease out cubic
          return 1 - Math.pow(1 - t, 3);
        },
      });
    }, delay);

    // Update display value
    const interval = setInterval(() => {
      const currentValue = count.value;
      let formatted = currentValue.toFixed(hasK ? 1 : 0);
      if (hasK) formatted += 'K';
      if (hasPlus) formatted += '+';
      if (isPercentage) formatted += '%';
      setDisplayValue(formatted);
    }, 16); // ~60fps

    return () => clearInterval(interval);
  }, [delay, numericValue, hasK, hasPlus, isPercentage]);

  return (
    <Text variant="h3" className="text-center">
      {displayValue}
    </Text>
  );
}

// Notification Bell Component
function NotificationBell() {
  const [showDropdown, setShowDropdown] = useState(false);
  const router = useRouter();

  // TEMPORARY: Using mock data until backend is ready
  // TODO: Uncomment when backend server is running
  /*
  const {
    notifications,
    unreadCount,
    markAsRead,
    isLoading,
  } = useNotifications({ 
    autoSubscribe: true, 
    enablePushNotifications: false
  });
  */

  // Mock notification data for now
  const notifications = [
    {
      id: '1',
      title: 'New Badge Earned! 🏆',
      message: 'You earned the "Quick Learner" badge for completing 5 quests',
      type: 'badge_earned',
      read_at: null,
      created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    },
    {
      id: '2',
      title: 'Course Update 📚',
      message: 'New lesson "Advanced React Patterns" is now available',
      type: 'course_update',
      read_at: null,
      created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    },
    {
      id: '3',
      title: 'Quest Completed! 🎉',
      message: 'Congratulations on completing "Build Your First App"',
      type: 'quest_completed',
      read_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '4',
      title: 'New Follower 👥',
      message: 'Sarah Johnson started following you',
      type: 'follow',
      read_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    },
  ];

  const unreadCount = notifications.filter((n) => !n.read_at).length;
  const isLoading = false;

  // Format timestamp to relative time
  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

      if (diff < 60) return 'Just now';
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
      return `${Math.floor(diff / 86400)}d ago`;
    } catch {
      return timestamp;
    }
  };

  const handleNotificationPress = (_notif: any) => {
    // TODO: Uncomment when backend is ready
    // if (!_notif.read_at) {
    //   markAsRead(_notif.id);
    // }
    setShowDropdown(false);
    router.push('/notifications');
  };

  return (
    <View className="relative">
      <Button
        onPress={() => setShowDropdown(!showDropdown)}
        size="icon"
        variant="ghost"
        className="ios:size-9 relative rounded-full"
        accessibilityRole="button"
        accessibilityLabel={`Notifications, ${unreadCount} unread`}
        accessibilityHint="Opens notification dropdown">
        <Icon as={BellIcon} className="size-5" />
        {unreadCount > 0 && (
          <View className="absolute right-1 top-1 h-4 w-4 items-center justify-center rounded-full bg-red-500">
            <Text className="text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Text>
          </View>
        )}
      </Button>

      {/* Notification Dropdown */}
      {showDropdown && (
        <View className="absolute right-0 top-12 z-50 w-80 rounded-lg border border-border bg-background shadow-2xl">
          {/* Header */}
          <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
            <Text variant="large" className="font-semibold">
              Notifications
            </Text>
            <Pressable onPress={() => setShowDropdown(false)}>
              <Icon as={XIcon} size={20} className="text-muted-foreground" />
            </Pressable>
          </View>

          {/* Notifications List */}
          <ScrollView className="max-h-96">
            {isLoading ? (
              <View className="items-center py-8">
                <Text variant="muted" className="mt-2">
                  Loading notifications...
                </Text>
              </View>
            ) : notifications.length === 0 ? (
              <View className="items-center py-8">
                <Icon as={BellIcon} size={48} className="text-muted-foreground opacity-30" />
                <Text variant="muted" className="mt-2">
                  No notifications yet
                </Text>
              </View>
            ) : (
              notifications.map((notif) => (
                <Pressable
                  key={notif.id}
                  onPress={() => handleNotificationPress(notif)}
                  className="border-b border-border px-4 py-3 active:bg-muted">
                  <View className="flex-row items-start gap-3">
                    {!notif.read_at && <View className="mt-1 h-2 w-2 rounded-full bg-primary" />}
                    <View className="flex-1">
                      <Text variant="large" className="font-semibold">
                        {notif.title}
                      </Text>
                      <Text variant="muted" className="text-sm">
                        {notif.message}
                      </Text>
                      <Text variant="muted" className="mt-1 text-xs">
                        {formatTime(notif.created_at)}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))
            )}
          </ScrollView>

          {/* Footer */}
          <Pressable
            onPress={() => {
              setShowDropdown(false);
              router.push('/notifications');
            }}
            className="border-t border-border px-4 py-3 active:bg-muted">
            <Text className="text-center font-semibold text-primary">View All Notifications</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
