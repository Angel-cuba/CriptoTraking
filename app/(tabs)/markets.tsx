import { useMemo, useState } from "react";
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

const SORT_OPTIONS = [
  { value: "name", label: "Asset A-Z" },
  { value: "gainers", label: "24h change: highest first" },
  { value: "losers", label: "24h change: lowest first" },
] as const;

type Sort = (typeof SORT_OPTIONS)[number]["value"];

export default function MarketsScreen() {
  const { snapshot, loading, error, stale, paused, retryAt, reload } = useMarketCatalog();
  const refreshUnavailable = loading || paused || retryAt !== null;
  const [search, setSearch] = useState("");
  const [quote, setQuote] = useState("USDT");
  const [sort, setSort] = useState<Sort>("name");
  const [menu, setMenu] = useState<"quote" | "sort" | null>(null);

  const quotes = useMemo(
    () =>
      [...new Set(snapshot?.assets.map((asset) => asset.quoteAsset))].sort(),
    [snapshot],
  );

  const markets = useMemo(() => {
    const query = search.toUpperCase().replace(/[\s/_-]/g, "");
    const filtered = (snapshot?.assets ?? []).filter(
      (asset) =>
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
  }, [snapshot, search, quote, sort]);

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
              <ActivityIndicator color="#2375AE" />
            ) : (
              <SymbolView
                name={{
                  ios: "arrow.clockwise",
                  android: "refresh",
                  web: "refresh",
                }}
                tintColor="#2375AE"
                size={22}
              />
            )}
          </Pressable>
        </View>

        <View style={styles.search}>
          <SymbolView
            name={{ ios: "magnifyingglass", android: "search", web: "search" }}
            tintColor="#69717B"
            size={19}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search assets or pairs"
            placeholderTextColor="#69717B"
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
                tintColor="#69717B"
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
              tintColor="#20262D"
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
              tintColor="#20262D"
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
        </View>

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
          <Text style={[styles.caption, styles.priceColumn]}>Price</Text>
          <Text style={[styles.caption, styles.changeColumn]}>24h</Text>
        </View>

        <FlatList
          style={styles.marketList}
          data={markets}
          keyExtractor={(asset) => asset.symbol}
          renderItem={({ item }) => <MarketRow asset={item} />}
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
              {loading ? (
                <ActivityIndicator color="#2375AE" size="large" />
              ) : (
                <>
                  <SymbolView
                    name={{
                      ios: "magnifyingglass",
                      android: "search",
                      web: "search",
                    }}
                    tintColor="#69717B"
                    size={30}
                  />
                  <Text style={styles.emptyTitle}>
                    {error ? "Markets unavailable" : "No markets found"}
                  </Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { flex: 1, width: "100%", maxWidth: 720, alignSelf: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  heading: { flex: 1, gap: 5 },
  brand: { fontSize: 13, color: "#69717B", fontWeight: "500" },
  title: { fontSize: 28, fontWeight: "700", color: "#20262D" },
  iconButton: {
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
    minHeight: 48,
    paddingLeft: 14,
    paddingRight: 4,
    backgroundColor: "#F3F5F7",
    borderRadius: 8,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    paddingVertical: 12,
    color: "#20262D",
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
    borderColor: "#DEE3E8",
    borderRadius: 6,
  },
  filterLabel: { fontSize: 14, fontWeight: "500", color: "#20262D" },
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
    paddingTop: 16,
    paddingBottom: 12,
  },
  caption: { fontSize: 12, color: "#69717B" },
  status: { paddingHorizontal: 20, paddingBottom: 12, gap: 5 },
  staleText: { fontSize: 12, color: "#9A6700", lineHeight: 18 },
  disabledControl: { opacity: 0.45 },
  columns: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#F8F9FA",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E8EB",
  },
  assetColumn: { flex: 1, minWidth: 0 },
  priceColumn: { flex: 1, minWidth: 0, textAlign: "right" },
  changeColumn: { width: 82, textAlign: "right" },
  error: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 10,
    backgroundColor: "#FFF3F3",
  },
  errorText: { flex: 1, fontSize: 13, color: "#A52B3C", paddingVertical: 12 },
  retry: { minHeight: 44, justifyContent: "center", paddingHorizontal: 8 },
  retryLabel: { fontSize: 14, fontWeight: "600", color: "#2375AE" },
  list: { paddingBottom: 12 },
  marketList: { flex: 1 },
  emptyList: { flexGrow: 1 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 14,
  },
  emptyTitle: { fontSize: 16, color: "#69717B", textAlign: "center" },
});
