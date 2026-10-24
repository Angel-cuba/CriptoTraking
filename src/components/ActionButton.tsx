import { useAppTheme } from "@/src/context/ThemeContext";
import { CONTROL_HEIGHT, CORNER_RADIUS } from "@/src/lib/theme";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

export function ActionButton({
  title,
  accessibilityLabel = title,
  onPress,
  loading = false,
  disabled = false,
  secondary = false,
  danger = false,
}: {
  title: string;
  accessibilityLabel?: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  secondary?: boolean;
  danger?: boolean;
}) {
  const { colors: accountColors } = useAppTheme();
  const [focused, setFocused] = useState(false);
  const unavailable = disabled || loading;
  const inactive = disabled && !loading;
  const color = danger ? accountColors.danger : accountColors.primary;
  const background = inactive
    ? accountColors.elevated
    : secondary
      ? danger
        ? accountColors.dangerSoft
        : accountColors.primarySoft
      : danger
        ? accountColors.danger
        : accountColors.action;
  const foreground = inactive
    ? accountColors.muted
    : secondary
      ? color
      : danger
        ? accountColors.onDanger
        : accountColors.onPrimary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: unavailable, busy: loading }}
      disabled={unavailable}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: background,
          borderColor: inactive
            ? accountColors.border
            : secondary
              ? color
              : background,
          opacity: pressed && !unavailable ? 0.82 : 1,
          transform: [{ scale: pressed && !unavailable ? 0.985 : 1 }],
        },
        focused &&
          !unavailable && {
            outlineStyle: "solid",
            outlineWidth: 2,
            outlineColor: accountColors.accent,
            outlineOffset: 3,
          },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <Text style={[styles.text, { color: foreground }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: CONTROL_HEIGHT,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: CORNER_RADIUS.control,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "700",
    textAlign: "center",
  },
});
