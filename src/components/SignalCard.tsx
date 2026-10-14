import { StyleSheet, Text, View } from 'react-native';
import { accountColors, accountStyles } from '@/src/components/AccountScreen';
import type { AssetSignal } from '@/src/services/signalService';

const signalColors = {
  BUY: { foreground: '#167347', background: '#e9f7ef' },
  SELL: { foreground: '#b42318', background: '#fff0ed' },
  NEUTRAL: { foreground: '#5b6b82', background: '#edf1f7' },
};

export function SignalCard({ signal }: { signal: AssetSignal }) {
  const color = signalColors[signal.type];
  return (
    <View style={accountStyles.card}>
      <View style={styles.header}>
        <View style={styles.symbolGroup}>
          <Text style={styles.symbol}>{signal.symbol.replace('USDT', '')}</Text>
          <Text style={accountStyles.body}>{signal.symbol}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: color.background }]}>
          <Text style={[styles.badgeText, { color: color.foreground }]}>{signal.type}</Text>
        </View>
      </View>
      <Text style={accountStyles.body}>{signal.reason}</Text>
      <View style={styles.averages}>
        <View style={styles.metric}><Text style={styles.metricLabel}>SMA5 · USDT</Text><Text style={styles.metricValue}>{signal.sma5.toFixed(2)}</Text></View>
        <View style={styles.metric}><Text style={styles.metricLabel}>SMA10 · USDT</Text><Text style={styles.metricValue}>{signal.sma10.toFixed(2)}</Text></View>
      </View>
      <Text style={styles.timestamp}>Candle closed {new Date(signal.timestamp).toLocaleString()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  symbolGroup: { gap: 2 },
  symbol: { color: accountColors.text, fontSize: 23, fontWeight: '700' },
  badge: { borderRadius: 8, paddingVertical: 7, paddingHorizontal: 11 },
  badgeText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  averages: { flexDirection: 'row', gap: 16 },
  metric: { flex: 1, gap: 6, minWidth: 0 },
  metricLabel: { color: accountColors.muted, fontSize: 12 },
  metricValue: { color: accountColors.text, fontSize: 19, fontWeight: '600', fontVariant: ['tabular-nums'] },
  timestamp: { color: accountColors.muted, fontSize: 12, lineHeight: 18 },
});
