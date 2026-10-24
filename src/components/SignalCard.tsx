import { AssetAvatar } from "@/src/components/AssetAvatar";
import { useAppTheme, useThemeStyles } from "@/src/context/ThemeContext";
import { CORNER_RADIUS, type ThemeColors } from "@/src/lib/theme";
import type { AssetSignal } from "@/src/services/signal/signalService";
import type { MarketSymbol } from "@/src/types/market";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
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
  const [focused, setFocused] = useState(false);
  const tone =
    signal?.type === "BUY"
      ? "success"
      : signal?.type === "SELL"
        ? "danger"
        : "muted";
  const badgeBackground =
    signal?.type === "BUY"
      ? colors.successSoft
      : signal?.type === "SELL"
        ? colors.dangerSoft
        : colors.elevated;
  const status = signal
    ? labels[signal.type]
    : loading
      ? "Checking…"
      : "Reading unavailable";
  const showDetails = Boolean(expanded && signal);
  return (
    <View style={styles.card}>
      <Pressable
        style={({ pressed }) => [
          styles.summary,
          pressed && signal && styles.pressed,
          focused && styles.focused,
        ]}
        disabled={!signal}
        onPress={onToggle}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityRole="button"
        accessibilityLabel={`${pair}, ${signal ? signal.type + ", " : ""}${status}, details`}
        accessibilityHint="Show or hide candle details and moving averages."
        accessibilityState={{
          expanded: showDetails,
          disabled: !signal,
          busy: loading,
        }}
        aria-expanded={showDetails}
      >
        <AssetAvatar symbol={asset?.baseAsset ?? symbol} size={32} />
        <View style={styles.identity}>
          <Text style={styles.pair} numberOfLines={2}>
            {pair}
          </Text>
          <Text style={styles.status}>{status}</Text>
        </View>
        {signal ? (
          <View style={[styles.badge, { backgroundColor: badgeBackground }]}>
            <Text style={[styles.badgeText, { color: colors[tone] }]}>
              {signal.type}
            </Text>
          </View>
        ) : null}
        {loading ? (
          <ActivityIndicator
            color={colors.primary}
            accessibilityLabel={"Checking " + pair}
          />
        ) : signal ? (
          <SymbolView
            name={{
              ios: showDetails ? "chevron.up" : "chevron.down",
              android: showDetails ? "expand_less" : "expand_more",
              web: showDetails ? "expand_less" : "expand_more",
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
        <Text style={[styles.caption, cached && { color: colors.primary }]}>
          {cached ? "Saved reading" : "Last checked"} ·{" "}
          {signal.checkedAt
            ? new Date(signal.checkedAt).toLocaleString()
            : "Check time unavailable"}
        </Text>
      ) : null}
      {showDetails && signal ? (
        <View style={styles.details}>
          <Text style={styles.caption}>
            Closed candle · {new Date(signal.timestamp).toLocaleString()}
          </Text>
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
      padding: 14,
      marginHorizontal: 20,
      marginBottom: 10,
      gap: 8,
      borderRadius: CORNER_RADIUS.card,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    summary: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      minHeight: 48,
      borderRadius: 8,
    },
    identity: { flex: 1, minWidth: 0, gap: 3 },
    pair: { color: colors.text, fontSize: 16, fontWeight: "700" },
    status: { color: colors.muted, fontSize: 12, lineHeight: 18 },
    badge: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },
    badgeText: { fontSize: 11, fontWeight: "700" },
    pressed: { opacity: 0.7 },
    focused: {
      outlineStyle: "solid",
      outlineWidth: 2,
      outlineColor: colors.accent,
      outlineOffset: 3,
    },
    caption: { color: colors.muted, fontSize: 12, lineHeight: 18 },
    error: { color: colors.danger, fontSize: 12, lineHeight: 18 },
    details: {
      gap: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    averages: { flexDirection: "row", gap: 12 },
    metric: {
      flex: 1,
      minWidth: 0,
      gap: 8,
      padding: 10,
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
