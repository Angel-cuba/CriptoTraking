import { useAppTheme } from "@/src/context/ThemeContext";
import type { AssetCandle } from "@/src/services/market/assetHistoryService";
import { useMemo, useState } from "react";
import { Text, View, useWindowDimensions } from "react-native";
import { BarChart, CandleStickChart } from "react-native-gifted-charts";

export function formatAssetPrice(value: number): string {
  if (value > 0 && value < 0.000001) return value.toExponential(2);
  return value.toLocaleString("en-US", {
    maximumFractionDigits: value >= 1 ? 2 : 8,
  });
}

export default function PriceChart({
  candles,
  quote,
  base,
}: {
  candles: AssetCandle[];
  quote: string;
  base: string;
}) {
  const { colors } = useAppTheme();
  const { fontScale } = useWindowDimensions();
  // Reserve the axis gutter in the SMA canvas too, so its final points are not clipped.
  const axisWidth = Math.ceil(58 * Math.max(1, fontScale));
  const [containerWidth, setContainerWidth] = useState(0);
  const chart = useMemo(() => {
    const start = Math.max(0, candles.length - 24);
    const visible = candles.slice(start);
    const sma = (index: number, period: number) =>
      index + 1 < period
        ? undefined
        : candles
            .slice(index + 1 - period, index + 1)
            .reduce((sum, item) => sum + item.close, 0) / period;
    const averages = visible.map((_, index) => ({
      sma5: sma(start + index, 5),
      sma10: sma(start + index, 10),
    }));
    const values = visible.flatMap((item, index) => [
      item.low,
      item.high,
      ...Object.values(averages[index]).filter(
        (value): value is number => value !== undefined,
      ),
    ]);
    const low = Math.min(...values);
    const high = Math.max(...values);
    const padding = Math.max(high - low, high * 0.001) * 0.1;
    const baseline = low - padding;
    const range = high - low + padding * 2;
    const scale = (value: number) => ((value - baseline) / range) * 100;
    // Normalize OHLC and averages together; the candle renderer positions wicks from zero.
    const data = visible.map((item) => {
      const color = item.close >= item.open ? colors.success : colors.danger;
      return {
        open: scale(item.open),
        high: scale(item.high),
        low: scale(item.low),
        close: scale(item.close),
        color,
        verticalLineColor: color,
        barBorderColor: color,
      };
    });
    const line = (period: "sma5" | "sma10") =>
      averages.map((item) => ({
        value: item[period] === undefined ? 0 : scale(item[period]!),
      }));
    return {
      visible,
      data,
      line5: line("sma5"),
      line10: line("sma10"),
      averages,
      baseline,
      range,
    };
  }, [candles, colors]);
  const width = Math.max(0, containerWidth - axisWidth - 4);
  const step = Math.max(0, width - 16) / Math.max(1, chart.data.length);
  const barWidth = Math.max(2, step * 0.55);
  const spacing = Math.max(0, step - barWidth);
  const textStyle = { color: colors.muted, fontSize: 10 };
  const first = chart.visible[0];
  const last = chart.visible[chart.visible.length - 1];
  const time = (timestamp: number) =>
    new Date(timestamp).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    });
  return (
    <View
      onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
      style={{ gap: 10 }}
    >
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
        <Text style={{ color: colors.primary, fontSize: 12 }}>━━ SMA5</Text>
        <Text style={{ color: colors.accent, fontSize: 12 }}>━━ SMA10</Text>
        <Text style={{ color: colors.muted, fontSize: 12 }}>
          1h · Closed candles
        </Text>
      </View>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Hourly candlestick chart, ${chart.visible.length} closed candles. First close ${formatAssetPrice(first.close)}, last close ${formatAssetPrice(last.close)} ${quote}. Rising candles are green; falling candles are red. Moving averages are listed below.`}
      >
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          aria-hidden
        >
          {width > 0 ? (
            <CandleStickChart
              data={chart.data}
              width={width}
              height={210}
              barWidth={barWidth}
              spacing={spacing}
              initialSpacing={4}
              endSpacing={axisWidth}
              maxValue={100}
              noOfSections={4}
              yAxisLabelWidth={axisWidth}
              yAxisTextStyle={textStyle}
              yAxisThickness={0}
              xAxisThickness={0}
              xAxisLabelsHeight={0}
              hideAxesAndRules={false}
              rulesColor={colors.border}
              rulesType="dashed"
              formatYLabel={(label) =>
                formatAssetPrice(
                  chart.baseline + (Number(label) / 100) * chart.range,
                )
              }
              verticalLinesShift={barWidth / 2 + 1}
              verticalLinesThickness={1}
              hideOrigin
              hideRules={false}
              disableScroll
              disablePress
              isAnimated={false}
              showLine={chart.averages.some((item) => item.sma5 !== undefined)}
              lineData={chart.line5}
              lineData2={
                chart.averages.some((item) => item.sma10 !== undefined)
                  ? chart.line10
                  : undefined
              }
              lineConfig={{
                color: colors.primary,
                thickness: 1.5,
                hideDataPoints: true,
                isAnimated: false,
                startIndex: chart.averages.findIndex(
                  (item) => item.sma5 !== undefined,
                ),
              }}
              lineConfig2={{
                color: colors.accent,
                thickness: 1.5,
                hideDataPoints: true,
                isAnimated: false,
                startIndex: chart.averages.findIndex(
                  (item) => item.sma10 !== undefined,
                ),
              }}
            />
          ) : null}
        </View>
      </View>
      <Text style={{ color: colors.muted, fontSize: 11 }}>Volume · {base}</Text>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        aria-hidden
      >
        {width > 0 ? (
          <BarChart
            data={chart.visible.map((item) => ({
              value: item.volume,
              frontColor:
                item.close >= item.open ? colors.success : colors.danger,
            }))}
            width={width}
            height={40}
            barWidth={barWidth}
            spacing={spacing}
            initialSpacing={4}
            endSpacing={0}
            yAxisLabelWidth={axisWidth}
            xAxisLabelsHeight={0}
            hideYAxisText
            hideAxesAndRules
            disableScroll
            disablePress
            isAnimated={false}
          />
        ) : null}
      </View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginLeft: axisWidth,
        }}
      >
        <Text style={textStyle}>{time(first.openTime)}</Text>
        <Text style={textStyle}>{time(last.openTime)} UTC</Text>
      </View>
    </View>
  );
}
