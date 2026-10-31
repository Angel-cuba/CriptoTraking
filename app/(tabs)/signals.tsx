import {
  AssetDetailModal,
  getDetailAsset,
} from "@/src/components/AssetDetailPresentation";
import type { AssetDetailSelection } from "@/src/types/assetDetail";
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
  // Snapshots only change after a successful load; retain that membership during retries.
  const unavailableSymbols = market.snapshot
    ? symbols.filter((symbol) => !assets.has(symbol))
    : [];
  const visibleSymbols = symbols.filter((symbol) =>
    market.snapshot ? assets.has(symbol) : readings.has(symbol),
  );
  const {
    processSignals,
    ready: notificationsReady,
    error: notificationError,
  } = useSignalNotifications();
  const focused = useRef(false);
  const [screenFocused, setScreenFocused] = useState(false);
  const [selectedDetail, setSelectedDetail] =
    useState<AssetDetailSelection | null>(null);
  const [pendingSymbol, setPendingSymbol] = useState<string | null>(null);
  const [showUnavailable, setShowUnavailable] = useState(false);
  const changingWatchlist = useRef(false);

  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      setScreenFocused(true);
      return () => {
        focused.current = false;
        setScreenFocused(false);
        setSelectedDetail(null);
      };
    }, [setSelectedDetail]),
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

  async function changeWatchlist(symbol: string, remove = false) {
    if (
      !profile ||
      saving ||
      profileLoading ||
      changingWatchlist.current ||
      (remove && !profile.watchlist.includes(symbol)) ||
      (!remove && (market.stale || market.paused || market.error))
    )
      return;
    changingWatchlist.current = true;
    setPendingSymbol(symbol);
    try {
      await toggleWatchlist(symbol);
    } finally {
      changingWatchlist.current = false;
      setPendingSymbol(null);
    }
  }

  const refreshDisabled =
    available === null ||
    available.length === 0 ||
    profileLoading ||
    market.paused ||
    market.retryAt !== null;
  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <FlatList
        data={visibleSymbols}
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
                {unavailableSymbols.length > 0 ? (
                  <Text style={styles.body}>
                    {visibleSymbols.length} available · {unavailableSymbols.length}{" "}
                    unavailable
                  </Text>
                ) : null}
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
              Completed hourly prices · Binance
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
            failure={failures[symbol]}
            loading={loading && assets.has(symbol)}
            cached={!freshSymbols.includes(symbol)}
            onOpen={() => {
              const reading = readings.get(symbol);
              if (!reading) return;
              setSelectedDetail({
                asset: getDetailAsset(symbol, assets.get(symbol)),
                context: {
                  kind: "signal",
                  reading,
                  cached: !freshSymbols.includes(symbol),
                  failure: failures[symbol],
                },
              });
            }}
          />
        )}
        ListEmptyComponent={
          profile && symbols.length === 0 ? (
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
              onFollow={(symbol) => void changeWatchlist(symbol)}
            />
          ) : !profile && !profileLoading ? (
            <Text style={styles.empty}>
              Your watchlist is unavailable. Retry loading your profile.
            </Text>
          ) : profile && symbols.length > 0 && !market.loading ? (
            <Text style={styles.empty}>
              {unavailableSymbols.length > 0
                ? "No signals available for your followed pairs. Review unavailable pairs below or manage your watchlist."
                : "Readings will appear when market data is available. Try refreshing market data."}
            </Text>
          ) : null
        }
        ListFooterComponent={
          <View style={styles.footer}>
            {unavailableSymbols.length > 0 ? (
              <View style={styles.unavailable}>
                <View style={styles.headingRow}>
                  <Text accessibilityRole="header" style={styles.sectionTitle}>
                    Unavailable · {unavailableSymbols.length}
                  </Text>
                  <ActionButton
                    title={showUnavailable ? "Hide" : "Review"}
                    accessibilityLabel={
                      showUnavailable
                        ? "Hide unavailable pairs"
                        : "Review unavailable pairs"
                    }
                    secondary
                    onPress={() => setShowUnavailable((shown) => !shown)}
                  />
                </View>
                {showUnavailable ? (
                  <>
                    <Text style={styles.body}>
                      These pairs are absent from the last loaded catalog. They
                      stay in your watchlist until you remove them.
                    </Text>
                    {unavailableSymbols.map((symbol) => (
                      <View key={symbol} style={styles.headingRow}>
                        <Text style={styles.unavailableSymbol}>{symbol}</Text>
                        <ActionButton
                          title="Remove"
                          accessibilityLabel={`Remove ${symbol} from watchlist`}
                          secondary
                          loading={pendingSymbol === symbol}
                          disabled={saving || profileLoading || !profile}
                          onPress={() => void changeWatchlist(symbol, true)}
                        />
                      </View>
                    ))}
                  </>
                ) : null}
              </View>
            ) : null}
            <Link
              href={{ pathname: "/markets", params: { scope: "watchlist" } }}
              style={styles.link}
            >
              Manage watchlist in Markets
            </Link>
          </View>
        }
      />
      <AssetDetailModal
        asset={selectedDetail?.asset ?? null}
        context={selectedDetail?.context}
        onClose={() => setSelectedDetail(null)}
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
    unavailable: {
      padding: 14,
      gap: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    sectionTitle: { flex: 1, color: colors.text, fontSize: 15, fontWeight: "600" },
    unavailableSymbol: {
      flex: 1,
      minWidth: 100,
      color: colors.text,
      fontSize: 14,
      fontWeight: "600",
    },
    link: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: "600",
      paddingVertical: 12,
      minHeight: 44,
    },
  });
