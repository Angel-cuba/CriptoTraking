import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AssetAvatar } from "@/src/components/AssetAvatar";
import { useAppTheme, useThemeStyles } from "@/src/context/ThemeContext";
import { CORNER_RADIUS, type ThemeColors } from "@/src/lib/theme";
import type { MarketSymbol } from "@/src/types/market";
import type { PriceAlertEvent } from "@/src/types/priceAlert";
import { DELIVERY_LABELS, formatAssetPrice } from "@/src/lib/assetPresentation";

export function PriceAlertRow({
  event,
  asset,
  onOpen,
}: {
  event: PriceAlertEvent;
  asset?: MarketSymbol;
  onOpen: () => void;
}) {
  const { colors } = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const upward = event.direction === "up";
  const color = upward ? colors.success : colors.danger;
  const pair = asset ? `${asset.baseAsset}/${asset.quoteAsset}` : event.symbol;
  const change = `${upward ? "+" : "-"}${Math.abs(event.changePercent).toFixed(2)}%`;

  return (
    <View style={styles.slot}>
      <Pressable
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`View ${pair} alert details, ${change} from the starting price`}
        accessibilityHint="Open the saved alert and its hourly chart."
      >
        <View style={styles.topLine}>
          <View style={styles.asset}>
            <AssetAvatar symbol={asset?.baseAsset ?? event.symbol} size={32} />
            <Text
              style={[styles.pair, pair.length > 24 && styles.longPair]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
              accessibilityLabel={pair}
            >
              {pair}
            </Text>
          </View>
          <View style={styles.changeGroup}>
            <View
              style={[
                styles.change,
                {
                  backgroundColor: upward
                    ? colors.successSoft
                    : colors.dangerSoft,
                },
              ]}
              accessibilityLabel={`${upward ? "Up" : "Down"} ${Math.abs(event.changePercent).toFixed(2)} percent from the starting price`}
            >
              <SymbolView
                name={{
                  ios: upward ? "arrow.up" : "arrow.down",
                  android: upward ? "north" : "south",
                  web: upward ? "north" : "south",
                }}
                tintColor={color}
                size={14}
              />
              <Text style={[styles.percentage, { color }]}>{change}</Text>
            </View>
            <Text style={styles.caption}>From starting price</Text>
          </View>
        </View>
        <View style={styles.prices}>
          <View style={styles.price}>
            <Text style={styles.caption}>
              Starting price{asset ? ` (${asset.quoteAsset})` : ""}
            </Text>
            <Text
              style={styles.amount}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              {formatAssetPrice(event.referencePrice)}
            </Text>
          </View>
          <SymbolView
            name={{
              ios: "arrow.right",
              android: "arrow_forward",
              web: "arrow_forward",
            }}
            tintColor={colors.muted}
            size={16}
          />
          <View style={styles.price}>
            <Text style={styles.caption}>
              Price at alert{asset ? ` (${asset.quoteAsset})` : ""}
            </Text>
            <Text
              style={styles.amount}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              {formatAssetPrice(event.price)}
            </Text>
          </View>
        </View>
        <Text style={styles.timestamp}>
          {new Date(event.receivedAt).toLocaleString([], {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </Text>
        {event.notificationStatus ? (
          <Text style={styles.caption}>
            {DELIVERY_LABELS[event.notificationStatus]}
          </Text>
        ) : null}
      </Pressable>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    slot: { paddingHorizontal: 20, paddingBottom: 10 },
    card: {
      padding: 14,
      gap: 8,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: CORNER_RADIUS.card,
      backgroundColor: colors.surface,
    },
    topLine: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: 8,
    },
    asset: {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 130,
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    pair: {
      flex: 1,
      minWidth: 0,
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
    },
    longPair: { fontSize: 13 },
    changeGroup: { gap: 5, alignItems: "flex-end" },
    change: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderRadius: 10,
    },
    percentage: {
      fontSize: 13,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
    },
    caption: { fontSize: 11, lineHeight: 16, color: colors.muted },
    prices: { flexDirection: "row", alignItems: "center", gap: 10 },
    price: {
      flex: 1,
      minWidth: 0,
      gap: 3,
    },
    amount: {
      fontSize: 14,
      fontWeight: "600",
      fontVariant: ["tabular-nums"],
      color: colors.text,
    },
    timestamp: { fontSize: 12, lineHeight: 18, color: colors.muted },
  });
