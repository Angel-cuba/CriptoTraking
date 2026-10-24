import { Feedback } from "@/src/components/AccountScreen";
import { ActionButton } from "@/src/components/ActionButton";
import { MarketSuggestions } from "@/src/components/MarketSuggestions";
import { SignalCard } from "@/src/components/SignalCard";
import { useSignalNotifications } from "@/src/context/SignalNotificationContext";
import { useAppTheme, useThemeStyles } from "@/src/context/ThemeContext";
import { useAuth } from "@/src/hooks/useAuth";
import { useMarketCatalog } from "@/src/hooks/useMarketCatalog";
import { useProfile } from "@/src/hooks/useProfile";
import { useSignals } from "@/src/hooks/useSignals";
import { getTabContentPadding, type ThemeColors } from "@/src/lib/theme";
import { Link, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

export default function SignalsScreen() {
  const { user } = useAuth();
  return user ? <SignalsContent key={user.id} userId={user.id} /> : null;
}

function SignalsContent({ userId }: { userId: string }) {
  const { colors } = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const insets = useSafeAreaInsets();
  const market = useMarketCatalog();
  const {
    profile,
    loading: profileLoading,
    saving,
    error: profileError,
    reloadProfile,
    toggleWatchlist,
  } = useProfile();
  const assets = useMemo(
    () =>
      new Map(market.snapshot?.assets.map((asset) => [asset.symbol, asset])),
    [market.snapshot],
  );
  const symbols = useMemo(
    () => [...new Set(profile?.watchlist ?? [])].sort(),
    [profile?.watchlist],
  );
  const available =
    !profile || (symbols.length > 0 && !market.snapshot)
      ? null
      : symbols.filter((symbol) => assets.has(symbol));
  const {
    signals,
    freshSymbols,
    failures,
    loading,
    error,
    cacheError,
    refresh,
  } = useSignals(userId, available);
  const readings = useMemo(
    () => new Map(signals.map((item) => [item.symbol, item])),
    [signals],
  );
  const {
    processSignals,
    ready: notificationsReady,
    error: notificationError,
  } = useSignalNotifications();
  const focused = useRef(false);
  const [screenFocused, setScreenFocused] = useState(false);
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);
  const [pendingSymbol, setPendingSymbol] = useState<string | null>(null);
  const following = useRef(false);

  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      setScreenFocused(true);
      return () => {
        focused.current = false;
        setScreenFocused(false);
      };
    }, []),
  );

  useEffect(() => {
    if (
      !screenFocused ||
      !notificationsReady ||
      loading ||
      profileLoading ||
      profileError ||
      !profile
    )
      return;
    let current = true;
    void processSignals(
      signals.filter((signal) => freshSymbols.includes(signal.symbol)),
      profile.watchlist,
      () => current && focused.current,
    );
    return () => {
      current = false;
    };
  }, [
    screenFocused,
    notificationsReady,
    loading,
    profileLoading,
    profileError,
    profile,
    signals,
    freshSymbols,
    processSignals,
  ]);

  async function followPair(symbol: string) {
    if (
      !profile ||
      saving ||
      profileLoading ||
      following.current ||
      market.stale ||
      market.paused ||
      market.error
    )
      return;
    following.current = true;
    setPendingSymbol(symbol);
    try {
      await toggleWatchlist(symbol);
    } finally {
      following.current = false;
      setPendingSymbol(null);
    }
  }

  const refreshDisabled =
    available === null ||
    symbols.length === 0 ||
    profileLoading ||
    market.paused ||
    market.retryAt !== null;
  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <FlatList
        data={symbols}
        keyExtractor={(symbol) => symbol}
        style={styles.content}
        contentContainerStyle={{
          paddingBottom: getTabContentPadding(insets.bottom),
        }}
        initialNumToRender={8}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.headingRow}>
              <View style={styles.headingCopy}>
                <Text accessibilityRole="header" style={styles.title}>
                  Signals
                </Text>
                <Text style={styles.body}>
                  {profile
                    ? `${symbols.length} followed ${symbols.length === 1 ? "pair" : "pairs"}`
                    : profileLoading
                      ? "Loading watchlist…"
                      : "Watchlist unavailable"}
                </Text>
              </View>
              <ActionButton
                title="Refresh"
                accessibilityLabel="Refresh signals"
                secondary
                loading={loading}
                disabled={refreshDisabled}
                onPress={refresh}
              />
            </View>
            <Text style={styles.body}>
              SMA5 / SMA10 · Closed 1h candles · Binance spot
            </Text>
            {[
              {
                message: profileError,
                title: "Retry watchlist",
                disabled: profileLoading || saving,
                onPress: () => void reloadProfile(),
              },
              {
                message: market.error,
                title: "Retry market data",
                disabled:
                  market.loading || market.paused || market.retryAt !== null,
                onPress: market.reload,
              },
              {
                message: error,
                title: "Retry signals",
                disabled: loading || refreshDisabled,
                onPress: refresh,
              },
            ].map(({ message, ...action }) =>
              message ? (
                <View key={action.title} style={styles.issue}>
                  <Feedback message={message} />
                  <ActionButton secondary {...action} />
                </View>
              ) : null,
            )}
            <Feedback message={cacheError} />
            <Feedback message={notificationError} />
            {market.paused || market.stale ? (
              <Text style={styles.body}>
                {market.paused
                  ? "Updates paused."
                  : "Market catalog may be outdated."}
              </Text>
            ) : null}
            {(!profile && profileLoading) ||
            (symbols.length > 0 && !market.snapshot && market.loading) ? (
              <ActivityIndicator
                color={colors.primary}
                accessibilityLabel={
                  !profile ? "Loading watchlist" : "Loading market catalog"
                }
              />
            ) : null}
          </View>
        }
        renderItem={({ item: symbol }) => (
          <SignalCard
            symbol={symbol}
            asset={assets.get(symbol)}
            signal={readings.get(symbol)}
            failure={
              market.snapshot && !assets.has(symbol)
                ? "Pair unavailable in the current market catalog."
                : failures[symbol]
            }
            loading={loading && assets.has(symbol)}
            cached={!freshSymbols.includes(symbol)}
            expanded={expandedSymbol === symbol}
            onToggle={() =>
              setExpandedSymbol((previous) =>
                previous === symbol ? null : symbol,
              )
            }
          />
        )}
        ListEmptyComponent={
          profile ? (
            <MarketSuggestions
              assets={market.snapshot?.assets ?? []}
              pendingSymbol={pendingSymbol}
              disabled={
                saving ||
                profileLoading ||
                !market.snapshot ||
                market.stale ||
                market.paused ||
                Boolean(market.error)
              }
              onFollow={(symbol) => void followPair(symbol)}
            />
          ) : !profileLoading ? (
            <Text style={styles.empty}>
              Your watchlist is unavailable. Retry loading your profile.
            </Text>
          ) : null
        }
        ListFooterComponent={
          <View style={styles.footer}>
            <Link
              href={{ pathname: "/markets", params: { scope: "watchlist" } }}
              style={styles.link}
            >
              Manage watchlist in Markets
            </Link>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { width: "100%", maxWidth: 688, alignSelf: "center" },
    header: { padding: 20, paddingTop: 24, gap: 12 },
    headingRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: 12,
    },
    headingCopy: { flex: 1, minWidth: 120, gap: 2 },
    title: {
      color: colors.text,
      fontSize: 26,
      lineHeight: 34,
      fontWeight: "700",
    },
    body: { color: colors.muted, fontSize: 13, lineHeight: 19 },
    issue: { gap: 8 },
    empty: { color: colors.muted, fontSize: 14, lineHeight: 21, padding: 20 },
    footer: { padding: 20, gap: 14 },
    link: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: "600",
      paddingVertical: 12,
      minHeight: 44,
    },
  });
