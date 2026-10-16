import { useAppTheme } from '@/src/context/ThemeContext';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

export function ActionButton({ title, onPress, loading = false, disabled = false, secondary = false, danger = false }: {
  title: string; onPress: () => void; loading?: boolean; disabled?: boolean; secondary?: boolean; danger?: boolean;
}) {
  const { colors: accountColors } = useAppTheme();
  const unavailable = disabled || loading;
  const color = danger ? accountColors.danger : accountColors.primary;
  const background = danger ? accountColors.danger : accountColors.action;
  const foreground = secondary ? color : danger ? accountColors.onDanger : accountColors.onPrimary;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled: unavailable, busy: loading }}
      disabled={unavailable} onPress={onPress}
      style={({ pressed }) => [styles.button, { backgroundColor: secondary ? accountColors.surface : background, borderColor: secondary ? color : background, opacity: unavailable ? 0.55 : pressed ? 0.8 : 1 }]}>
      {loading ? <ActivityIndicator color={foreground} /> : <Text style={[styles.text, { color: foreground }]}>{title}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 52, paddingHorizontal: 18, paddingVertical: 14, borderRadius: 16, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 16, fontWeight: '600' },
});
