import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { accountColors } from './AccountScreen';

export function ActionButton({ title, onPress, loading = false, disabled = false, secondary = false, danger = false }: {
  title: string; onPress: () => void; loading?: boolean; disabled?: boolean; secondary?: boolean; danger?: boolean;
}) {
  const unavailable = disabled || loading;
  const color = danger ? accountColors.danger : accountColors.primary;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled: unavailable, busy: loading }}
      disabled={unavailable} onPress={onPress}
      style={({ pressed }) => [styles.button, { backgroundColor: secondary ? '#fff' : color, borderColor: color, opacity: unavailable ? 0.55 : pressed ? 0.8 : 1 }]}>
      {loading ? <ActivityIndicator color={secondary ? color : '#fff'} /> : <Text style={[styles.text, { color: secondary ? color : '#fff' }]}>{title}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 52, paddingHorizontal: 18, paddingVertical: 14, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 16, fontWeight: '600' },
});
