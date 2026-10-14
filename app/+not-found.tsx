import { Link, Stack } from 'expo-router';
import { AccountHeading, AccountScreen, accountStyles } from '@/src/components/AccountScreen';

export default function NotFoundScreen() {
  return (
    <AccountScreen centered>
      <Stack.Screen options={{ headerShown: false }} />
      <AccountHeading title="Page not found" subtitle="This page is unavailable. Return to your account to continue." />
      <Link href="/" replace style={accountStyles.link}>Return to your account</Link>
    </AccountScreen>
  );
}
