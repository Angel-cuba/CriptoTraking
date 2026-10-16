import { AppThemeProvider, useAppTheme } from "@/src/context/ThemeContext";
import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
  router,
} from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import "react-native-reanimated";

import {
  AccountScreen,
  Feedback,
  useAccountStyles,
} from "@/src/components/AccountScreen";
import { ActionButton } from "@/src/components/ActionButton";
import { AuthProvider } from "@/src/context/AuthContext";
import { useAuth } from "@/src/hooks/useAuth";
import { listenForPriceAlertNotificationTap } from "@/src/services/priceAlertNotificationService";

export { ErrorBoundary } from "expo-router";
export const unstable_settings = { initialRouteName: "index" };

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <ThemedApp />
    </AppThemeProvider>
  );
}

function ThemedApp() {
  const { mode, colors, ready } = useAppTheme();
  const navigationTheme = useMemo(() => {
    const base = mode === "dark" ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
        notification: colors.accent,
      },
    };
  }, [mode, colors]);
  if (!ready) return null;
  return (
    <ThemeProvider value={navigationTheme}>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
    </ThemeProvider>
  );
}

function RootNavigator() {
  const { colors: accountColors } = useAppTheme();
  const accountStyles = useAccountStyles();
  const { session, loading, error, retry } = useAuth();
  const userId = session?.user.id;
  useEffect(() => {
    if (!userId || loading || error) return;
    return listenForPriceAlertNotificationTap(userId, () =>
      router.navigate("/alerts"),
    );
  }, [userId, loading, error]);
  if (loading || error) {
    return (
      <AccountScreen centered>
        <View style={accountStyles.card}>
          {loading ? (
            <>
              <ActivityIndicator color={accountColors.primary} />
              <Text style={accountStyles.body}>Restoring your session…</Text>
            </>
          ) : (
            <>
              <Feedback message={error} />
              <ActionButton title="Try again" onPress={() => void retry()} />
            </>
          )}
        </View>
      </AccountScreen>
    );
  }
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: accountColors.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
    </Stack>
  );
}
