import { useThemeStyles } from "@/src/context/ThemeContext";
import type { ThemeColors } from "@/src/lib/theme";
import type { PropsWithChildren, ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

export function SettingsRow({
  title,
  description,
  children,
}: PropsWithChildren<{ title: ReactNode; description: string }>) {
  const styles = useThemeStyles(createStyles);
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description} accessibilityLiveRegion="polite">
          {description}
        </Text>
      </View>
      {children}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      minHeight: 64,
      paddingVertical: 8,
    },
    copy: { flex: 1, minWidth: 0, gap: 3 },
    title: {
      color: colors.text,
      fontSize: 15,
      lineHeight: 21,
      fontWeight: "600",
    },
    description: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  });
