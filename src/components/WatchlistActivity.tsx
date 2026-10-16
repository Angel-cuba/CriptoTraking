import { Feedback, useAccountStyles } from "@/src/components/AccountScreen";
import { ActionButton } from "@/src/components/ActionButton";
import { useAppTheme } from "@/src/context/ThemeContext";
import { useMarketCatalog } from "@/src/hooks/useMarketCatalog";
import { useProfile } from "@/src/hooks/useProfile";
import { useWatchlistActivity } from "@/src/hooks/useWatchlistActivity";
import { getActivityLevel } from "@/src/services/watchlistActivityService";
import { Link } from "expo-router";
import { ActivityIndicator, Text, View } from "react-native";

export function WatchlistActivity() {
  const styles = useAccountStyles();
  const { colors } = useAppTheme();
  const { profile, loading: profileLoading } = useProfile();
  const market = useMarketCatalog();
  const { activity, outdated, missingCount, loading, error, retry } =
    useWatchlistActivity();
  const count = new Set(profile?.watchlist ?? []).size;
  const level = activity ? getActivityLevel(activity.rangePercent) : null;
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Watchlist activity</Text>
      {!profile ? (
        <Text style={styles.body}>
          {profileLoading
            ? "Waiting for your watchlist…"
            : "Watchlist unavailable."}
        </Text>
      ) : count === 0 ? (
        <Text style={styles.body}>
          Follow pairs in Markets to see their price range.
        </Text>
      ) : activity && level ? (
        <>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <Text
              style={{
                color: colors[level.tone],
                flexGrow: 1,
                fontSize: 17,
                fontWeight: "700",
              }}
            >
              {level.label}
            </Text>
            <Text
              style={{
                color: colors.text,
                fontSize: 26,
                fontWeight: "700",
                fontVariant: ["tabular-nums"],
              }}
            >
              {activity.rangePercent.toFixed(2)}%
            </Text>
          </View>
          <Text style={styles.body}>
            Median 24h range · {activity.symbols.length}{" "}
            {activity.symbols.length === 1 ? "pair" : "pairs"}
          </Text>
          <Text style={styles.body}>
            Calculated {new Date(activity.calculatedAt).toLocaleString()}
          </Text>
          {outdated ? (
            <Text style={[styles.body, { color: colors.primary }]}>
              Saved calculation · waiting for current prices.
            </Text>
          ) : null}
        </>
      ) : loading || (!market.snapshot && market.loading) ? (
        <ActivityIndicator
          color={colors.primary}
          accessibilityLabel="Loading watchlist activity"
        />
      ) : (
        <Text style={styles.body}>
          {missingCount > 0
            ? `Missing prices for ${missingCount} of ${count} pairs.`
            : "Waiting for current market prices."}
        </Text>
      )}
      {error && count > 0 ? (
        <>
          <Feedback message={error} />
          <ActionButton
            title="Retry local activity"
            secondary
            onPress={retry}
          />
        </>
      ) : null}
      {market.error && count > 0 ? (
        <>
          <Feedback message={market.error} />
          <ActionButton
            title="Retry prices"
            secondary
            disabled={
              market.loading || market.paused || market.retryAt !== null
            }
            onPress={market.reload}
          />
        </>
      ) : null}
      <Text style={styles.body}>
        Price range is descriptive and refreshes every 6 hours. Your risk
        preference stays separate.
      </Text>
      <Link
        href={{ pathname: "/markets", params: { scope: "watchlist" } }}
        style={styles.link}
      >
        Manage watchlist
        {profile ? ` · ${count} ${count === 1 ? "pair" : "pairs"}` : ""}
      </Link>
    </View>
  );
}
