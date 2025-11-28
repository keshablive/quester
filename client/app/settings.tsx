import { ScrollView } from 'react-native';
import { 
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  Text
} from '@/components/ui';
import { 
  AppearanceSettings, 
  NotificationSettings, 
  PrivacySettings, 
  AccountSettings 
} from '@/components/pages/settings';

export default function SettingsPage() {
  return (
    <ScrollView className="flex-1 p-6">
      <Text className="text-3xl font-bold mb-6">Settings</Text>
      <Text className="text-muted-foreground mb-6">
        Manage your account settings and preferences
      </Text>

      <Accordion
        type="multiple"
        collapsible
        defaultValue={['appearance', 'notifications']}
        className="gap-4"
      >
        <AccordionItem value="appearance">
          <AccordionTrigger>
            <Text className="text-lg font-semibold">Appearance</Text>
          </AccordionTrigger>
          <AccordionContent>
            <AppearanceSettings />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="notifications">
          <AccordionTrigger>
            <Text className="text-lg font-semibold">Notifications</Text>
          </AccordionTrigger>
          <AccordionContent>
            <NotificationSettings />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="privacy">
          <AccordionTrigger>
            <Text className="text-lg font-semibold">Privacy</Text>
          </AccordionTrigger>
          <AccordionContent>
            <PrivacySettings />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="account">
          <AccordionTrigger>
            <Text className="text-lg font-semibold">Account</Text>
          </AccordionTrigger>
          <AccordionContent>
            <AccountSettings />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </ScrollView>
  );
}
