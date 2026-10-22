import type { MarketChangeView } from "@/src/components/MarketRow";
import type { MarketAsset, MarketSnapshot } from "@/src/types/market";
import { useCallback, useMemo, useRef, useState } from "react";
import type { FlatList } from "react-native";

const SORT_OPTIONS = [
  { value: "name", label: "Asset A-Z", shortLabel: "A-Z" },
  { value: "gainers", label: "24h change: highest first", shortLabel: "Gainers" },
  { value: "losers", label: "24h change: lowest first", shortLabel: "Losers" },
] as const;

type SortOption = (typeof SORT_OPTIONS)[number];

const CHANGE_VIEWS: { value: MarketChangeView; label: string }[] = [
  { value: "24h", label: "24h" },
  { value: "update", label: "Last update" },
  { value: "both", label: "Both" },
];

export function useMarketList({
  snapshot,
  watched,
  watchlistOnly,
}: {
  snapshot: MarketSnapshot | null;
  watched: ReadonlySet<string>;
  watchlistOnly: boolean;
}) {
  const list = useRef<FlatList<MarketAsset>>(null);
  const scrollOffset = useRef(0);
  const positionFilters = useRef("");
  const positionRowHeight = useRef<number | null>(null);
  const [search, setSearch] = useState("");
  const [quote, setQuote] = useState(watchlistOnly ? "ALL" : "USDT");
  const [sortOption, updateSort] = useState<SortOption>(SORT_OPTIONS[0]);
  const sort = sortOption.value;
  const [sortSnapshot, setSortSnapshot] = useState<MarketSnapshot | null>(null);
  const [changeView, setChangeView] = useState<MarketChangeView>("24h");
  const [menu, setMenu] = useState<"quote" | "sort" | "change" | null>(null);

  const rememberPosition = useCallback((offset: number) => {
    scrollOffset.current = Math.max(0, offset);
  }, []);
  const filterKey = JSON.stringify([
    search,
    quote,
    sort,
    sortSnapshot?.receivedAt,
  ]);
  const restorePosition = useCallback(
    (rowHeight?: number) => {
      if (positionFilters.current !== filterKey) {
        scrollOffset.current = 0;
        positionFilters.current = filterKey;
      } else if (rowHeight !== undefined && positionRowHeight.current !== null) {
        // Keep the same pair visible when the period or text size changes row height.
        scrollOffset.current *= rowHeight / positionRowHeight.current;
      }
      if (rowHeight !== undefined) positionRowHeight.current = rowHeight;
      list.current?.scrollToOffset({
        offset: scrollOffset.current,
        animated: false,
      });
    },
    [filterKey],
  );
  const resetPosition = useCallback(() => {
    scrollOffset.current = 0;
    list.current?.scrollToOffset({ offset: 0, animated: false });
  }, []);
  const setSort = useCallback(
    (option: SortOption) => {
      updateSort(option);
      setSortSnapshot(option.value === "name" ? null : snapshot);
    },
    [snapshot],
  );
  const resetFilters = useCallback(() => {
    resetPosition();
    setSearch("");
    setQuote("ALL");
    setMenu(null);
  }, [resetPosition]);

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
      ? ["ALL", ...quotes].map((currency) => ({
          label: currency === "ALL" ? "All pairs" : currency,
          selected: quote === currency,
          onSelect: () => setQuote(currency),
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
            onSelect: () => setSort(option),
          }));

  return {
    watchlistOnly,
    list,
    rememberPosition,
    restorePosition,
    search,
    setSearch,
    quote,
    sorting: {
      label: sortOption.shortLabel,
      description: sortOption.label,
      rankedAt: sortSnapshot?.receivedAt ?? null,
    },
    changeView,
    menu,
    setMenu,
    markets,
    options,
    resetFilters,
    changeLabel: CHANGE_VIEWS.find((view) => view.value === changeView)?.label,
    menuTitle:
      menu === "quote"
        ? "Quote currency"
        : menu === "change"
          ? "Change period"
          : "Sort markets",
  };
}

export type MarketListModel = ReturnType<typeof useMarketList>;
