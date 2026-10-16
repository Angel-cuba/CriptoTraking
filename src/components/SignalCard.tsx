import { AssetAvatar } from "@/src/components/AssetAvatar";
import { useAppTheme, useThemeStyles } from "@/src/context/ThemeContext";
import type { ThemeColors } from "@/src/lib/theme";
import type { AssetSignal } from "@/src/services/signalService";
import type { MarketSymbol } from "@/src/types/market";
import { SymbolView } from "expo-symbols";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

const labels = {
  BUY: "Bullish crossover",
  SELL: "Bearish crossover",
  NEUTRAL: "No new crossover",
};
const formatAverage = (value: number) =>
  value < 0.0000001
    ? value.toExponential(4)
    : value.toLocaleString("en-US", { maximumSignificantDigits: 8 });

export function SignalCard({
  symbol,
  asset,
  signal,
  failure,
  loading,
  cached,
  expanded,
  onToggle,
}: {
  symbol: string;
  asset?: MarketSymbol;
  signal?: AssetSignal;
  failure?: string;
  loading: boolean;
  cached: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { colors } = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const pair = asset ? asset.baseAsset + "/" + asset.quoteAsset : symbol;
  const color =
    signal?.type === "BUY"
      ? colors.success
      : signal?.type === "SELL"
        ? colors.danger
        : colors.muted;
  return (
    <View style={styles.card}>
      <Pressable
        style={styles.summary}
        disabled={!signal}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={
          pair +
          ", " +
          (signal ? labels[signal.type] : "Reading unavailable") +
          ", details"
        }
        accessibilityState={{ expanded, disabled: !signal }}
      >
        <AssetAvatar symbol={asset?.baseAsset ?? symbol} size={36} />
        <View style={styles.identity}>
          <Text style={styles.pair} numberOfLines={2}>
            {pair}
          </Text>
          <Text style={[styles.status, { color }]}>
            {signal
              ? labels[signal.type]
              : loading
                ? "Checking…"
                : "Reading unavailable"}
          </Text>
        </View>
        {loading ? (
          <ActivityIndicator
            color={colors.primary}
            accessibilityLabel={"Checking " + pair}
          />
        ) : signal ? (
          <SymbolView
            name={{
              ios: expanded ? "chevron.up" : "chevron.down",
              android: expanded ? "expand_less" : "expand_more",
              web: expanded ? "expand_less" : "expand_more",
            }}
            tintColor={colors.muted}
            size={18}
          />
        ) : null}
      </Pressable>
      {failure ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {failure}
        </Text>
      ) : null}
      {signal ? (
        <>
          <Text style={styles.caption}>
            Closed candle · {new Date(signal.timestamp).toLocaleString()}
          </Text>
          <Text style={[styles.caption, cached && { color: colors.primary }]}>
            {cached ? "Saved reading" : "Last checked"} ·{" "}
            {signal.checkedAt
              ? new Date(signal.checkedAt).toLocaleString()
              : "Check time unavailable"}
          </Text>
        </>
      ) : null}
      {expanded && signal ? (
        <View style={styles.details}>
          <Text style={styles.caption}>{signal.reason}</Text>
          <View style={styles.averages}>
            {[
              { label: "SMA5", value: signal.sma5 },
              { label: "SMA10", value: signal.sma10 },
            ].map((average) => (
              <View key={average.label} style={styles.metric}>
                <Text style={styles.caption}>
                  {average.label}
                  {asset ? " · " + asset.quoteAsset : ""}
                </Text>
                <Text
                  style={styles.value}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {formatAverage(average.value)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      padding: 18,
      marginHorizontal: 20,
      marginBottom: 14,
      gap: 10,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    summary: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      minHeight: 64,
    },
    identity: { flex: 1, minWidth: 0, gap: 6 },
    pair: { color: colors.text, fontSize: 16, fontWeight: "700" },
    status: { fontSize: 13, fontWeight: "600" },
    caption: { color: colors.muted, fontSize: 12, lineHeight: 18 },
    error: { color: colors.danger, fontSize: 12, lineHeight: 18 },
    details: {
      gap: 14,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    averages: { flexDirection: "row", gap: 12 },
    metric: {
      flex: 1,
      minWidth: 0,
      gap: 8,
      padding: 12,
      borderRadius: 14,
      backgroundColor: colors.background,
    },
    value: {
      color: colors.text,
      fontSize: 17,
      fontWeight: "600",
      fontVariant: ["tabular-nums"],
    },
  });
