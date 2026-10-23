import { useAppTheme, useThemeStyles } from "@/src/context/ThemeContext";
import type { useMarketCatalog } from "@/src/hooks/useMarketCatalog";
import type { MarketListModel } from "@/src/hooks/useMarketList";
import type { useProfile } from "@/src/hooks/useProfile";
import {
  CONTROL_HEIGHT,
  CORNER_RADIUS,
  getTabContentPadding,
  type ThemeColors,
} from "@/src/lib/theme";
import { SymbolView } from "expo-symbols";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MarketOptionsModal, MarketOptionsSheet } from "./MarketOptionsModal";
import { getMarketRowHeight, MarketRow } from "./MarketRow";
import { MarketSuggestions } from "./MarketSuggestions";

export type MarketListData = {
  catalog: ReturnType<typeof useMarketCatalog>;
  account: ReturnType<typeof useProfile>;
  watched: ReadonlySet<string>;
  pendingSymbol: string | null;
  watchlistDisabled: boolean;
  toggle: (symbol: string) => Promise<void>;
};

type MarketListProps = {
  data: MarketListData;
  model: MarketListModel;
  onOpenCatalog?: () => void;
  onCloseCatalog?: () => void;
};

export function MarketList(props: MarketListProps) {
  const { fontScale } = useWindowDimensions();
  // Remeasure native text after a system text-size change; the model retains filters and scroll.
  return <MarketListContent key={fontScale} {...props} fontScale={fontScale} />;
}

function MarketListContent({
  data,
  model,
  onOpenCatalog,
  onCloseCatalog,
  fontScale,
}: MarketListProps & { fontScale: number }) {
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
  } = data.catalog;
  const {
    profile,
    loading: profileLoading,
    saving,
    error: profileError,
    reloadProfile,
  } = data.account;
  const { watched, pendingSymbol, watchlistDisabled, toggle } = data;
  const {
    list,
    search,
    setSearch,
    quote,
    sorting,
    changeView,
    menu,
    setMenu,
    markets,
    options,
    watchlistOnly,
    restorePosition,
  } = model;
  const rowHeight = getMarketRowHeight(!watchlistOnly, changeView, fontScale);
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const restoringPosition = useRef(true);
  const rowState = useMemo(
    () => ({
      changeView,
      rowHeight,
      movements: stale || paused ? null : movements,
      watched,
      watchlistDisabled,
    }),
    [
      changeView,
      rowHeight,
      movements,
      stale,
      paused,
      watched,
      watchlistDisabled,
    ],
  );
  const refreshUnavailable = loading || paused || retryAt !== null;
  useLayoutEffect(
    () => restorePosition(rowHeight),
    [restorePosition, rowHeight],
  );

  function openMenu(value: NonNullable<typeof menu>) {
    Keyboard.dismiss();
    setMenu(value);
  }

  async function refreshList() {
    if (refreshUnavailable) return;
    setPullRefreshing(true);
    try {
      await reload();
    } finally {
      setPullRefreshing(false);
    }
  }

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
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.marketList}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        accessibilityElementsHidden={menu !== null}
        importantForAccessibility={
          menu !== null ? "no-hide-descendants" : "auto"
        }
        aria-hidden={menu !== null}
      >
        <View style={styles.content}>
          <View style={styles.controls}>
            <View style={styles.header}>
              <Text style={styles.title} accessibilityRole="header">
                {watchlistOnly ? "My watchlist" : "All markets"}
              </Text>
              <Pressable
                onPress={() => {
                  Keyboard.dismiss();
                  if (watchlistOnly) onOpenCatalog?.();
                  else onCloseCatalog?.();
                }}
                accessibilityRole="button"
                accessibilityLabel={
                  watchlistOnly ? "All markets" : "Close all markets"
                }
                style={({ pressed }) => [
                  styles.scopeButton,
                  !watchlistOnly && styles.closeButton,
                  pressed && styles.pressedControl,
                ]}
              >
                {watchlistOnly ? (
                  <Text style={styles.scopeLabel}>All markets</Text>
                ) : null}
                <SymbolView
                  name={{
                    ios: watchlistOnly ? "chevron.right" : "xmark",
                    android: watchlistOnly ? "chevron_right" : "close",
                    web: watchlistOnly ? "chevron_right" : "close",
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
                onPress={() => openMenu("quote")}
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
                onPress={() => openMenu("sort")}
                disabled={!snapshot}
                style={[styles.filter, !snapshot && styles.disabledControl]}
                accessibilityRole="button"
                accessibilityLabel={`Sort markets: ${sorting.description}`}
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
                <Text style={styles.filterLabel}>{sorting.label}</Text>
              </Pressable>
              <Pressable
                onPress={() => openMenu("change")}
                style={styles.filter}
                accessibilityRole="button"
                accessibilityLabel={`Change period: ${model.changeLabel}`}
                accessibilityState={{ expanded: menu === "change" }}
              >
                <Text style={styles.filterLabel}>{model.changeLabel}</Text>
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
            {sorting.rankedAt !== null ? (
              <Text style={[styles.caption, styles.rankingTime]}>
                Ranked{" "}
                {new Date(sorting.rankedAt).toLocaleTimeString([], {
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
                compact={!watchlistOnly}
                movement={
                  stale || paused ? undefined : movements.get(item.symbol)
                }
                watched={watched.has(item.symbol)}
                watchlistDisabled={watchlistDisabled}
                onToggleWatchlist={toggle}
              />
            )}
            getItemLayout={(_data, index) => ({
              length: rowHeight,
              offset: rowHeight * index,
              index,
            })}
            initialNumToRender={12}
            onContentSizeChange={() => {
              if (!restoringPosition.current) return;
              model.restorePosition(rowHeight);
              restoringPosition.current = false;
            }}
            onScroll={(event) => {
              if (!restoringPosition.current)
                model.rememberPosition(event.nativeEvent.contentOffset.y);
            }}
            scrollEventThrottle={16}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            refreshing={pullRefreshing && loading && !paused}
            onRefresh={refreshList}
            contentContainerStyle={[
              markets.length === 0 && styles.emptyList,
              {
                paddingBottom: watchlistOnly
                  ? getTabContentPadding(insets.bottom)
                  : 16,
              },
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
                    onPress={onOpenCatalog}
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
                            if (returnToAllMarkets) onOpenCatalog?.();
                            else {
                              model.resetFilters();
                            }
                          }}
                          style={({ pressed }) => [
                            styles.retry,
                            pressed && styles.pressedControl,
                          ]}
                          accessibilityRole="button"
                        >
                          <Text style={styles.retryLabel}>
                            {returnToAllMarkets
                              ? "All markets"
                              : "Clear filters"}
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
      </KeyboardAvoidingView>
      {watchlistOnly ? (
        <MarketOptionsModal
          title={model.menuTitle}
          visible={menu !== null}
          options={options}
          onClose={() => setMenu(null)}
        />
      ) : menu !== null ? (
        <MarketOptionsSheet
          title={model.menuTitle}
          options={options}
          onClose={() => setMenu(null)}
        />
      ) : null}
    </View>
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
    closeButton: { width: 44, paddingHorizontal: 0 },
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
