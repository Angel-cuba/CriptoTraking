import { ProfileProvider } from '@/src/context/ProfileContext';
import { PriceAlertProvider } from '@/src/context/PriceAlertContext';
import { SignalNotificationProvider } from '@/src/context/SignalNotificationContext';
import { useAuth } from '@/src/hooks/useAuth';
import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/src/context/ThemeContext';

export default function TabLayout() {
  const { colors: accountColors, mode } = useAppTheme();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const side = Math.max(16, (width - 520) / 2);
  if (!user) return null;
  return (
    <ProfileProvider key={user.id} userId={user.id}>
      <SignalNotificationProvider key={user.id} userId={user.id}>
        <PriceAlertProvider key={user.id} userId={user.id}>
          <Tabs initialRouteName="profile" screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: accountColors.primary,
            tabBarInactiveTintColor: accountColors.muted,
            tabBarActiveBackgroundColor: accountColors.primarySoft,
            tabBarLabelPosition: 'below-icon',
            tabBarHideOnKeyboard: true,
            tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
            tabBarItemStyle: { borderRadius: 18, marginHorizontal: 4, overflow: 'hidden' },
            tabBarStyle: {
              position: 'absolute', left: side, right: side, bottom: Math.max(insets.bottom, 16),
              height: 76, paddingTop: 8, paddingBottom: 8, paddingHorizontal: 6,
              backgroundColor: accountColors.surface, borderColor: accountColors.border,
              borderWidth: 1, borderTopWidth: 1, borderRadius: 26,
              shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
              shadowOpacity: mode === 'dark' ? 0.3 : 0.1, shadowRadius: 20, elevation: 8,
            },
          }}>
            <Tabs.Screen name="markets" options={{ title: 'Markets', tabBarIcon: ({ color }) => (
              <SymbolView name={{ ios: 'chart.bar.xaxis', android: 'bar_chart', web: 'bar_chart' }} tintColor={color} size={23} />
            ) }} />
            <Tabs.Screen name="signals" options={{ title: 'Signals', tabBarIcon: ({ color }) => (
              <SymbolView name={{ ios: 'waveform.path.ecg', android: 'monitoring', web: 'monitoring' }} tintColor={color} size={23} />
            ) }} />
            <Tabs.Screen name="alerts" options={{ title: 'Alerts', tabBarIcon: ({ color }) => (
              <SymbolView name={{ ios: 'bell', android: 'notifications_none', web: 'notifications_none' }} tintColor={color} size={23} />
            ) }} />
            <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }) => (
              <SymbolView name={{ ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' }} tintColor={color} size={23} />
            ) }} />
          </Tabs>
        </PriceAlertProvider>
      </SignalNotificationProvider>
    </ProfileProvider>
  );
}
