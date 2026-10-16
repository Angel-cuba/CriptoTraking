import { ProfileProvider } from '@/src/context/ProfileContext';
import { PriceAlertProvider } from '@/src/context/PriceAlertContext';
import { SignalNotificationProvider } from '@/src/context/SignalNotificationContext';
import { useAuth } from '@/src/hooks/useAuth';
import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { accountColors } from '@/src/components/AccountScreen';

export default function TabLayout() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <ProfileProvider key={user.id} userId={user.id}>
      <SignalNotificationProvider key={user.id} userId={user.id}>
        <PriceAlertProvider key={user.id} userId={user.id}>
          <Tabs initialRouteName="profile" screenOptions={{ headerShown: false, tabBarActiveTintColor: accountColors.primary, tabBarStyle: { borderTopColor: accountColors.border } }}>
            <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }) => (
              <SymbolView name={{ ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' }} tintColor={color} size={26} />
            ) }} />
            <Tabs.Screen name="markets" options={{ title: 'Markets', tabBarIcon: ({ color }) => (
              <SymbolView name={{ ios: 'chart.bar.xaxis', android: 'bar_chart', web: 'bar_chart' }} tintColor={color} size={26} />
            ) }} />
            <Tabs.Screen name="signals" options={{ title: 'Signals', tabBarIcon: ({ color }) => (
              <SymbolView name={{ ios: 'waveform.path.ecg', android: 'monitoring', web: 'monitoring' }} tintColor={color} size={26} />
            ) }} />
          </Tabs>
        </PriceAlertProvider>
      </SignalNotificationProvider>
    </ProfileProvider>
  );
}
