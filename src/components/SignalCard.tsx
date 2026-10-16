import { useAppTheme, useThemeStyles } from '@/src/context/ThemeContext';
import type { ThemeColors } from '@/src/lib/theme';
import { StyleSheet, Text, View } from 'react-native';
import { useAccountStyles } from '@/src/components/AccountScreen';
import { AssetAvatar } from './AssetAvatar';
import type { AssetSignal } from '@/src/services/signalService';



export function SignalCard({ signal }: { signal: AssetSignal }) {
  const { colors: accountColors } = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const accountStyles = useAccountStyles();
  const signalColors = {
    BUY: { foreground: accountColors.success, background: accountColors.successSoft },
    SELL: { foreground: accountColors.danger, background: accountColors.dangerSoft },
    NEUTRAL: { foreground: accountColors.accent, background: accountColors.elevated },
  };
  const color = signalColors[signal.type];
  return (
    <View style={accountStyles.card}>
      <View style={styles.header}>
        <AssetAvatar symbol={signal.symbol.replace(/USDT$/, '')} />
        <View style={styles.symbolGroup}>
          <Text style={styles.symbol} numberOfLines={1}>{signal.symbol.replace('USDT', '')}</Text>
          <Text style={accountStyles.body}>{signal.symbol}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: color.background }]}>
          <Text style={[styles.badgeText, { color: color.foreground }]}>{signal.type}</Text>
        </View>
      </View>
      <Text style={accountStyles.body}>{signal.reason}</Text>
      <View style={styles.averages}>
        <View style={styles.metric}><Text style={styles.metricLabel}>SMA5 · USDT</Text><Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{signal.sma5.toFixed(2)}</Text></View>
        <View style={styles.metric}><Text style={styles.metricLabel}>SMA10 · USDT</Text><Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{signal.sma10.toFixed(2)}</Text></View>
      </View>
      <Text style={styles.timestamp}>Candle closed {new Date(signal.timestamp).toLocaleString()}</Text>
    </View>
  );
}

const createStyles = (accountColors: ThemeColors) => StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  symbolGroup: { gap: 2, flex: 1, minWidth: 0 },
  symbol: { color: accountColors.text, fontSize: 23, fontWeight: '700' },
  badge: { borderRadius: 12, paddingVertical: 7, paddingHorizontal: 11 },
  badgeText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  averages: { flexDirection: 'row', gap: 16 },
  metric: { flex: 1, gap: 6, minWidth: 0, padding: 14, borderRadius: 14, backgroundColor: accountColors.background },
  metricLabel: { color: accountColors.muted, fontSize: 12 },
  metricValue: { color: accountColors.text, fontSize: 19, fontWeight: '600', fontVariant: ['tabular-nums'] },
  timestamp: { color: accountColors.muted, fontSize: 12, lineHeight: 18 },
});
