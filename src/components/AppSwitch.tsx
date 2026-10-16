import { Platform, StyleSheet, Switch, View, type SwitchProps } from 'react-native';
import { useAppTheme } from '@/src/context/ThemeContext';

export function AppSwitch({ value, ...props }: SwitchProps & { value: boolean }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.target}>
      <Switch {...props} value={value} trackColor={{ false: colors.border, true: colors.action }}
        thumbColor={colors.switchThumb} ios_backgroundColor={colors.border}
        {...(Platform.OS === 'web' ? { activeThumbColor: colors.switchThumb } : {})}
        hitSlop={6} style={styles.control} />
    </View>
  );
}

const styles = StyleSheet.create({
  target: { minWidth: 56, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  control: { width: 52, height: 32 },
});
