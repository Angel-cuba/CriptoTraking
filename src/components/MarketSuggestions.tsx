import { useAccountStyles } from "@/src/components/AccountScreen";
import { MarketRow } from "@/src/components/MarketRow";
import { getMarketSuggestions } from "@/src/services/market/marketSuggestionService";
import type { MarketAsset } from "@/src/types/market";
import { useMemo } from "react";
import { Text, View } from "react-native";

export function MarketSuggestions({
  assets,
  disabled,
  pendingSymbol,
  onFollow,
}: {
  assets: MarketAsset[];
  disabled: boolean;
  pendingSymbol: string | null;
  onFollow: (symbol: string) => void;
}) {
  const styles = useAccountStyles();
  const suggestions = useMemo(() => getMarketSuggestions(assets), [assets]);
  return (
    <View>
      <View style={{ padding: 20, gap: 10 }}>
        <Text style={styles.sectionTitle}>Your watchlist is empty</Text>
        <Text style={styles.body}>
          Start with the most traded USDT pairs by 24h volume.
        </Text>
        {pendingSymbol ? (
          <Text style={styles.body}>Adding {pendingSymbol}…</Text>
        ) : null}
        {suggestions.length === 0 ? (
          <Text style={styles.body}>
            Suggestions are unavailable. Browse Markets to choose a pair.
          </Text>
        ) : null}
      </View>
      {suggestions.map((asset) => (
        <MarketRow
          key={asset.symbol}
          asset={asset}
          watched={false}
          watchlistDisabled={disabled || pendingSymbol !== null}
          onToggleWatchlist={onFollow}
        />
      ))}
    </View>
  );
}
