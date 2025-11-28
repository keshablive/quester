import * as React from 'react';
import { View } from 'react-native';
import { 
  Text, 
  Card, 
  RadioGroup, 
  RadioGroupItem, 
  Label, 
  Icon 
} from '@/components/ui';
import { Sun, Moon, Monitor } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

export function AppearanceSettings() {
  const { colorScheme, setColorScheme } = useColorScheme();

  return (
    <Card className="p-4">
      <View className="gap-4">
        <View>
          <Text className="font-medium mb-1">Theme</Text>
          <Text className="text-sm text-muted-foreground">
            Choose your preferred color scheme
          </Text>
        </View>

        <RadioGroup 
          value={colorScheme || 'system'} 
          onValueChange={(value) => setColorScheme(value as 'light' | 'dark' | 'system')}
          className="gap-3"
        >
          <View className="flex-row items-center gap-3">
            <RadioGroupItem value="light" aria-labelledby="light-label" />
            <View className="flex-row items-center gap-2 flex-1">
              <Icon as={Sun} size={18} className="text-muted-foreground" />
              <Label nativeID="light-label">Light</Label>
            </View>
          </View>

          <View className="flex-row items-center gap-3">
            <RadioGroupItem value="dark" aria-labelledby="dark-label" />
            <View className="flex-row items-center gap-2 flex-1">
              <Icon as={Moon} size={18} className="text-muted-foreground" />
              <Label nativeID="dark-label">Dark</Label>
            </View>
          </View>

          <View className="flex-row items-center gap-3">
            <RadioGroupItem value="system" aria-labelledby="system-label" />
            <View className="flex-row items-center gap-2 flex-1">
              <Icon as={Monitor} size={18} className="text-muted-foreground" />
              <Label nativeID="system-label">System</Label>
            </View>
          </View>
        </RadioGroup>
      </View>
    </Card>
  );
}
