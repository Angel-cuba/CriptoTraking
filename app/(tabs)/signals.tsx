import { Feedback } from "@/src/components/AccountScreen";
import { ActionButton } from "@/src/components/ActionButton";
import { BrandArtwork } from "@/src/components/Branding";
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
  const available = profile
    ? symbols.length === 0
      ? []
      : market.snapshot
        ? symbols.filter((symbol) => assets.has(symbol))
        : null
    : null;
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
            <View style={styles.brandHeading}>
              <BrandArtwork subtle />
              <Text style={styles.eyebrow}>YOUR WATCHLIST</Text>
              <Text accessibilityRole="header" style={styles.title}>
                Signals
              </Text>
              <Text style={styles.body}>
                SMA5 / SMA10 crossovers from closed hourly candles.
              </Text>
            </View>
            <ActionButton
              title="Refresh signals"
              loading={loading}
              disabled={refreshDisabled}
              onPress={refresh}
            />
            {profileError ? (
              <>
                <Feedback message={profileError} />
                <ActionButton
                  title="Retry watchlist"
                  secondary
                  disabled={profileLoading || saving}
                  onPress={() => void reloadProfile()}
                />
              </>
            ) : null}
            {market.error ? (
              <>
                <Feedback message={market.error} />
                <ActionButton
                  title="Retry market data"
                  secondary
                  disabled={
                    market.loading || market.paused || market.retryAt !== null
                  }
                  onPress={market.reload}
                />
              </>
            ) : null}
            {cacheError ? <Feedback message={cacheError} /> : null}
            {notificationError ? (
              <Feedback message={notificationError} />
            ) : null}
            {error ? (
              <>
                <Feedback message={error} />
                <ActionButton
                  title="Retry signals"
                  secondary
                  disabled={loading || refreshDisabled}
                  onPress={refresh}
                />
              </>
            ) : null}
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
            {symbols.length ? (
              <Text style={styles.count}>
                {symbols.length} followed{" "}
                {symbols.length === 1 ? "pair" : "pairs"}
              </Text>
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
            <Text style={styles.body}>
              Binance spot · 1h · Technical readings from your followed pairs.
            </Text>
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
    header: { padding: 20, paddingTop: 28, gap: 16 },
    brandHeading: { gap: 12, overflow: "hidden" },
    eyebrow: {
      color: colors.primary,
      fontSize: 12,
      letterSpacing: 1.8,
      fontWeight: "700",
    },
    title: { color: colors.text, fontSize: 30, fontWeight: "700" },
    body: { color: colors.muted, fontSize: 14, lineHeight: 21 },
    count: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "600",
      paddingTop: 8,
    },
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
