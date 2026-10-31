import { useState } from "react";
import { Linking, Text, View } from "react-native";

import { useAppTheme } from "@/src/context/ThemeContext";

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
  const { colors } = useAppTheme();
  const [deviceSettingsError, setDeviceSettingsError] = useState<string | null>(null);

  function openDeviceSettings() {
    setDeviceSettingsError(null);
    void Linking.openSettings().catch(() =>
      setDeviceSettingsError("Could not open device settings. Please try again."),
    );
  }
  const description = !settings.supported
    ? "Available in the iOS and Android app"
    : settings.loading
      ? "Loading notification settings…"
      : settings.busy
        ? "Updating notifications…"
        : !settings.ready
          ? "Notification settings unavailable"
          : settings.enabled && !settings.permission
            ? "Blocked in device settings"
            : settings.enabled
              ? "On while Signals is open"
              : "Off on this device";
  return (
    <View>
      <SettingsRow title="Signal alerts" description={description}>
        <AppSwitch
          value={settings.enabled}
          accessibilityLabel="Signal alerts"
          accessibilityHint="Notify about new upward or downward signals while Signals is open. Your first check and saved readings stay silent. Saved for this account on this device."
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
      {settings.supported && settings.ready ? (
        <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
          New signals while Signals is open. Your first check and saved readings
          stay silent.
        </Text>
      ) : null}
      <Feedback message={settings.error} />
      <Feedback message={deviceSettingsError} />
      {settings.supported && settings.ready && !settings.permission ? (
        <ActionButton
          title="Open device settings"
          accessibilityLabel="Open device settings to allow Kripto notifications"
          secondary
          disabled={disabled || settings.loading || settings.busy}
          onPress={openDeviceSettings}
        />
      ) : null}
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
