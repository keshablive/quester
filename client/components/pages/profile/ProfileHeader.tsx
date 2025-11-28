import * as React from 'react';
import { View } from 'react-native';
import { Text, Card, Button, Icon, Avatar, AvatarFallback } from '@/components/ui';
import { User as UserIcon, Edit, Share2 } from 'lucide-react-native';

export function ProfileHeader() {
  return (
    <Card className="p-6">
      <View className="items-center gap-4">
        <Avatar alt="User Avatar" className="w-24 h-24">
          <AvatarFallback>
            <Icon as={UserIcon} size={40} />
          </AvatarFallback>
        </Avatar>
        
        <View className="items-center gap-1">
          <Text className="text-2xl font-bold">John Doe</Text>
          <Text className="text-muted-foreground">Product Designer</Text>
        </View>

        <View className="flex-row gap-2 mt-2">
          <Button variant="default">
            <Icon as={Edit} size={16} />
            <Text>Edit Profile</Text>
          </Button>
          <Button variant="outline">
            <Icon as={Share2} size={16} />
            <Text>Share</Text>
          </Button>
        </View>
      </View>
    </Card>
  );
}
