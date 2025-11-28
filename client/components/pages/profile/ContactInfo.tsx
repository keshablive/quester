import * as React from 'react';
import { View } from 'react-native';
import { Text, Card, Icon } from '@/components/ui';
import { Mail, MapPin, Calendar } from 'lucide-react-native';
import type { ContactItem } from './types';

export function ContactInfo() {
  const contacts: ContactItem[] = [
    { icon: Mail, value: 'john.doe@example.com' },
    { icon: MapPin, value: 'San Francisco, CA' },
    { icon: Calendar, value: 'Joined January 2023' },
  ];

  return (
    <Card className="p-4 gap-3">
      <Text className="font-semibold text-lg mb-2">Contact Information</Text>
      {contacts.map((item, index) => (
        <View key={index} className="flex-row items-center gap-3">
          <Icon as={item.icon} size={18} className="text-muted-foreground" />
          <Text className="text-muted-foreground">{item.value}</Text>
        </View>
      ))}
    </Card>
  );
}
