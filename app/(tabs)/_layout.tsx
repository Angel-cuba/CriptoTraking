import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { accountColors } from '@/src/components/AccountScreen';

export default function TabLayout() {
  return (
    <Tabs initialRouteName="profile" screenOptions={{ headerShown: false, tabBarActiveTintColor: accountColors.primary, tabBarStyle: { borderTopColor: accountColors.border } }}>
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }) => (
        <SymbolView name={{ ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' }} tintColor={color} size={26} />
      ) }} />
      <Tabs.Screen name="signals" options={{ title: 'Signals', tabBarIcon: ({ color }) => (
        <SymbolView name={{ ios: 'waveform.path.ecg', android: 'monitoring', web: 'monitoring' }} tintColor={color} size={26} />
      ) }} />
    </Tabs>
  );
}
