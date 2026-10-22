import { useAppTheme, useThemeStyles } from "@/src/context/ThemeContext";
import { CORNER_RADIUS, type ThemeColors } from "@/src/lib/theme";
import { SymbolView } from "expo-symbols";
import { memo } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import type { MarketAsset, MarketMovement } from "@/src/types/market";
import { AssetAvatar } from "./AssetAvatar";

export const MARKET_ROW_HEIGHT = 100;
export type MarketChangeView = "24h" | "update" | "both";

export function getMarketRowHeight(
  compact = false,
  changeView: MarketChangeView = "24h",
  fontScale = 1,
): number {
  const height = compact
    ? changeView === "both"
      ? 88
      : 72
    : MARKET_ROW_HEIGHT;
  return Math.ceil(height * Math.max(1, fontScale));
}

function formatPrice(price: number): string {
  if (price < 0.000001) return price.toExponential(2);
  return price.toLocaleString("en-US", {
    minimumFractionDigits: price >= 1 ? 2 : 0,
    maximumFractionDigits: price >= 1 ? 2 : 8,
  });
}

function ChangeValue({
  symbol,
  value,
  digits = 2,
  empty = "N/A",
  period,
  label,
}: {
  symbol: string;
  value: number | undefined;
  digits?: number;
  empty?: string;
  period?: string;
  label: string;
}) {
  const { colors } = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const neutral = value === undefined || value === 0;
  const color = neutral
    ? colors.muted
    : value > 0
      ? colors.success
      : colors.danger;
  const backgroundColor = neutral
    ? colors.elevated
    : value > 0
      ? colors.successSoft
      : colors.dangerSoft;
  const magnitude = Math.abs(value ?? 0);
  const amount =
    magnitude > 0 && magnitude < 10 ** -digits
      ? magnitude.toExponential(1)
      : magnitude.toFixed(digits);
  const sign = neutral ? "" : value > 0 ? "+" : "-";
  return (
    <View style={styles.changeBlock}>
      {period ? <Text style={styles.period}>{period}</Text> : null}
      <View style={[styles.changeBadge, { backgroundColor }]}>
        <Text
          style={[styles.change, { color }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          accessibilityLabel={`${symbol}: ${value === undefined ? empty : `${sign}${amount} percent`} ${label}`}
        >
          {value === undefined ? empty : `${sign}${amount}%`}
        </Text>
      </View>
    </View>
  );
}

export const MarketRow = memo(function MarketRow({
  asset,
  changeView = "24h",
  compact = false,
  movement,
  watched,
  watchlistDisabled,
  onToggleWatchlist,
}: {
  asset: MarketAsset;
  changeView?: MarketChangeView;
  compact?: boolean;
  movement?: MarketMovement;
  watched: boolean;
  watchlistDisabled: boolean;
  onToggleWatchlist: (symbol: string) => void;
}) {
  const { colors: accountColors } = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { fontScale } = useWindowDimensions();
  const { ticker } = asset;
  const amount = ticker ? formatPrice(ticker.price) : "Unavailable";
  const elapsed = movement
    ? (movement.receivedAt - movement.previousReceivedAt) / 1000
    : 0;
  const interval = elapsed < 1 ? "<1s" : `${Math.round(elapsed)}s`;

  return (
    <View
      style={[
        styles.slot,
        { height: getMarketRowHeight(compact, changeView, fontScale) },
        compact && styles.compactSlot,
      ]}
    >
      <View style={[styles.row, compact && styles.compactRow]}>
        <AssetAvatar symbol={asset.baseAsset} size={compact ? 32 : 36} />
        <View style={[styles.asset, compact && styles.compactContent]}>
          <Text
            style={[
              styles.symbol,
              asset.baseAsset.length > 8 && styles.longSymbol,
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {asset.baseAsset}
          </Text>
          <Text style={styles.quote} numberOfLines={1}>
            {asset.baseAsset}/{asset.quoteAsset}
          </Text>
          {changeView === "both" ? (
            <ChangeValue
              symbol={asset.symbol}
              value={movement?.changePercent}
              digits={4}
              empty={ticker ? "Waiting" : "N/A"}
              period={`Update${movement ? ` ${interval}` : ""}`}
              label={`since the previous update${movement ? ` (${interval})` : ""}`}
            />
          ) : null}
        </View>
        <View style={[styles.price, compact && styles.compactContent]}>
          <Text
            style={styles.amount}
            accessibilityLabel={`${asset.symbol}: ${ticker ? `${amount} ${asset.quoteAsset}` : "price unavailable"}`}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {amount}
          </Text>
          {!compact ? (
            <Text style={styles.quote}>{asset.quoteAsset}</Text>
          ) : null}
          {changeView === "update" ? (
            <ChangeValue
              symbol={asset.symbol}
              value={movement?.changePercent}
              digits={4}
              empty={ticker ? "Waiting" : "N/A"}
              period={movement ? interval : undefined}
              label={`since the previous update${movement ? ` (${interval})` : ""}`}
            />
          ) : (
            <ChangeValue
              symbol={asset.symbol}
              value={ticker?.changePercent24h}
              period={changeView === "both" ? "24h" : undefined}
              label="over 24 hours"
            />
          )}
        </View>
        <Pressable
          style={[
            styles.watchButton,
            compact && styles.compactWatchButton,
            watchlistDisabled && styles.disabledControl,
          ]}
          accessibilityRole="checkbox"
          accessibilityLabel={`${watched ? "Remove" : "Add"} ${asset.symbol} ${watched ? "from" : "to"} watchlist`}
          accessibilityState={{ checked: watched, disabled: watchlistDisabled }}
          aria-checked={watched}
          aria-disabled={watchlistDisabled}
          disabled={watchlistDisabled}
          onPress={() => onToggleWatchlist(asset.symbol)}
        >
          <SymbolView
            name={{
              ios: watched ? "star.fill" : "star",
              android: watched ? "star" : "star_border",
              web: watched ? "star" : "star_border",
            }}
            tintColor={watched ? accountColors.primary : accountColors.muted}
            size={20}
          />
        </Pressable>
      </View>
    </View>
  );
});

const createStyles = (accountColors: ThemeColors) =>
  StyleSheet.create({
    slot: {
      paddingHorizontal: 20,
      paddingBottom: 10,
    },
    row: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      paddingLeft: 14,
      paddingRight: 4,
      gap: 10,
      borderWidth: 1,
      borderColor: accountColors.border,
      borderRadius: CORNER_RADIUS.card,
      backgroundColor: accountColors.surface,
    },
    compactSlot: { paddingBottom: 0 },
    compactRow: {
      paddingLeft: 0,
      paddingRight: 0,
      borderWidth: 0,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderRadius: 0,
      backgroundColor: accountColors.background,
    },
    compactContent: { gap: 4 },
    compactWatchButton: { height: 52 },
    asset: { flex: 1, minWidth: 0, gap: 6 },
    watchButton: {
      width: 44,
      height: 60,
      alignItems: "center",
      justifyContent: "center",
    },
    disabledControl: { opacity: 0.45 },
    symbol: { fontSize: 15, fontWeight: "700", color: accountColors.text },
    longSymbol: { fontSize: 12 },
    quote: { fontSize: 11, color: accountColors.muted },
    price: { flex: 1, minWidth: 0, alignItems: "flex-end", gap: 6 },
    amount: {
      fontSize: 15,
      fontWeight: "600",
      color: accountColors.text,
      fontVariant: ["tabular-nums"],
    },
    changeBlock: { maxWidth: "100%", alignItems: "flex-end", gap: 2 },
    period: { fontSize: 10, lineHeight: 12, color: accountColors.muted },
    changeBadge: {
      maxWidth: "100%",
      borderRadius: 8,
      paddingHorizontal: 7,
      paddingVertical: 3,
    },
    change: { fontSize: 11, fontWeight: "600", fontVariant: ["tabular-nums"] },
  });
