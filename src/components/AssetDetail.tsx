import type { AssetDetailContext } from "@/src/types/assetDetail";
import { DELIVERY_LABELS } from "./PriceAlertRow";
import { useAppTheme, useThemeStyles } from "@/src/context/ThemeContext";
import { useAssetDetails } from "@/src/hooks/useAssetDetails";
import { CORNER_RADIUS, type ThemeColors } from "@/src/lib/theme";
import type { MarketAsset } from "@/src/types/market";
import { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AssetAvatar } from "./AssetAvatar";
import PriceChart, { formatAssetPrice } from "./PriceChart";

function formatDetailTime(time: number): string {
  return (
    new Date(time).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "UTC",
    }) + " UTC"
  );
}

export default function AssetDetail({
  asset,
  context,
  onClose,
}: {
  asset: MarketAsset;
  context?: AssetDetailContext;
  onClose: () => void;
}) {
  const { colors } = useAppTheme();
  const closeButton = useRef<View>(null);
  useEffect(() => {
    if (Platform.OS === "web") closeButton.current?.focus();
  }, []);
  const styles = useThemeStyles(createStyles);
  const asOf =
    context?.kind === "signal"
      ? context.reading.timestamp
      : context?.kind === "alert"
        ? context.event.sourceCloseTime
        : undefined;
  const { history, loading, error, waiting, reload } = useAssetDetails(
    asset.symbol,
    asOf,
  );
  const last = history?.candles.at(-1);
  const ticker = asset.ticker;
  return (
    <View style={styles.screen} accessibilityViewIsModal>
      <View style={styles.header}>
        <View style={styles.identity}>
          <AssetAvatar symbol={asset.baseAsset} size={40} />
          <View style={{ flexShrink: 1 }}>
            <Text accessibilityRole="header" style={styles.title}>
              {asset.quoteAsset
                ? `${asset.baseAsset}/${asset.quoteAsset}`
                : asset.symbol}
            </Text>
            <Text style={styles.caption}>
              {context?.kind === "signal"
                ? "Signal analysis"
                : context?.kind === "alert"
                  ? "Alert analysis"
                  : "Market analysis"}{" "}
              · Binance
            </Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          ref={closeButton}
          accessibilityLabel="Close asset details"
          onPress={onClose}
          style={styles.close}
        >
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {context ? (
          <EventSummary context={context} quote={asset.quoteAsset} />
        ) : (
          <View style={{ gap: 6 }}>
            <Text style={styles.caption}>
              Last ticker price · {asset.quoteAsset}
            </Text>
            <Text style={styles.price}>
              {ticker ? formatAssetPrice(ticker.price) : "Unavailable"}
            </Text>
            <Text
              style={{
                color: ticker
                  ? ticker.changePercent24h >= 0
                    ? colors.success
                    : colors.danger
                  : colors.muted,
                fontSize: 14,
                fontWeight: "600",
              }}
            >
              {ticker
                ? `${ticker.changePercent24h >= 0 ? "+" : ""}${ticker.changePercent24h.toFixed(2)}% over 24h`
                : "No ticker data"}
            </Text>
            {ticker ? (
              <Text style={styles.caption}>
                Ticker as of {formatDetailTime(ticker.sourceCloseTime)}
              </Text>
            ) : null}
          </View>
        )}
        {context && !asset.quoteAsset ? (
          <Text style={styles.caption}>
            Pair metadata unavailable. Prices use the original quote currency;
            volume uses the base asset.
          </Text>
        ) : null}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              Price & volume
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Refresh hourly chart"
              accessibilityState={{ disabled: loading || waiting }}
              disabled={loading || waiting}
              onPress={reload}
              style={[styles.refresh, (loading || waiting) && { opacity: 0.5 }]}
            >
              <Text style={styles.refreshLabel}>
                {loading ? "Loading…" : "Refresh"}
              </Text>
            </Pressable>
          </View>
          {asOf !== undefined ? (
            <Text style={styles.caption}>
              Hourly context as of {formatDetailTime(asOf)}. Only candles closed
              by this time are included.
            </Text>
          ) : null}
          {loading && !history ? (
            <View style={styles.placeholder}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.caption}>Loading hourly candles…</Text>
            </View>
          ) : null}
          {error ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
              {history ? " Showing previously loaded data." : ""}
            </Text>
          ) : null}
          {history && history.candles.length >= 2 ? (
            <PriceChart
              candles={history.candles}
              quote={asset.quoteAsset || "quote units"}
              base={asset.quoteAsset ? asset.baseAsset : "base units"}
            />
          ) : !loading && !error ? (
            <Text style={styles.caption}>
              Not enough closed hourly candles to show a chart yet.
            </Text>
          ) : null}
          {history ? (
            <Text style={styles.caption}>
              Loaded {formatDetailTime(history.receivedAt)} ·{" "}
              {Math.min(24, history.candles.length)} hourly candles
            </Text>
          ) : null}
        </View>
        {last ? (
          <View style={styles.card}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              {context
                ? "Last closed candle in this chart"
                : "Latest closed candle"}
            </Text>
            <Text style={styles.caption}>
              {formatDetailTime(last.closeTime)} · Prices in{" "}
              {asset.quoteAsset || "quote units"}
            </Text>
            <View style={styles.grid}>
              {[
                ["Open", last.open],
                ["High", last.high],
                ["Low", last.low],
                ["Close", last.close],
              ].map(([label, value]) => (
                <View key={label} style={styles.metric}>
                  <Text style={styles.caption}>{label}</Text>
                  <Text style={styles.value}>
                    {formatAssetPrice(Number(value))}
                  </Text>
                </View>
              ))}
            </View>
            <Text style={styles.caption}>
              Volume {formatAssetPrice(last.volume)}{" "}
              {asset.quoteAsset ? asset.baseAsset : "base units"}
            </Text>
            {history?.reading && context?.kind !== "signal" ? (
              <>
                <View style={styles.grid}>
                  {[
                    ["SMA5", history.reading.sma5],
                    ["SMA10", history.reading.sma10],
                  ].map(([label, value]) => (
                    <View key={label} style={styles.metric}>
                      <Text style={styles.caption}>{label}</Text>
                      <Text style={styles.value}>
                        {formatAssetPrice(Number(value))}
                      </Text>
                    </View>
                  ))}
                </View>
                {!context ? (
                  <Text style={styles.body}>{history.reading.reason}</Text>
                ) : null}
              </>
            ) : !history?.reading ? (
              <Text style={styles.caption}>
                At least 11 closed candles are needed for a crossover reading.
              </Text>
            ) : null}
          </View>
        ) : null}
        {ticker && !context ? (
          <View style={styles.card}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              24h market statistics
            </Text>
            <View style={styles.grid}>
              {[
                [
                  "High",
                  `${formatAssetPrice(ticker.high24h)} ${asset.quoteAsset}`,
                ],
                [
                  "Low",
                  `${formatAssetPrice(ticker.low24h)} ${asset.quoteAsset}`,
                ],
                [
                  "Base volume",
                  `${formatAssetPrice(ticker.volume24h)} ${asset.baseAsset}`,
                ],
                [
                  "Quote volume",
                  `${formatAssetPrice(ticker.quoteVolume24h)} ${asset.quoteAsset}`,
                ],
              ].map(([label, value]) => (
                <View key={label} style={styles.metric}>
                  <Text style={styles.caption}>{label}</Text>
                  <Text style={styles.value}>{value}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
function EventSummary({
  context,
  quote,
}: {
  context: AssetDetailContext;
  quote: string;
}) {
  const { colors } = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const price = (value: number) =>
    value < 0.0000001
      ? value.toExponential(4)
      : value.toLocaleString("en-US", { maximumSignificantDigits: 10 });
  const upward =
    context.kind === "signal"
      ? context.reading.type === "BUY"
      : context.event.direction === "up";
  const color =
    context.kind === "signal" && context.reading.type === "NEUTRAL"
      ? colors.text
      : upward
        ? colors.success
        : colors.danger;
  const metrics: [string, number][] =
    context.kind === "signal"
      ? [
          ["SMA5", context.reading.sma5],
          ["SMA10", context.reading.sma10],
        ]
      : [
          ["Reference", context.event.referencePrice],
          ["Observed", context.event.price],
        ];
  return (
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        {context.kind === "signal"
          ? context.cached
            ? "Saved signal reading"
            : "Signal reading"
          : "Price alert"}
      </Text>
      <Text style={[styles.price, { color }]}>
        {context.kind === "signal"
          ? context.reading.type
          : `${upward ? "+" : "−"}${Math.abs(context.event.changePercent).toFixed(2)}%`}
      </Text>
      <Text style={styles.body}>
        {context.kind === "signal"
          ? context.reading.reason
          : "Movement from the saved reference price."}
      </Text>
      <View style={styles.grid}>
        {metrics.map(([label, value]) => (
          <View key={label} style={styles.metric}>
            <Text style={styles.caption}>
              {label}
              {quote ? ` · ${quote}` : ""}
            </Text>
            <Text style={styles.value}>{price(value)}</Text>
          </View>
        ))}
      </View>
      {context.kind === "signal" ? (
        <>
          <Text style={styles.caption}>
            Closed candle · {formatDetailTime(context.reading.timestamp)}
          </Text>
          <Text style={styles.caption}>
            Checked ·{" "}
            {context.reading.checkedAt
              ? formatDetailTime(context.reading.checkedAt)
              : "Time unavailable"}
          </Text>
          {context.failure ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {context.failure} Showing the saved reading.
            </Text>
          ) : null}
        </>
      ) : (
        <>
          <Text style={styles.caption}>
            Price observed · {formatDetailTime(context.event.sourceCloseTime)}
          </Text>
          <Text style={styles.caption}>
            Received · {formatDetailTime(context.event.receivedAt)}
          </Text>
          <Text style={styles.caption}>
            Created · {formatDetailTime(context.event.createdAt)}
          </Text>
          <Text style={styles.body}>
            {DELIVERY_LABELS[context.event.notificationStatus ?? "unknown"]}
          </Text>
          <Text style={styles.caption}>
            This alert tracks price movement. The hourly chart below provides
            context; an SMA crossover is a separate signal.
          </Text>
        </>
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingHorizontal: 20,
      paddingVertical: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    identity: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
    title: { color: colors.text, fontSize: 18, fontWeight: "700" },
    caption: { color: colors.muted, fontSize: 12, lineHeight: 18 },
    body: { color: colors.text, fontSize: 14, lineHeight: 20 },
    price: {
      color: colors.text,
      fontSize: 32,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
    },
    close: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 22,
      backgroundColor: colors.elevated,
    },
    closeText: { color: colors.text, fontSize: 20 },
    content: {
      width: "100%",
      maxWidth: 760,
      alignSelf: "center",
      padding: 20,
      paddingBottom: 40,
      gap: 20,
    },
    card: {
      borderRadius: CORNER_RADIUS.card,
      backgroundColor: colors.surface,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 14,
      overflow: "hidden",
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: 8,
    },
    sectionTitle: { color: colors.text, fontSize: 16, fontWeight: "600" },
    refresh: {
      minHeight: 44,
      justifyContent: "center",
      paddingHorizontal: 12,
      borderRadius: 14,
      backgroundColor: colors.primarySoft,
    },
    refreshLabel: { color: colors.primary, fontSize: 13, fontWeight: "600" },
    placeholder: {
      minHeight: 240,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
    },
    error: { color: colors.danger, fontSize: 13, lineHeight: 20 },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
    metric: { minWidth: "42%", flexGrow: 1, flexBasis: "40%", gap: 4 },
    value: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "600",
      fontVariant: ["tabular-nums"],
    },
  });
