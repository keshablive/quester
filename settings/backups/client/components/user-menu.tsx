import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/lib/hooks/useAuth';
import { cn } from '@/lib/utils';
import type { TriggerRef } from '@rn-primitives/popover';
import { LogOutIcon, PlusIcon, SettingsIcon, TrophyIcon, FlameIcon } from 'lucide-react-native';
import * as React from 'react';
import { View, Alert, ActivityIndicator } from 'react-native';

interface UserMenuProps {
  onLogoutSuccess?: () => void;
  onNavigateToSettings?: () => void;
  onNavigateToAddAccount?: () => void;
}

export function UserMenu({
  onLogoutSuccess,
  onNavigateToSettings,
  onNavigateToAddAccount,
}: UserMenuProps) {
  const { user, logout, isLoading: _isLoading } = useAuth();
  const popoverTriggerRef = React.useRef<TriggerRef>(null);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  async function onSignOut() {
    if (!user) return;

    // Confirm logout
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            setIsLoggingOut(true);
            popoverTriggerRef.current?.close();

            await logout();

            if (onLogoutSuccess) {
              onLogoutSuccess();
            }
          } catch (error) {
            console.error('Logout failed:', error);
            Alert.alert('Error', 'Failed to sign out. Please try again.');
          } finally {
            setIsLoggingOut(false);
          }
        },
      },
    ]);
  }

  // Don't render if no user
  if (!user) {
    return null;
  }

  // Get user initials
  const initials = user.username
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Popover>
      <PopoverTrigger asChild ref={popoverTriggerRef}>
        <Button variant="ghost" size="icon" className="size-8 rounded-full">
          <UserAvatar initials={initials} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="center" side="bottom" className="w-80 p-0">
        <View className="gap-3 border-b border-border p-3">
          <View className="flex-row items-center gap-3">
            <UserAvatar initials={initials} className="size-10" />
            <View className="flex-1">
              <Text variant="h4" className="leading-5">
                {user.username}
              </Text>
              <Text variant="small" className="leading-4 text-muted-foreground">
                {user.email}
              </Text>
              <Text variant="small" className="mt-0.5 leading-4 text-muted-foreground">
                {user.role}
              </Text>
            </View>
          </View>

          {/* Gamification Stats */}
          <View className="gap-2 rounded-lg bg-muted/30 p-3">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-1.5">
                <Icon as={TrophyIcon} className="size-4 text-yellow-500" />
                <Text variant="small" className="font-medium">
                  Level {user.level}
                </Text>
              </View>
              <Text variant="small" className="text-muted-foreground">
                {user.tier} Tier
              </Text>
            </View>

            <View className="flex-row items-center justify-between">
              <Text variant="small" className="text-muted-foreground">
                XP: {user.xp}
              </Text>
              {user.loginStreak > 0 && (
                <View className="flex-row items-center gap-1">
                  <Icon as={FlameIcon} className="size-3 text-orange-500" />
                  <Text variant="small" className="font-medium">
                    {user.loginStreak}-day streak
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View className="flex-row flex-wrap gap-3 py-0.5">
            <Button
              variant="outline"
              size="sm"
              onPress={onNavigateToSettings}
              disabled={isLoggingOut}>
              <Icon as={SettingsIcon} className="size-4" />
              <Text>Manage Account</Text>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onPress={onSignOut}
              disabled={isLoggingOut}>
              {isLoggingOut ? (
                <ActivityIndicator size="small" />
              ) : (
                <>
                  <Icon as={LogOutIcon} className="size-4" />
                  <Text>Sign Out</Text>
                </>
              )}
            </Button>
          </View>
        </View>
        <Button
          variant="ghost"
          size="lg"
          className="h-16 justify-start gap-3 rounded-none rounded-b-md px-3 sm:h-14"
          onPress={onNavigateToAddAccount}
          disabled={isLoggingOut}>
          <View className="size-10 items-center justify-center">
            <View className="size-7 items-center justify-center rounded-full border border-dashed border-border bg-muted/50">
              <Icon as={PlusIcon} className="size-5" />
            </View>
          </View>
          <Text>Add account</Text>
        </Button>
      </PopoverContent>
    </Popover>
  );
}

interface UserAvatarProps extends Omit<React.ComponentProps<typeof Avatar>, 'alt'> {
  initials: string;
}

function UserAvatar({ initials, className, ...props }: UserAvatarProps) {
  return (
    <Avatar alt={`User avatar`} className={cn('size-8', className)} {...props}>
      <AvatarFallback>
        <Text>{initials}</Text>
      </AvatarFallback>
    </Avatar>
  );
}
