import { Link, Stack } from 'expo-router';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { ScreenWrapper } from '@/components/screen-wrapper';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <ScreenWrapper screenName="NotFound">
        <View>
          <Text>This screen doesn't exist.</Text>

          <Link href="/">
            <Text>Go to home screen!</Text>
          </Link>
        </View>
      </ScreenWrapper>
    </>
  );
}
