import { View } from "react-native";

import { Feedback } from "@/src/components/AccountScreen";
import { ActionButton } from "@/src/components/ActionButton";
import { AppSwitch } from "@/src/components/AppSwitch";
import { SettingsRow } from "@/src/components/SettingsRow";
import { useSignalNotifications } from "@/src/context/SignalNotificationContext";

export function NotificationSettings({
  disabled = false,
}: {
  disabled?: boolean;
}) {
  const settings = useSignalNotifications();
  const description = !settings.supported
    ? "Available in the iOS and Android app"
    : settings.loading
      ? "Loading notification settings…"
      : settings.busy
        ? "Updating preference…"
        : !settings.ready
          ? "Notification settings unavailable"
          : settings.enabled && !settings.permission
            ? "Blocked by device notification settings"
            : "BUY/SELL while Signals is open · first reading is silent";
  return (
    <View>
      <SettingsRow title="Signal alerts" description={description}>
        <AppSwitch
          value={settings.enabled}
          accessibilityLabel="Signal alerts"
          accessibilityHint="Notify about new BUY or SELL crossovers while Signals is open. Saved for this account on this device."
          disabled={
            disabled ||
            !settings.supported ||
            !settings.ready ||
            settings.loading ||
            settings.busy
          }
          onValueChange={(next) => void settings.changeEnabled(next)}
        />
      </SettingsRow>
      <Feedback message={settings.error} />
      {settings.supported && !settings.ready && !settings.loading ? (
        <ActionButton
          title="Retry notification settings"
          secondary
          onPress={settings.reload}
          disabled={disabled || settings.busy}
        />
      ) : null}
    </View>
  );
}
