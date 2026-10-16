import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/src/context/ThemeContext';



export function AssetAvatar({ symbol, size = 40 }: { symbol: string; size?: number }) {
  const { colors } = useAppTheme();
  const assets: Record<string, { label: string; color: string; background: string }> = {
    BTC: { label: '₿', color: colors.primary, background: colors.primarySoft },
    ETH: { label: 'Ξ', color: colors.accent, background: colors.elevated },
    SOL: { label: 'S', color: colors.success, background: colors.successSoft },
  };
  const asset = assets[symbol];
  return (
    <View accessible={false} aria-hidden style={[styles.avatar, {
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: asset?.background ?? colors.elevated,
    }]}>
      <Text style={[styles.label, { color: asset?.color ?? colors.accent, fontSize: asset ? size * 0.55 : size * 0.32 }]}>
        {asset?.label ?? symbol.slice(0, 2)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  label: { fontWeight: '700' },
});
