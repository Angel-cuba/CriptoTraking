import { useAppTheme, useThemeStyles } from "@/src/context/ThemeContext";
import {
  CONTROL_HEIGHT,
  CORNER_RADIUS,
  type ThemeColors,
} from "@/src/lib/theme";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";

export function FormField({
  label,
  password = false,
  ...props
}: TextInputProps & { label: string; password?: boolean }) {
  const { colors: accountColors } = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, focused && styles.focused]}>
        <TextInput
          {...props}
          accessibilityLabel={label}
          placeholderTextColor={accountColors.muted}
          onFocus={(event) => {
            setFocused(true);
            props.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            props.onBlur?.(event);
          }}
          secureTextEntry={password && !visible}
          style={[styles.input, props.style]}
        />
        {password ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
            accessibilityState={{ disabled: props.editable === false }}
            disabled={props.editable === false}
            onPress={() => setVisible((value) => !value)}
            style={styles.toggle}
          >
            <SymbolView
              name={{
                ios: visible ? "eye.slash" : "eye",
                android: visible ? "visibility_off" : "visibility",
                web: visible ? "visibility_off" : "visibility",
              }}
              tintColor={accountColors.muted}
              size={20}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const createStyles = (accountColors: ThemeColors) =>
  StyleSheet.create({
    field: { gap: 8 },
    label: { color: accountColors.text, fontSize: 14, fontWeight: "600" },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: accountColors.border,
      borderRadius: CORNER_RADIUS.control,
      backgroundColor: accountColors.elevated,
    },
    focused: { borderColor: accountColors.primary },
    input: {
      flex: 1,
      minWidth: 0,
      minHeight: CONTROL_HEIGHT,
      padding: 14,
      fontSize: 16,
      color: accountColors.text,
    },
    toggle: {
      minWidth: 56,
      minHeight: 48,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 10,
    },
  });
