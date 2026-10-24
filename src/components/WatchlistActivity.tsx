import { Link } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Feedback, useAccountStyles } from "@/src/components/AccountScreen";
import { ActionButton } from "@/src/components/ActionButton";
import { SettingsRow } from "@/src/components/SettingsRow";
import { useAppTheme, useThemeStyles } from "@/src/context/ThemeContext";
import { useMarketCatalog } from "@/src/hooks/useMarketCatalog";
import { useProfile } from "@/src/hooks/useProfile";
import { useWatchlistActivity } from "@/src/hooks/useWatchlistActivity";
import { CORNER_RADIUS, type ThemeColors } from "@/src/lib/theme";
import { getActivityLevel } from "@/src/services/watchlist/watchlistActivityService";

export function WatchlistActivity({
  disabled = false,
}: {
  disabled?: boolean;
}) {
  const accountStyles = useAccountStyles();
  const styles = useThemeStyles(createStyles);
  const { colors } = useAppTheme();
  const { profile, loading: profileLoading } = useProfile();
  const market = useMarketCatalog();
  const { activity, outdated, missingCount, loading, error, retry } =
    useWatchlistActivity();
  const [expanded, setExpanded] = useState(false);
  const [focused, setFocused] = useState(false);
  const count = new Set(profile?.watchlist ?? []).size;
  const level = activity ? getActivityLevel(activity.rangePercent) : null;
  const waiting = !profile
    ? profileLoading
    : count > 0 &&
      !activity &&
      (loading || (!market.snapshot && market.loading));
  const summary = !profile
    ? profileLoading
      ? "Waiting for your watchlist…"
      : "Watchlist unavailable"
    : count === 0
      ? "Follow pairs to see their price range"
      : activity && level
        ? `${level.label} · ${activity.rangePercent.toFixed(2)}%`
        : waiting
          ? "Loading activity…"
          : missingCount > 0
            ? `Missing prices for ${missingCount} of ${count} pairs`
            : "Waiting for current prices";

  return (
    <View style={styles.group}>
      <SettingsRow
        title="Watchlist"
        description={
          profile
            ? `${count} followed ${count === 1 ? "pair" : "pairs"}`
            : profileLoading
              ? "Loading watchlist…"
              : "Watchlist unavailable"
        }
      >
        <Link
          href={{ pathname: "/markets", params: { scope: "watchlist" } }}
          asChild
        >
          <Pressable
            disabled={disabled}
            accessibilityLabel="Manage watchlist"
            style={styles.manageTarget}
          >
            <Text style={styles.manage}>Manage ›</Text>
          </Pressable>
        </Link>
      </SettingsRow>
      <View style={styles.divider} />
      <Pressable
        onPress={() => setExpanded((value) => !value)}
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityRole="button"
        accessibilityLabel={`Median 24-hour watchlist range: ${summary}`}
        accessibilityHint="Show or hide the calculation date and explanation."
        accessibilityState={{ expanded, disabled }}
        aria-expanded={expanded}
        style={({ pressed }) => [
          styles.activity,
          pressed && styles.pressed,
          focused && styles.focused,
        ]}
      >
        <SettingsRow
          title={
            <Text style={{ color: level ? colors[level.tone] : colors.muted }}>
              {summary}
            </Text>
          }
          description="Median 24h range"
        >
          {waiting ? (
            <ActivityIndicator
              color={colors.primary}
              accessibilityLabel="Loading watchlist activity"
            />
          ) : null}
          <SymbolView
            name={{
              ios: expanded ? "chevron.up" : "chevron.down",
              android: expanded ? "expand_less" : "expand_more",
              web: expanded ? "expand_less" : "expand_more",
            }}
            tintColor={colors.muted}
            size={18}
          />
        </SettingsRow>
      </Pressable>
      {outdated ? (
        <Text style={styles.saved}>
          Saved calculation · waiting for current prices.
        </Text>
      ) : null}
      {expanded ? (
        <View style={styles.details}>
          {activity ? (
            <Text style={accountStyles.body}>
              Calculated {new Date(activity.calculatedAt).toLocaleString()}
            </Text>
          ) : null}
          <Text style={accountStyles.body}>
            Price range is descriptive. A calculation older than 6 hours is
            refreshed when current prices are available.
          </Text>
        </View>
      ) : null}
      {count > 0
        ? [
            {
              message: error,
              title: "Retry local activity",
              onPress: retry,
              disabled,
            },
            {
              message: market.error,
              title: "Retry prices",
              onPress: market.reload,
              disabled:
                disabled ||
                market.loading ||
                market.paused ||
                market.retryAt !== null,
            },
          ].map(({ message, ...action }) =>
            message ? (
              <View key={action.title} style={styles.details}>
                <Feedback message={message} />
                <ActionButton secondary {...action} />
              </View>
            ) : null,
          )
        : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    group: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: CORNER_RADIUS.card,
      backgroundColor: colors.surface,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
    },
    manage: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: "600",
    },
    manageTarget: {
      minHeight: 48,
      minWidth: 64,
      paddingLeft: 8,
      justifyContent: "center",
      alignItems: "flex-end",
    },
    activity: { borderRadius: 8 },
    saved: {
      color: colors.primary,
      fontSize: 13,
      lineHeight: 19,
      paddingBottom: 8,
    },
    details: { gap: 8, paddingVertical: 8 },
    pressed: { opacity: 0.7 },
    focused: {
      outlineStyle: "solid",
      outlineWidth: 2,
      outlineColor: colors.accent,
      outlineOffset: 2,
    },
  });
