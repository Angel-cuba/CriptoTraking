import { useAppTheme, useThemeStyles } from '@/src/context/ThemeContext';
import type { ThemeColors } from '@/src/lib/theme';
import { useCallback, useMemo, useState } from "react";
import { SymbolView } from "expo-symbols";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MarketOptionsModal } from "@/src/components/MarketOptionsModal";
import { MarketRow, MARKET_ROW_HEIGHT } from "@/src/components/MarketRow";
import { useMarketCatalog } from "@/src/hooks/useMarketCatalog";
import { useProfile } from "@/src/hooks/useProfile";

const SORT_OPTIONS = [
  { value: "name", label: "Asset A-Z" },
  { value: "gainers", label: "24h change: highest first" },
  { value: "losers", label: "24h change: lowest first" },
] as const;

type Sort = (typeof SORT_OPTIONS)[number]["value"];

export default function MarketsScreen() {
  const { colors: accountColors } = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { snapshot, movements, loading, error, stale, paused, retryAt, reload } = useMarketCatalog();
  const { profile, loading: profileLoading, saving, error: profileError, reloadProfile, toggleWatchlist } = useProfile();
  const watchlistDisabled = profileLoading || saving || !profile;
  const watched = useMemo(() => new Set(profile?.watchlist ?? []), [profile?.watchlist]);
  const toggle = useCallback((symbol: string) => { void toggleWatchlist(symbol); }, [toggleWatchlist]);
  const rowState = useMemo(() => ({ movements: stale || paused ? null : movements, watched, watchlistDisabled }),
    [movements, stale, paused, watched, watchlistDisabled]);
  const refreshUnavailable = loading || paused || retryAt !== null;
  const [search, setSearch] = useState("");
  const [quote, setQuote] = useState("USDT");
  const [sort, setSort] = useState<Sort>("name");
  const [menu, setMenu] = useState<"quote" | "sort" | null>(null);
  const [watchlistOnly, setWatchlistOnly] = useState(false);

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

    return filtered.sort((a, b) => {
      const alphabetical = a.symbol.localeCompare(b.symbol);
      if (sort === "name") return alphabetical;
      if (!a.ticker && !b.ticker) return alphabetical;
      if (!a.ticker) return 1;
      if (!b.ticker) return -1;
      const difference = b.ticker.changePercent24h - a.ticker.changePercent24h;
      return (sort === "gainers" ? difference : -difference) || alphabetical;
    });
  }, [snapshot, search, quote, sort, watchlistOnly, watched]);

  const options =
    menu === "quote"
      ? ["ALL", ...quotes].map((value) => ({
          label: value === "ALL" ? "All pairs" : value,
          selected: quote === value,
          onSelect: () => setQuote(value),
        }))
      : SORT_OPTIONS.map((option) => ({
          label: option.label,
          selected: sort === option.value,
          onSelect: () => setSort(option.value),
        }));

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.heading}>
            <Text style={styles.brand}>KRIPTO</Text>
            <Text style={styles.title} accessibilityRole="header">
              Markets
            </Text>
          </View>
          <Pressable
            onPress={() => void reload()}
            disabled={refreshUnavailable}
            style={[styles.iconButton, refreshUnavailable && styles.disabledControl]}
            accessibilityRole="button"
            accessibilityLabel="Refresh markets"
            accessibilityState={{ disabled: refreshUnavailable, busy: loading }}
          >
            {loading ? (
              <ActivityIndicator color={accountColors.primary} />
            ) : (
              <SymbolView
                name={{
                  ios: "arrow.clockwise",
                  android: "refresh",
                  web: "refresh",
                }}
                tintColor={accountColors.primary}
                size={22}
              />
            )}
          </Pressable>
        </View>

        <View style={styles.search}>
          <SymbolView
            name={{ ios: "magnifyingglass", android: "search", web: "search" }}
            tintColor={accountColors.muted}
            size={19}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search assets or pairs"
            placeholderTextColor={accountColors.muted}
            accessibilityLabel="Search markets"
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
            style={styles.sortButton}
            accessibilityRole="button"
            accessibilityLabel={`Sort markets: ${SORT_OPTIONS.find((option) => option.value === sort)?.label}`}
            accessibilityState={{ expanded: menu === "sort" }}
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
                  ? "Top gainers"
                  : "Top losers"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.watchlistFilters} accessibilityRole="tablist">
          {([false, true] as const).map((onlyWatched) => (
            <Pressable
              key={String(onlyWatched)}
              style={[styles.watchlistFilter, watchlistOnly === onlyWatched && styles.selectedFilter]}
              accessibilityRole="tab"
              accessibilityLabel={onlyWatched ? "My watchlist" : "All markets"}
              accessibilityState={{ selected: watchlistOnly === onlyWatched }}
              aria-selected={watchlistOnly === onlyWatched}
              onPress={() => setWatchlistOnly(onlyWatched)}
            >
              <Text style={[styles.filterLabel, watchlistOnly === onlyWatched && styles.selectedFilterLabel]}>
                {onlyWatched ? "My watchlist" : "All markets"}
              </Text>
            </Pressable>
          ))}
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
        </View>

        <View style={styles.status} accessibilityLiveRegion="polite">
          {profileLoading || saving ? <Text style={styles.caption}>{saving ? "Saving watchlist…" : "Loading your watchlist…"}</Text> : null}
          <Text style={styles.caption}>
            {paused
              ? "Updates paused while the app is in the background."
              : retryAt !== null
                ? "Automatic updates are waiting for the market provider."
                : loading
                  ? "Updating market prices…"
                  : "Updates every 60 seconds while the app is active."}
          </Text>
          {stale && snapshot ? (
            <Text style={styles.staleText}>Prices may be outdated. Last received data is shown.</Text>
          ) : null}
          <Text style={styles.caption}>Price arrows compare updates up to 2 minutes apart. A dash means no recent comparison.</Text>
        </View>

        {profileError ? (
          <View style={styles.error} accessibilityRole="alert">
            <Text style={styles.errorText}>{profileError}</Text>
            <Pressable onPress={() => void reloadProfile()} disabled={profileLoading || saving}
              style={styles.retry} accessibilityRole="button" accessibilityLabel="Retry profile"
              accessibilityState={{ disabled: profileLoading || saving }}>
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
              style={[styles.retry, refreshUnavailable && styles.disabledControl]}
              accessibilityRole="button"
              accessibilityState={{ disabled: refreshUnavailable }}
            >
              <Text style={styles.retryLabel}>Retry</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.columns}>
          <Text style={[styles.caption, styles.assetColumn]}>Asset</Text>
          <Text style={[styles.caption, styles.priceColumn]}>Price / 24h</Text>
        </View>

        <FlatList
          style={styles.marketList}
          data={markets}
          extraData={rowState}
          keyExtractor={(asset) => asset.symbol}
          renderItem={({ item }) => <MarketRow asset={item} movement={stale || paused ? undefined : movements.get(item.symbol)}
            watched={watched.has(item.symbol)} watchlistDisabled={watchlistDisabled} onToggleWatchlist={toggle} />}
          getItemLayout={(_data, index) => ({
            length: MARKET_ROW_HEIGHT,
            offset: MARKET_ROW_HEIGHT * index,
            index,
          })}
          initialNumToRender={12}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshing={loading && snapshot !== null}
          onRefresh={() => void reload()}
          contentContainerStyle={
            markets.length === 0 ? styles.emptyList : styles.list
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              {loading || (watchlistOnly && profileLoading) ? (
                <ActivityIndicator color={accountColors.primary} size="large" />
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
                  <Text style={styles.emptyTitle}>
                    {error ? "Markets unavailable" : watchlistOnly && !profile ? "Watchlist unavailable" : watchlistOnly && watched.size === 0 ? "Your watchlist is empty" : "No markets found"}
                  </Text>
                  {watchlistOnly && profile && watched.size === 0 ? <Text style={styles.caption}>Add pairs using the stars in All markets.</Text> : null}
                  {search !== "" && (
                    <Pressable
                      onPress={() => setSearch("")}
                      style={styles.retry}
                      accessibilityRole="button"
                    >
                      <Text style={styles.retryLabel}>Clear search</Text>
                    </Pressable>
                  )}
                </>
              )}
            </View>
          }
        />
      </View>
      <MarketOptionsModal
        title={menu === "quote" ? "Quote currency" : "Sort markets"}
        visible={menu !== null}
        options={options}
        onClose={() => setMenu(null)}
      />
    </SafeAreaView>
  );
}

const createStyles = (accountColors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: accountColors.background },
  content: { flex: 1, width: "100%", maxWidth: 688, alignSelf: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 20,
  },
  heading: { flex: 1, gap: 5 },
  brand: { fontSize: 12, color: accountColors.primary, fontWeight: "700", letterSpacing: 1.8 },
  title: { fontSize: 30, fontWeight: "700", color: accountColors.text },
  iconButton: {
    backgroundColor: accountColors.surface, borderRadius: 14,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 20,
    minHeight: 52,
    paddingLeft: 14,
    paddingRight: 4,
    backgroundColor: accountColors.surface,
    borderRadius: 16,
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
    gap: 12,
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  filter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 44,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: accountColors.border,
    borderRadius: 14,
  },
  filterLabel: { fontSize: 14, fontWeight: "500", color: accountColors.text },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 4,
  },
  summary: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 6,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 12,
  },
  caption: { fontSize: 12, color: accountColors.muted },
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
  watchlistFilters: { flexDirection: "row", gap: 8, paddingHorizontal: 20, paddingTop: 12 },
  watchlistFilter: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: accountColors.border, borderRadius: 14 },
  selectedFilter: { borderColor: accountColors.primary, backgroundColor: accountColors.primarySoft },
  selectedFilterLabel: { color: accountColors.primary },
  assetColumn: { flex: 1, minWidth: 0 },
  priceColumn: { flex: 1, minWidth: 0, textAlign: "right" },
    error: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 10,
    backgroundColor: accountColors.dangerSoft,
  },
  errorText: { flex: 1, fontSize: 13, color: accountColors.danger, paddingVertical: 12 },
  retry: { minHeight: 44, justifyContent: "center", paddingHorizontal: 8 },
  retryLabel: { fontSize: 14, fontWeight: "600", color: accountColors.primary },
  list: { paddingBottom: 152 },
  marketList: { flex: 1 },
  emptyList: { flexGrow: 1, paddingBottom: 152 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 14,
  },
  emptyTitle: { fontSize: 16, color: accountColors.muted, textAlign: "center" },
});
