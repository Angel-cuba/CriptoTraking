import { useAppTheme, useThemeStyles } from "@/src/context/ThemeContext";
import type { ThemeColors } from "@/src/lib/theme";
import { SymbolView } from "expo-symbols";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { MarketAsset, MarketMovement } from "@/src/types/market";
import { AssetAvatar } from "./AssetAvatar";

export const MARKET_ROW_HEIGHT = 110;

function formatPrice(price: number): string {
  if (price < 0.000001) return price.toExponential(2);
  return price.toLocaleString("en-US", {
    minimumFractionDigits: price >= 1 ? 2 : 0,
    maximumFractionDigits: price >= 1 ? 2 : 8,
  });
}

function formatMovement(change: number): string {
  if (change === 0) return "= 0.00%";
  if (Math.abs(change) < 0.01) return `${change > 0 ? "↑" : "↓"} <0.01%`;
  return `${change > 0 ? "↑ +" : "↓ -"}${Math.abs(change).toFixed(2)}%`;
}

export const MarketRow = memo(function MarketRow({
  asset,
  movement,
  watched,
  watchlistDisabled,
  onToggleWatchlist,
}: {
  asset: MarketAsset;
  movement?: MarketMovement;
  watched: boolean;
  watchlistDisabled: boolean;
  onToggleWatchlist: (symbol: string) => void;
}) {
  const { colors: accountColors } = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { ticker } = asset;
  const change = ticker?.changePercent24h;
  const changeColor =
    change === undefined || change === 0
      ? accountColors.muted
      : change > 0
        ? accountColors.success
        : accountColors.danger;

  return (
    <View style={styles.slot}>
      <View style={styles.row}>
        <AssetAvatar symbol={asset.baseAsset} size={36} />
        <View style={styles.asset}>
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
          <Text
            style={[
              styles.movement,
              {
                color:
                  !movement || movement.changePercent === 0
                    ? accountColors.muted
                    : movement.changePercent > 0
                      ? accountColors.success
                      : accountColors.danger,
              },
            ]}
            accessibilityLabel={
              movement
                ? `${asset.symbol}: ${movement.changePercent > 0 ? "up" : movement.changePercent < 0 ? "down" : "unchanged"}, ${Math.abs(movement.changePercent) > 0 && Math.abs(movement.changePercent) < 0.01 ? "less than 0.01" : Math.abs(movement.changePercent).toFixed(2)} percent since the previous update.`
                : `${asset.symbol}: no recent price comparison available.`
            }
            numberOfLines={1}
          >
            {movement ? formatMovement(movement.changePercent) : "—"}
          </Text>
        </View>
        <View style={styles.price}>
          <Text
            style={styles.amount}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {ticker ? formatPrice(ticker.price) : "Unavailable"}
          </Text>
          <Text style={styles.quote}>{asset.quoteAsset}</Text>
          <View
            style={[
              styles.changeBadge,
              {
                backgroundColor:
                  change === undefined || change === 0
                    ? accountColors.elevated
                    : change > 0
                      ? accountColors.successSoft
                      : accountColors.dangerSoft,
              },
            ]}
          >
            <Text
              style={[styles.change, { color: changeColor }]}
              accessibilityLabel={`${asset.symbol}: ${change === undefined ? "unavailable" : `${change.toFixed(2)} percent`} over 24 hours`}
            >
              {change === undefined
                ? "N/A"
                : `${change > 0 ? "+" : ""}${change.toFixed(2)}%`}
            </Text>
          </View>
        </View>
        <Pressable
          style={[
            styles.watchButton,
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
      height: MARKET_ROW_HEIGHT,
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
      borderRadius: 20,
      backgroundColor: accountColors.surface,
    },
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
    movement: {
      fontSize: 11,
      fontWeight: "600",
      fontVariant: ["tabular-nums"],
    },
    changeBadge: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
    change: { fontSize: 11, fontWeight: "600", fontVariant: ["tabular-nums"] },
  });
