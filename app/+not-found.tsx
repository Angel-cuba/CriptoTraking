import {
  AccountHeading,
  AccountScreen,
  useAccountStyles,
} from "@/src/components/AccountScreen";
import { Link, Stack } from "expo-router";

export default function NotFoundScreen() {
  const accountStyles = useAccountStyles();
  return (
    <AccountScreen centered>
      <Stack.Screen options={{ headerShown: false }} />
      <AccountHeading
        title="Page not found"
        subtitle="This page is unavailable. Return to your account to continue."
      />
      <Link href="/" replace style={accountStyles.link}>
        Return to your account
      </Link>
    </AccountScreen>
  );
}
