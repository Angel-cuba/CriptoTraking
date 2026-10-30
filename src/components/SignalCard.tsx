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

export function SignalCard({
  symbol,
  asset,
  signal,
  failure,
  loading,
  cached,
  onOpen,
}: {
  symbol: string;
  asset?: MarketSymbol;
  signal?: AssetSignal;
  failure?: string;
  loading: boolean;
  cached: boolean;
  onOpen: () => void;
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
  return (
    <View style={styles.card}>
      <Pressable
        style={({ pressed }) => [
          styles.summary,
          pressed && signal && styles.pressed,
          focused && styles.focused,
        ]}
        disabled={!signal}
        onPress={onOpen}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityRole="button"
        accessibilityLabel={`${pair}, ${signal ? signal.type + ", " : ""}${status}, details`}
        accessibilityHint="Open hourly analysis and the saved signal reading."
        accessibilityState={{
          disabled: !signal,
          busy: loading,
        }}
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
              ios: "chevron.right",
              android: "chevron_right",
              web: "chevron_right",
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
  });
