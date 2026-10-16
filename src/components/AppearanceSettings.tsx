import { SymbolView } from "expo-symbols";
import { StyleSheet, Text, View } from "react-native";

import { AppSwitch } from "@/src/components/AppSwitch";
import { useAppTheme, useThemeStyles } from "@/src/context/ThemeContext";
import type { ThemeColors } from "@/src/lib/theme";
import { Feedback, useAccountStyles } from "./AccountScreen";

export function AppearanceSettings() {
  const { mode, colors, ready, saving, error, setMode } = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const accountStyles = useAccountStyles();
  return (
    <View style={accountStyles.card}>
      <Text style={accountStyles.sectionTitle}>Appearance</Text>
      <View style={styles.row}>
        <View style={styles.icon}>
          <SymbolView
            name={
              mode === "dark"
                ? { ios: "moon", android: "dark_mode", web: "dark_mode" }
                : { ios: "sun.max", android: "light_mode", web: "light_mode" }
            }
            tintColor={colors.accent}
            size={22}
          />
        </View>
        <View style={styles.label}>
          <Text style={styles.title}>Dark mode</Text>
          <Text style={accountStyles.body}>
            {mode === "dark" ? "Dark palette is on." : "Light palette is on."}
          </Text>
        </View>
        <AppSwitch
          value={mode === "dark"}
          onValueChange={(enabled) => void setMode(enabled ? "dark" : "light")}
          accessibilityLabel="Dark mode"
          accessibilityHint="Switch between light and dark appearance."
          disabled={!ready}
        />
      </View>
      <Text style={accountStyles.body}>
        {saving
          ? "Saving preference…"
          : "Choose light or dark for this device."}
      </Text>
      <Feedback message={error} />
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52 },
    icon: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: colors.elevated,
      alignItems: "center",
      justifyContent: "center",
    },
    label: { flex: 1, minWidth: 0, gap: 3 },
    title: { color: colors.text, fontSize: 15, fontWeight: "600" },
  });
