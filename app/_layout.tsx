import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Text, View } from 'react-native';
import 'react-native-reanimated';

import { AccountScreen, accountColors, accountStyles, Feedback } from '@/src/components/AccountScreen';
import { ActionButton } from '@/src/components/ActionButton';
import { AuthProvider } from '@/src/context/AuthContext';
import { useAuth } from '@/src/hooks/useAuth';

export { ErrorBoundary } from 'expo-router';
export const unstable_settings = { initialRouteName: 'index' };

export default function RootLayout() {
  return (
    <ThemeProvider value={DefaultTheme}>
      <AuthProvider><RootNavigator /></AuthProvider>
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}

function RootNavigator() {
  const { session, loading, error, retry } = useAuth();
  if (loading || error) {
    return (
      <AccountScreen centered>
        <View style={accountStyles.card}>
          {loading ? <><ActivityIndicator color={accountColors.primary} /><Text style={accountStyles.body}>Restoring your session…</Text></> : (
            <><Feedback message={error} /><ActionButton title="Try again" onPress={() => void retry()} /></>
          )}
        </View>
      </AccountScreen>
    );
  }
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={!session}><Stack.Screen name="(auth)" /></Stack.Protected>
      <Stack.Protected guard={!!session}><Stack.Screen name="(tabs)" /></Stack.Protected>
    </Stack>
  );
}
