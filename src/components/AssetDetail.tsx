import type { AssetDetailContext } from "@/src/types/assetDetail";
import {
  DELIVERY_LABELS,
  SIGNAL_COPY,
  formatAssetPrice,
} from "@/src/lib/assetPresentation";
import { useAppTheme, useThemeStyles } from "@/src/context/ThemeContext";
import { useAssetDetails } from "@/src/hooks/useAssetDetails";
import { CORNER_RADIUS, type ThemeColors } from "@/src/lib/theme";
import type { MarketAsset } from "@/src/types/market";
import type { PriceAlertEvent } from "@/src/types/priceAlert";
import { useEffect, useRef, useState, type ReactNode } from "react";
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
import PriceChart from "./PriceChart";

function formatDetailTime(time: number): string {
  return new Date(time).toLocaleString("en-GB", {
    day: "2-digit",
    year: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
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
  const [showPairHelp, setShowPairHelp] = useState(false);
  const [showIndicators, setShowIndicators] = useState(context?.kind === "signal");
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
            <View style={styles.pairHeading}>
              <Text
                accessibilityRole="header"
                style={[styles.title, { flexShrink: 1 }]}
              >
                {asset.quoteAsset
                  ? `${asset.baseAsset}/${asset.quoteAsset}`
                  : asset.symbol}
              </Text>
              {asset.quoteAsset ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`What does ${asset.baseAsset}/${asset.quoteAsset} mean?`}
                  accessibilityState={{ expanded: showPairHelp }}
                  onPress={() => setShowPairHelp((value) => !value)}
                  style={styles.infoButton}
                >
                  <Text style={styles.infoLabel}>ⓘ</Text>
                </Pressable>
              ) : null}
            </View>
            <Text style={styles.caption}>
              {asset.quoteAsset ? `Price in ${asset.quoteAsset} · ` : ""}Binance
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
        {showPairHelp && asset.quoteAsset ? (
          <View style={styles.helpPanel}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              Understanding this pair
            </Text>
            <Text style={styles.body}>
              {asset.baseAsset} is the asset you are viewing. {asset.quoteAsset}{" "}
              is the currency used to show its price.
            </Text>
            <Text style={styles.caption}>
              Prices tell you how much {asset.quoteAsset} one {asset.baseAsset}{" "}
              is worth.
            </Text>
          </View>
        ) : null}
        {context ? (
          <EventSummary
            context={context}
            base={asset.baseAsset}
            quote={asset.quoteAsset}
          />
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
              {context?.kind === "alert"
                ? "Price before the alert"
                : context?.kind === "signal"
                  ? "Price before the signal"
                  : "Price history"}
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
          <Text style={styles.caption}>
            {context
              ? "Completed hours leading up to this event."
              : "The latest completed hours of trading."}{" "}
            Each candle shows one hour of price changes.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showIndicators }}
            onPress={() => setShowIndicators((value) => !value)}
            style={styles.disclosureButton}
          >
            <Text style={styles.disclosureLabel}>
              {showIndicators ? "Hide moving averages" : "Show moving averages"}
            </Text>
            <Text style={styles.disclosureLabel}>{showIndicators ? "−" : "+"}</Text>
          </Pressable>
          {showIndicators ? (
            <Text style={styles.caption}>
              These lines show the average closing price over 5 and 10 completed
              hours. The 10-hour average includes the same 5 recent hours.
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
              showIndicators={showIndicators}
            />
          ) : !loading && !error ? (
            <Text style={styles.caption}>
              Not enough closed hourly candles to show a chart yet.
            </Text>
          ) : null}
        </View>
        {last ? (
          <View style={styles.card}>
            <DetailDisclosure label="Hourly price details">
              <Text style={styles.caption}>
                Opening, highest, lowest and closing prices for the last completed
                hour in this chart.
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
              {showIndicators && history?.reading && context?.kind !== "signal" ? (
                <>
                  <View style={styles.grid}>
                    {[
                      ["5-hour average", history.reading.sma5],
                      ["10-hour average", history.reading.sma10],
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
                    <Text style={styles.body}>
                      {SIGNAL_COPY[history.reading.type].summary}
                    </Text>
                  ) : null}
                </>
              ) : showIndicators && !history?.reading ? (
                <Text style={styles.caption}>
                  More completed hours are needed to analyze these averages.
                </Text>
              ) : null}
            </DetailDisclosure>
          </View>
        ) : null}
        {context?.kind === "alert" ? (
          <View style={styles.card}>
            <DetailDisclosure label="Technical details">
              <Text style={styles.caption}>
                Data received · {formatDetailTime(context.event.receivedAt)}
              </Text>
              <Text style={styles.caption}>
                Alert saved · {formatDetailTime(context.event.createdAt)}
              </Text>
              <Text style={styles.caption}>
                {DELIVERY_LABELS[context.event.notificationStatus ?? "unknown"]}
              </Text>
            </DetailDisclosure>
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
  base,
  quote,
}: {
  context: AssetDetailContext;
  base: string;
  quote: string;
}) {
  const { colors } = useAppTheme();
  const styles = useThemeStyles(createStyles);
  if (context.kind === "alert") {
    return <PriceAlertSummary event={context.event} base={base} quote={quote} />;
  }
  const upward = context.reading.type === "BUY";
  const color =
    context.reading.type === "NEUTRAL"
      ? colors.text
      : upward
        ? colors.success
        : colors.danger;
  const metrics: [string, number][] = [
    ["5-hour average", context.reading.sma5],
    ["10-hour average", context.reading.sma10],
  ];
  return (
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        {context.cached ? "Saved signal reading" : "Signal reading"}
      </Text>
      <Text style={[styles.signalTitle, { color }]}>
        {SIGNAL_COPY[context.reading.type].label}
      </Text>
      <Text style={styles.body}>{SIGNAL_COPY[context.reading.type].summary}</Text>
      <DetailDisclosure label="How this signal works">
        <Text style={styles.body}>
          We compare the average closing price over the last 5 completed hours
          with the last 10. The 10-hour average includes those same 5 recent hours.
          A new signal appears only when the two averages cross.
        </Text>
        <Text style={styles.caption}>
          This describes past price movements and does not predict what happens
          next. No new signal does not mean the price stayed the same.
        </Text>
        <View style={styles.grid}>
          {metrics.map(([label, value]) => (
            <View key={label} style={styles.metric}>
              <Text style={styles.caption}>
                {label}
                {quote ? ` · ${quote}` : ""}
              </Text>
              <Text style={styles.value}>{formatAssetPrice(value)}</Text>
            </View>
          ))}
        </View>
      </DetailDisclosure>
      <DetailDisclosure label="Technical details">
        <Text style={styles.caption}>Result code · {context.reading.type}</Text>
        <Text style={styles.body}>{context.reading.reason}</Text>
      </DetailDisclosure>
      <Text style={styles.caption}>
        Analyzed hour · {formatDetailTime(context.reading.timestamp)}
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
    </View>
  );
}

function PriceAlertSummary({
  event,
  base,
  quote,
}: {
  event: PriceAlertEvent;
  base: string;
  quote: string;
}) {
  const { colors } = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const upward = event.direction === "up";
  const color = upward ? colors.success : colors.danger;
  return (
    <View style={styles.card}>
      <Text style={styles.caption}>Price alert</Text>
      <View style={{ gap: 4 }}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          {base} went {upward ? "up" : "down"}
        </Text>
        <Text style={[styles.price, { color }]}>
          {upward ? "+" : "−"}
          {Math.abs(event.changePercent).toFixed(2)}%
        </Text>
        <Text style={styles.caption}>Compared with the saved reference price.</Text>
      </View>
      <View style={styles.priceComparison}>
        {([
          ["Saved reference", event.referencePrice],
          ["Price at alert", event.price],
        ] as const).map(([label, value]) => (
          <View key={label} style={styles.comparisonRow}>
            <Text style={styles.caption}>{label}</Text>
            <Text style={styles.value}>
              {formatAssetPrice(value)}
              {quote ? ` ${quote}` : ""}
            </Text>
          </View>
        ))}
      </View>
      <Text style={styles.caption}>
        Detected · {formatDetailTime(event.sourceCloseTime)}
      </Text>
      <DetailDisclosure label="How this alert works">
        <Text style={styles.body}>
          The saved reference is the price used for comparison. This alert was
          recorded when {base} moved {upward ? "above" : "below"} that price.
        </Text>
        <Text style={styles.caption}>
          “Price at alert” is the price at that moment, rather than a live quote.
          This alert describes a change that already happened.
        </Text>
      </DetailDisclosure>
    </View>
  );
}

function DetailDisclosure({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const styles = useThemeStyles(createStyles);
  return (
    <View style={{ gap: expanded ? 12 : 0 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((value) => !value)}
        style={styles.disclosureButton}
      >
        <Text style={[styles.disclosureLabel, { flex: 1 }]}>{label}</Text>
        <Text style={styles.disclosureLabel}>{expanded ? "−" : "+"}</Text>
      </Pressable>
      {expanded ? <View style={{ gap: 12 }}>{children}</View> : null}
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
    pairHeading: { flexDirection: "row", alignItems: "center", gap: 4 },
    infoButton: {
      minWidth: 44,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    infoLabel: { color: colors.primary, fontSize: 20 },
    helpPanel: {
      backgroundColor: colors.elevated,
      padding: 16,
      borderRadius: CORNER_RADIUS.control,
      gap: 8,
    },
    priceComparison: {
      backgroundColor: colors.elevated,
      padding: 14,
      borderRadius: CORNER_RADIUS.control,
      gap: 12,
    },
    comparisonRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 8,
    },
    disclosureButton: {
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    disclosureLabel: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: "600",
      flexShrink: 1,
    },
    title: { color: colors.text, fontSize: 18, fontWeight: "700" },
    caption: { color: colors.muted, fontSize: 12, lineHeight: 18 },
    body: { color: colors.text, fontSize: 14, lineHeight: 20 },
    signalTitle: { color: colors.text, fontSize: 24, lineHeight: 30, fontWeight: "700" },
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
