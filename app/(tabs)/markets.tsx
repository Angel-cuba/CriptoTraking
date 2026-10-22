import { useAppTheme, useThemeStyles } from "@/src/context/ThemeContext";
import {
  CONTROL_HEIGHT,
  CORNER_RADIUS,
  getTabContentPadding,
  type ThemeColors,
} from "@/src/lib/theme";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { MarketOptionsModal } from "@/src/components/MarketOptionsModal";
import {
  MARKET_ROW_HEIGHT,
  MarketRow,
  type MarketChangeView,
} from "@/src/components/MarketRow";
import { MarketSuggestions } from "@/src/components/MarketSuggestions";
import { useMarketCatalog } from "@/src/hooks/useMarketCatalog";
import { useProfile } from "@/src/hooks/useProfile";
import type { MarketAsset, MarketSnapshot } from "@/src/types/market";

const SORT_OPTIONS = [
  { value: "name", label: "Asset A-Z" },
  { value: "gainers", label: "24h change: highest first" },
  { value: "losers", label: "24h change: lowest first" },
] as const;

type Sort = (typeof SORT_OPTIONS)[number]["value"];

const CHANGE_VIEWS: { value: MarketChangeView; label: string }[] = [
  { value: "24h", label: "24h" },
  { value: "update", label: "Last update" },
  { value: "both", label: "Both" },
];

export default function MarketsScreen() {
  const { scope } = useLocalSearchParams<{ scope?: string }>();
  const { colors: accountColors } = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const insets = useSafeAreaInsets();
  const {
    snapshot,
    movements,
    loading,
    error,
    stale,
    paused,
    retryAt,
    reload,
  } = useMarketCatalog();
  const {
    profile,
    loading: profileLoading,
    saving,
    error: profileError,
    reloadProfile,
    toggleWatchlist,
  } = useProfile();
  const [pendingSymbol, setPendingSymbol] = useState<string | null>(null);
  const pendingFollow = useRef(false);
  const list = useRef<FlatList<MarketAsset>>(null);
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const [changeView, setChangeView] = useState<MarketChangeView>("24h");
  const watchlistDisabled =
    profileLoading || saving || !profile || pendingSymbol !== null;
  const watched = useMemo(
    () => new Set(profile?.watchlist ?? []),
    [profile?.watchlist],
  );
  const toggle = useCallback(
    async (symbol: string) => {
      if (watchlistDisabled || pendingFollow.current) return;
      pendingFollow.current = true;
      setPendingSymbol(symbol);
      try {
        await toggleWatchlist(symbol);
      } finally {
        pendingFollow.current = false;
        setPendingSymbol(null);
      }
    },
    [toggleWatchlist, watchlistDisabled],
  );
  const rowState = useMemo(
    () => ({
      changeView,
      movements: stale || paused ? null : movements,
      watched,
      watchlistDisabled,
    }),
    [changeView, movements, stale, paused, watched, watchlistDisabled],
  );
  const refreshUnavailable = loading || paused || retryAt !== null;
  const [search, setSearch] = useState("");
  const [quote, setQuote] = useState("ALL");
  const [sort, setSort] = useState<Sort>("name");
  const [sortSnapshot, setSortSnapshot] = useState<MarketSnapshot | null>(null);
  const [menu, setMenu] = useState<"quote" | "sort" | "change" | null>(null);
  const [watchlistOnly, setWatchlistOnly] = useState(true);

  const changeScope = useCallback((onlyWatched: boolean) => {
    setWatchlistOnly(onlyWatched);
    setSearch("");
    setQuote(onlyWatched ? "ALL" : "USDT");
    setMenu(null);
    list.current?.scrollToOffset({ offset: 0, animated: false });
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (scope !== "watchlist") return;
      changeScope(true);
      router.setParams({ scope: undefined });
    }, [scope, changeScope]),
  );

  async function refreshList() {
    if (refreshUnavailable) return;
    setPullRefreshing(true);
    try {
      await reload();
    } finally {
      setPullRefreshing(false);
    }
  }

  const quotes = useMemo(
    () =>
      [...new Set(snapshot?.assets.map((asset) => asset.quoteAsset))].sort(),
    [snapshot],
  );

  const markets = useMemo(() => {
    const query = search.toUpperCase().replace(/[\s/_-]/g, "");
    const filtered = (snapshot?.assets ?? []).filter(
      (asset) =>
        (!watchlistOnly || watched.has(asset.symbol)) &&
        (quote === "ALL" || asset.quoteAsset === quote) &&
        asset.symbol.toUpperCase().includes(query),
    );

    // Rank from the user's last selection; rows keep showing current prices.
    const ranking = new Map(
      sortSnapshot?.assets.map((asset) => [
        asset.symbol,
        asset.ticker?.changePercent24h,
      ]),
    );
    return filtered.sort((a, b) => {
      const alphabetical = a.symbol.localeCompare(b.symbol);
      if (sort === "name") return alphabetical;
      const aChange = ranking.get(a.symbol);
      const bChange = ranking.get(b.symbol);
      if (aChange === undefined && bChange === undefined) return alphabetical;
      if (aChange === undefined) return 1;
      if (bChange === undefined) return -1;
      const difference = bChange - aChange;
      return (sort === "gainers" ? difference : -difference) || alphabetical;
    });
  }, [snapshot, search, quote, sort, sortSnapshot, watchlistOnly, watched]);

  const options =
    menu === "quote"
      ? ["ALL", ...quotes].map((value) => ({
          label: value === "ALL" ? "All pairs" : value,
          selected: quote === value,
          onSelect: () => setQuote(value),
        }))
      : menu === "change"
        ? CHANGE_VIEWS.map((view) => ({
            label: view.label,
            selected: changeView === view.value,
            onSelect: () => setChangeView(view.value),
          }))
        : SORT_OPTIONS.map((option) => ({
            label: option.label,
            selected: sort === option.value,
            onSelect: () => {
              setSort(option.value);
              setSortSnapshot(option.value === "name" ? null : snapshot);
            },
          }));

  let emptyTitle = "No markets found";
  if (error) emptyTitle = "Markets unavailable";
  else if (watchlistOnly && !profile) emptyTitle = "Watchlist unavailable";
  else if (watchlistOnly) {
    if (watched.size === 0) emptyTitle = "Your watchlist is empty";
    else
      emptyTitle =
        search || quote !== "ALL"
          ? "No followed pairs match these filters"
          : "Followed pairs unavailable";
  }
  const returnToAllMarkets = watched.size === 0 || (!search && quote === "ALL");

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.content}>
        <View style={styles.controls}>
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">
              {watchlistOnly ? "My watchlist" : "All markets"}
            </Text>
            <Pressable
              onPress={() => changeScope(!watchlistOnly)}
              accessibilityRole="button"
              accessibilityLabel={
                watchlistOnly ? "All markets" : "My watchlist"
              }
              style={({ pressed }) => [
                styles.scopeButton,
                pressed && styles.pressedControl,
              ]}
            >
              <Text style={styles.scopeLabel}>
                {watchlistOnly ? "All markets" : "My watchlist"}
              </Text>
              <SymbolView
                name={{
                  ios: watchlistOnly ? "chevron.right" : "chevron.left",
                  android: watchlistOnly ? "chevron_right" : "chevron_left",
                  web: watchlistOnly ? "chevron_right" : "chevron_left",
                }}
                tintColor={accountColors.primary}
                size={14}
              />
            </Pressable>
          </View>
          <View style={styles.search}>
            <SymbolView
              name={{
                ios: "magnifyingglass",
                android: "search",
                web: "search",
              }}
              tintColor={accountColors.muted}
              size={19}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search assets or pairs"
              placeholderTextColor={accountColors.muted}
              accessibilityLabel={
                watchlistOnly ? "Search watchlist" : "Search markets"
              }
              autoCapitalize="none"
              autoCorrect={false}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
            {search !== "" && (
              <Pressable
                onPress={() => setSearch("")}
                style={styles.clearButton}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
              >
                <SymbolView
                  name={{
                    ios: "xmark.circle.fill",
                    android: "cancel",
                    web: "cancel",
                  }}
                  tintColor={accountColors.muted}
                  size={20}
                />
              </Pressable>
            )}
          </View>
          <View style={styles.toolbar}>
            <Pressable
              onPress={() => setMenu("quote")}
              style={styles.filter}
              accessibilityRole="button"
              accessibilityLabel={`Quote currency: ${quote === "ALL" ? "all pairs" : quote}`}
              accessibilityState={{ expanded: menu === "quote" }}
            >
              <Text style={styles.filterLabel}>
                {quote === "ALL" ? "All pairs" : quote}
              </Text>
              <SymbolView
                name={{
                  ios: "chevron.down",
                  android: "expand_more",
                  web: "expand_more",
                }}
                tintColor={accountColors.text}
                size={15}
              />
            </Pressable>
            <Pressable
              onPress={() => setMenu("sort")}
              disabled={!snapshot}
              style={[styles.filter, !snapshot && styles.disabledControl]}
              accessibilityRole="button"
              accessibilityLabel={`Sort markets: ${SORT_OPTIONS.find((option) => option.value === sort)?.label}`}
              accessibilityState={{
                expanded: menu === "sort",
                disabled: !snapshot,
              }}
            >
              <SymbolView
                name={{
                  ios: "arrow.up.arrow.down",
                  android: "swap_vert",
                  web: "swap_vert",
                }}
                tintColor={accountColors.text}
                size={18}
              />
              <Text style={styles.filterLabel}>
                {sort === "name"
                  ? "A-Z"
                  : sort === "gainers"
                    ? "Gainers"
                    : "Losers"}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setMenu("change")}
              style={styles.filter}
              accessibilityRole="button"
              accessibilityLabel={`Change period: ${CHANGE_VIEWS.find((view) => view.value === changeView)?.label}`}
              accessibilityState={{ expanded: menu === "change" }}
            >
              <Text style={styles.filterLabel}>
                {CHANGE_VIEWS.find((view) => view.value === changeView)?.label}
              </Text>
              <SymbolView
                name={{
                  ios: "chevron.down",
                  android: "expand_more",
                  web: "expand_more",
                }}
                tintColor={accountColors.text}
                size={15}
              />
            </Pressable>
          </View>
        </View>

        <View style={styles.summary}>
          <Text style={styles.caption}>
            {snapshot
              ? `${markets.length.toLocaleString()} ${markets.length === 1 ? "pair" : "pairs"}`
              : "Spot markets"}
          </Text>
          {snapshot && (
            <Text style={styles.caption}>
              {error || stale ? "Last received" : "Received"}{" "}
              {new Date(snapshot.receivedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          )}
          {sort !== "name" && sortSnapshot ? (
            <Text style={[styles.caption, styles.rankingTime]}>
              Ranked{" "}
              {new Date(sortSnapshot.receivedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </Text>
          ) : null}
        </View>

        {profileLoading ||
        saving ||
        paused ||
        retryAt !== null ||
        loading ||
        (stale && snapshot) ||
        changeView !== "24h" ? (
          <View style={styles.status} accessibilityLiveRegion="polite">
            {profileLoading || saving ? (
              <Text style={styles.caption}>
                {saving ? "Saving watchlist…" : "Loading your watchlist…"}
              </Text>
            ) : null}
            {paused || retryAt !== null || loading ? (
              <Text style={styles.caption}>
                {paused
                  ? "Updates paused while the app is in the background."
                  : retryAt !== null
                    ? "Automatic updates are waiting for the market provider."
                    : "Updating market prices…"}
              </Text>
            ) : null}
            {stale && snapshot ? (
              <Text style={styles.staleText}>
                Prices may be outdated. Last received data is shown.
              </Text>
            ) : null}
            {changeView !== "24h" ? (
              <Text style={styles.caption}>
                Last update: compares prices up to 2 min apart. Waiting = no
                recent comparison.
              </Text>
            ) : null}
          </View>
        ) : null}

        {profileError ? (
          <View style={styles.error} accessibilityRole="alert">
            <Text style={styles.errorText}>{profileError}</Text>
            <Pressable
              onPress={() => void reloadProfile()}
              disabled={profileLoading || saving}
              style={styles.retry}
              accessibilityRole="button"
              accessibilityLabel="Retry profile"
              accessibilityState={{ disabled: profileLoading || saving }}
            >
              <Text style={styles.retryLabel}>Retry profile</Text>
            </Pressable>
          </View>
        ) : null}

        {error && (
          <View style={styles.error} accessibilityRole="alert">
            <Text style={styles.errorText}>{error}</Text>
            <Pressable
              onPress={() => void reload()}
              disabled={refreshUnavailable}
              style={[
                styles.retry,
                refreshUnavailable && styles.disabledControl,
              ]}
              accessibilityRole="button"
              accessibilityState={{ disabled: refreshUnavailable }}
            >
              <Text style={styles.retryLabel}>Retry</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.columns}>
          <Text style={[styles.caption, styles.assetColumn]}>Asset</Text>
          <Text style={[styles.caption, styles.priceColumn]}>
            Price /{" "}
            {changeView === "24h"
              ? "24h"
              : changeView === "update"
                ? "Since update"
                : "Change"}
          </Text>
        </View>

        <FlatList
          ref={list}
          style={styles.marketList}
          data={markets}
          extraData={rowState}
          keyExtractor={(asset) => asset.symbol}
          renderItem={({ item }) => (
            <MarketRow
              asset={item}
              changeView={changeView}
              movement={
                stale || paused ? undefined : movements.get(item.symbol)
              }
              watched={watched.has(item.symbol)}
              watchlistDisabled={watchlistDisabled}
              onToggleWatchlist={toggle}
            />
          )}
          getItemLayout={(_data, index) => ({
            length: MARKET_ROW_HEIGHT,
            offset: MARKET_ROW_HEIGHT * index,
            index,
          })}
          initialNumToRender={12}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshing={pullRefreshing && loading && !paused}
          onRefresh={refreshList}
          contentContainerStyle={[
            markets.length === 0 && styles.emptyList,
            { paddingBottom: getTabContentPadding(insets.bottom) },
          ]}
          ListEmptyComponent={
            watchlistOnly &&
            profile &&
            !profileLoading &&
            watched.size === 0 &&
            !search &&
            (quote === "USDT" || quote === "ALL") &&
            snapshot &&
            !error ? (
              <View>
                <MarketSuggestions
                  assets={snapshot.assets}
                  pendingSymbol={pendingSymbol}
                  disabled={watchlistDisabled || stale || paused}
                  onFollow={(symbol) => void toggle(symbol)}
                />
                <Pressable
                  onPress={() => changeScope(false)}
                  accessibilityRole="button"
                  style={styles.retry}
                >
                  <Text style={styles.retryLabel}>All markets</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.empty}>
                {loading || (watchlistOnly && profileLoading) ? (
                  <ActivityIndicator
                    color={accountColors.primary}
                    size="large"
                  />
                ) : (
                  <>
                    <SymbolView
                      name={{
                        ios: "magnifyingglass",
                        android: "search",
                        web: "search",
                      }}
                      tintColor={accountColors.muted}
                      size={30}
                    />
                    <Text style={styles.emptyTitle}>{emptyTitle}</Text>
                    {watchlistOnly && profile && watched.size === 0 ? (
                      <Text style={styles.caption}>
                        Add pairs using the stars in All markets.
                      </Text>
                    ) : null}
                    {search !== "" && (
                      <Pressable
                        onPress={() => setSearch("")}
                        style={styles.retry}
                        accessibilityRole="button"
                      >
                        <Text style={styles.retryLabel}>Clear search</Text>
                      </Pressable>
                    )}
                    {watchlistOnly ? (
                      <Pressable
                        onPress={() => {
                          if (returnToAllMarkets) changeScope(false);
                          else {
                            setSearch("");
                            setQuote("ALL");
                          }
                        }}
                        style={({ pressed }) => [
                          styles.retry,
                          pressed && styles.pressedControl,
                        ]}
                        accessibilityRole="button"
                      >
                        <Text style={styles.retryLabel}>
                          {returnToAllMarkets ? "All markets" : "Clear filters"}
                        </Text>
                      </Pressable>
                    ) : null}
                  </>
                )}
              </View>
            )
          }
        />
      </View>
      <MarketOptionsModal
        title={
          menu === "quote"
            ? "Quote currency"
            : menu === "change"
              ? "Change period"
              : "Sort markets"
        }
        visible={menu !== null}
        options={options}
        onClose={() => setMenu(null)}
      />
    </SafeAreaView>
  );
}

const createStyles = (accountColors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: accountColors.background,
      position: "relative",
    },
    content: { flex: 1, width: "100%", maxWidth: 688, alignSelf: "center" },
    controls: { paddingTop: 8, paddingHorizontal: 20 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 12,
    },
    title: {
      flex: 1,
      fontSize: 24,
      fontWeight: "700",
      color: accountColors.text,
    },
    scopeButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      minHeight: 44,
      paddingHorizontal: 12,
      borderRadius: 14,
      backgroundColor: accountColors.primarySoft,
    },
    scopeLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: accountColors.primary,
    },
    search: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      minHeight: CONTROL_HEIGHT,
      paddingLeft: 14,
      paddingRight: 4,
      backgroundColor: accountColors.surface,
      borderRadius: CORNER_RADIUS.control,
      borderWidth: 1,
      borderColor: accountColors.border,
    },
    searchInput: {
      flex: 1,
      minWidth: 0,
      fontSize: 15,
      paddingVertical: 12,
      color: accountColors.text,
    },
    clearButton: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    toolbar: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      gap: 6,
      paddingTop: 8,
    },
    filter: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      minHeight: 44,
      paddingHorizontal: 10,
      borderWidth: 1,
      borderColor: accountColors.border,
      borderRadius: 14,
    },
    filterLabel: { fontSize: 14, fontWeight: "500", color: accountColors.text },
    summary: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      gap: 6,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 8,
    },
    caption: { fontSize: 12, color: accountColors.muted },
    rankingTime: { width: "100%", textAlign: "right", fontSize: 11 },
    status: { paddingHorizontal: 20, paddingBottom: 12, gap: 5 },
    staleText: { fontSize: 12, color: accountColors.primary, lineHeight: 18 },
    disabledControl: { opacity: 0.45 },
    columns: {
      flexDirection: "row",
      gap: 8,
      paddingHorizontal: 20,
      paddingVertical: 12,
      backgroundColor: accountColors.background,
      borderTopWidth: 0,
      borderBottomWidth: 0,
      borderColor: accountColors.border,
    },
    pressedControl: { opacity: 0.7 },
    assetColumn: { flex: 1, minWidth: 0 },
    priceColumn: { flex: 1, minWidth: 0, textAlign: "right" },
    error: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      gap: 10,
      backgroundColor: accountColors.dangerSoft,
    },
    errorText: {
      flex: 1,
      fontSize: 13,
      color: accountColors.danger,
      paddingVertical: 12,
    },
    retry: { minHeight: 44, justifyContent: "center", paddingHorizontal: 8 },
    retryLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: accountColors.primary,
    },
    marketList: { flex: 1 },
    emptyList: { flexGrow: 1 },
    empty: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 32,
      gap: 14,
    },
    emptyTitle: {
      fontSize: 16,
      color: accountColors.muted,
      textAlign: "center",
    },
  });
