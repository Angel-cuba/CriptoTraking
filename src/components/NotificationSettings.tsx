import { Text, View } from 'react-native';
import { useAccountStyles, Feedback } from '@/src/components/AccountScreen';
import { ActionButton } from '@/src/components/ActionButton';
import { useSignalNotifications } from '@/src/context/SignalNotificationContext';

export function NotificationSettings({ disabled = false }: { disabled?: boolean }) {
  const accountStyles = useAccountStyles();
  const settings = useSignalNotifications();
  return (
    <View style={accountStyles.card}>
      <Text style={accountStyles.sectionTitle}>Signal alerts</Text>
      <Text style={accountStyles.body}>Notify me about new BUY or SELL crossovers in my watchlist when I refresh Signals.</Text>
      {!settings.supported ? <Text style={accountStyles.body}>Local notifications are available in the iOS and Android app.</Text> : (
        <>
          <Text style={accountStyles.body}>{settings.loading ? 'Loading notification settings…' : settings.enabled ? settings.permission ? 'On for this account on this device.' : 'Blocked by your device notification settings.' : 'Off for this account on this device.'}</Text>
          <Feedback message={settings.error} />
          {!settings.ready && !settings.loading ? <ActionButton title="Retry notification settings" secondary onPress={settings.reload} disabled={disabled} /> : (
            <ActionButton title={settings.enabled ? 'Disable alerts' : 'Enable alerts'} secondary loading={settings.busy}
              disabled={disabled || settings.loading || !settings.ready} onPress={() => void settings.changeEnabled(!settings.enabled)} />
          )}
        </>
      )}
      <Text style={accountStyles.body}>The first observation is silent. Alerts are checked while Signals is open; the app does not monitor markets when closed.</Text>
    </View>
  );
}
