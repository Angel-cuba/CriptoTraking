import { View } from "react-native";

import { useAppTheme } from "@/src/context/ThemeContext";
import { Feedback } from "./AccountScreen";
import { AppSwitch } from "./AppSwitch";
import { SettingsRow } from "./SettingsRow";

export function AppearanceSettings({
  disabled = false,
}: {
  disabled?: boolean;
}) {
  const { mode, ready, saving, error, setMode } = useAppTheme();
  return (
    <View>
      <SettingsRow
        title="Dark mode"
        description={
          saving ? "Saving preference…" : "Appearance on this device"
        }
      >
        <AppSwitch
          value={mode === "dark"}
          onValueChange={(enabled) => void setMode(enabled ? "dark" : "light")}
          accessibilityLabel="Dark mode"
          accessibilityHint="Switch between light and dark appearance."
          disabled={!ready || disabled}
        />
      </SettingsRow>
      <Feedback message={error} />
    </View>
  );
}
