import * as React from 'react';
import { View } from 'react-native';
import { Text, Card, Switch, Label, Icon, Checkbox } from '@/components/ui';
import { Lock, Eye, EyeOff } from 'lucide-react-native';

export function PrivacySettings() {
  const [privateProfile, setPrivateProfile] = React.useState(false);
  const [hideActivity, setHideActivity] = React.useState(true);
  const [allowTagging, setAllowTagging] = React.useState(true);

  return (
    <Card className="p-4 gap-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3 flex-1">
          <Icon as={Lock} size={20} />
          <View className="flex-1">
            <Label nativeID="private">Private Profile</Label>
            <Text className="text-sm text-muted-foreground">
              Only approved followers can see your posts
            </Text>
          </View>
        </View>
        <Switch 
          checked={privateProfile}
          onCheckedChange={setPrivateProfile}
          nativeID="private"
        />
      </View>

      <View className="flex-row items-center gap-3">
        <Checkbox 
          checked={hideActivity}
          onCheckedChange={setHideActivity}
          nativeID="hide-activity"
        />
        <View className="flex-1">
          <Label nativeID="hide-activity-label">Hide Activity Status</Label>
          <Text className="text-sm text-muted-foreground">
            Don't show when you're online
          </Text>
        </View>
      </View>

      <View className="flex-row items-center gap-3">
        <Checkbox 
          checked={allowTagging}
          onCheckedChange={setAllowTagging}
          nativeID="allow-tagging"
        />
        <View className="flex-1">
          <Label nativeID="allow-tagging-label">Allow Tagging</Label>
          <Text className="text-sm text-muted-foreground">
            Let others tag you in posts
          </Text>
        </View>
      </View>
    </Card>
  );
}
