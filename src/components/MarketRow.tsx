import { memo } from "react";
import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { MarketAsset, MarketMovement } from "@/src/types/market";

export const MARKET_ROW_HEIGHT = 96;

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

export const MarketRow = memo(function MarketRow({ asset, movement, watched, watchlistDisabled, onToggleWatchlist }: {
  asset: MarketAsset;
  movement?: MarketMovement;
  watched: boolean;
  watchlistDisabled: boolean;
  onToggleWatchlist: (symbol: string) => void;
}) {
  const { ticker } = asset;
  const change = ticker?.changePercent24h;
  const changeColor =
    change === undefined || change === 0
      ? "#69717B"
      : change > 0
        ? "#137A50"
        : "#BF3344";

  return (
    <View style={styles.row}>
      <Pressable
        style={[styles.watchButton, watchlistDisabled && styles.disabledControl]}
        accessibilityRole="checkbox"
        accessibilityLabel={`${watched ? "Remove" : "Add"} ${asset.symbol} ${watched ? "from" : "to"} watchlist`}
        accessibilityState={{ checked: watched, disabled: watchlistDisabled }}
        aria-checked={watched}
        aria-disabled={watchlistDisabled}
        disabled={watchlistDisabled}
        onPress={() => onToggleWatchlist(asset.symbol)}
      >
        <SymbolView
          name={{ ios: watched ? "star.fill" : "star", android: watched ? "star" : "star_border", web: watched ? "star" : "star_border" }}
          tintColor={watched ? "#B77900" : "#69717B"}
          size={22}
        />
      </Pressable>
      <View style={styles.asset}>
        <Text
          style={[
            styles.symbol,
            asset.baseAsset.length > 8 && styles.longSymbol,
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          {asset.baseAsset}
        </Text>
        <Text style={styles.quote} numberOfLines={1}>
          {asset.baseAsset}/{asset.quoteAsset}
        </Text>
      </View>
      <View style={styles.price}>
        <Text
          style={styles.amount}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {ticker ? formatPrice(ticker.price) : "Unavailable"}
        </Text>
        <Text style={styles.quote}>{asset.quoteAsset}</Text>
        <Text
          style={[styles.movement, { color: !movement || movement.changePercent === 0 ? "#69717B" : movement.changePercent > 0 ? "#137A50" : "#BF3344" }]}
          accessibilityLabel={movement
            ? `${asset.symbol}: ${movement.changePercent > 0 ? "up" : movement.changePercent < 0 ? "down" : "unchanged"}, ${Math.abs(movement.changePercent) > 0 && Math.abs(movement.changePercent) < 0.01 ? "less than 0.01" : Math.abs(movement.changePercent).toFixed(2)} percent since the previous update.`
            : `${asset.symbol}: no recent price comparison available.`}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {movement ? formatMovement(movement.changePercent) : "—"}
        </Text>
      </View>
      <Text
        style={[styles.change, { color: changeColor }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {change === undefined
          ? "N/A"
          : `${change > 0 ? "+" : ""}${change.toFixed(2)}%`}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    height: MARKET_ROW_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E8EB",
  },
  asset: { flex: 1, minWidth: 0, gap: 6 },
  watchButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  disabledControl: { opacity: 0.45 },
  symbol: { fontSize: 16, fontWeight: "600", color: "#20262D" },
  longSymbol: { fontSize: 12 },
  quote: { fontSize: 11, color: "#69717B" },
  price: { flex: 1, minWidth: 0, alignItems: "flex-end", gap: 6 },
  amount: {
    fontSize: 15,
    fontWeight: "500",
    color: "#20262D",
    fontVariant: ["tabular-nums"],
  },
  movement: { fontSize: 11, fontWeight: "600", fontVariant: ["tabular-nums"] },
  change: {
    width: 70,
    textAlign: "right",
    fontSize: 13,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
});
