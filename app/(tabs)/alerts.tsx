import {
  AssetDetailModal,
  getDetailAsset,
} from "@/src/components/AssetDetailPresentation";
import type { AssetDetailSelection } from "@/src/types/assetDetail";
import { useAuth } from "@/src/hooks/useAuth";
import { Link } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { Feedback } from "@/src/components/AccountScreen";
import { ActionButton } from "@/src/components/ActionButton";
import { AppSwitch } from "@/src/components/AppSwitch";
import { SettingsRow } from "@/src/components/SettingsRow";
import { PriceAlertRow } from "@/src/components/PriceAlertRow";
import { useAppTheme, useThemeStyles } from "@/src/context/ThemeContext";
import { useMarketCatalog } from "@/src/hooks/useMarketCatalog";
import { usePriceAlerts } from "@/src/hooks/usePriceAlerts";
import { useProfile } from "@/src/hooks/useProfile";
import {
  CORNER_RADIUS,
  getTabContentPadding,
  type ThemeColors,
} from "@/src/lib/theme";
import { DEFAULT_PRICE_ALERT_SETTINGS } from "@/src/services/price/priceAlertService";

const ALERT_PAGE_SIZE = 10;

const FILTERS = [
  { value: "all", label: "All" },
  { value: "up", label: "Up" },
  { value: "down", label: "Down" },
] as const;
type AlertFilter = (typeof FILTERS)[number]["value"];

export default function AlertsScreen() {
  const { user } = useAuth();
  return user ? <AlertsContent key={user.id} /> : null;
}

function AlertsContent() {
  const { colors } = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const insets = useSafeAreaInsets();
  const {
    events,
    loading,
    error,
    enabled,
    pendingEnabled,
    savingPreference,
    setEnabled,
    retry,
    notificationsEnabled,
    pendingNotificationsEnabled,
    notificationBusy,
    notificationSupported,
    permission,
    notificationError,
    setNotificationsEnabled,
  } = usePriceAlerts();
  const market = useMarketCatalog();
  const {
    profile,
    loading: profileLoading,
    saving,
    error: profileError,
    reloadProfile,
  } = useProfile();
  const [selectedDetail, setSelectedDetail] =
    useState<AssetDetailSelection | null>(null);
  const [filter, setFilter] = useState<AlertFilter>("all");
  const [visibleCount, setVisibleCount] = useState(ALERT_PAGE_SIZE);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const assets = useMemo(
    () =>
      new Map(market.snapshot?.assets.map((asset) => [asset.symbol, asset])),
    [market.snapshot],
  );
  const filteredEvents = useMemo(
    () =>
      events
        .filter((event) => filter === "all" || event.direction === filter)
        .sort(
          (a, b) => b.receivedAt - a.receivedAt || b.createdAt - a.createdAt,
        ),
    [events, filter],
  );
  const visibleEvents = filteredEvents.slice(0, visibleCount);
  const nextCount = Math.min(
    ALERT_PAGE_SIZE,
    filteredEvents.length - visibleEvents.length,
  );

  function selectFilter(next: AlertFilter) {
    setFilter(next);
    setVisibleCount(ALERT_PAGE_SIZE);
  }

  let status = "Price data current";
  if (error) status = "Alert storage unavailable";
  else if (loading) status = "Loading alert history";
  else if (savingPreference) status = "Saving alert preference";
  else if (enabled === false || pendingEnabled !== null)
    status = "Price alerts paused";
  else if (!profile)
    status = profileLoading ? "Loading watchlist" : "Watchlist unavailable";
  else if (profile.watchlist.length === 0) status = "No followed pairs";
  else if (market.paused) status = "Updates paused";
  else if (market.retryAt !== null) status = "Waiting for the market provider";
  else if (market.error) status = "Market update failed";
  else if (market.stale) status = "Price data outdated";
  else if (!market.snapshot) status = "Waiting for prices";

  let emptyTitle = "No price alerts yet";
  if (events.length > 0)
    emptyTitle = filter === "up" ? "No upward alerts" : "No downward alerts";
  else if (error) emptyTitle = "Alert history unavailable";
  else if (!profile && !profileLoading) emptyTitle = "Watchlist unavailable";
  else if (profile?.watchlist.length === 0) emptyTitle = "No followed pairs";
  const initialLoading =
    loading || (profileLoading && !profile && events.length === 0);
  const monitoring = enabled === true && pendingEnabled === null;
  const preferenceStatus =
    pendingEnabled !== null
      ? savingPreference
        ? "Saving preference…"
        : pendingEnabled
          ? "Enable not saved"
          : "Paused for this session; pause not saved"
      : enabled === null
        ? loading
          ? "Loading preference…"
          : "Preference unavailable"
        : enabled
          ? "Enabled on this device"
          : "Paused on this device";
  const preferenceDisabled =
    loading || savingPreference || notificationBusy || enabled === null;
  const notifying =
    notificationsEnabled === true && pendingNotificationsEnabled === null;
  const notificationDisabled =
    !notificationSupported ||
    loading ||
    savingPreference ||
    notificationBusy ||
    notificationsEnabled === null;
  let notificationStatus = notificationsEnabled
    ? "On for new price alerts"
    : "Off on this device";
  if (!notificationSupported)
    notificationStatus = "Available in the iOS and Android app";
  else if (notificationBusy) notificationStatus = "Checking permission…";
  else if (pendingNotificationsEnabled !== null)
    notificationStatus = savingPreference
      ? "Saving preference…"
      : pendingNotificationsEnabled
        ? "Enable not saved"
        : "Off for this session; change not saved";
  else if (notificationsEnabled === null)
    notificationStatus = loading
      ? "Loading preference…"
      : "Preference unavailable";
  else if (permission === "denied")
    notificationStatus = "System permission denied";
  else if (notifying && permission === "provisional")
    notificationStatus = "On with quiet delivery";
  else if (
    notifying &&
    (permission === "undetermined" || permission === "unknown")
  )
    notificationStatus = "System permission needs checking";
  else if (notifying && !monitoring)
    notificationStatus = "On; price monitoring is paused";

  const openSystemSettings = () => {
    setSettingsError(null);
    void Linking.openSettings().catch(() =>
      setSettingsError(
        "System settings could not be opened. Please try again.",
      ),
    );
  };

  const failures = [
    {
      key: "alerts",
      message: error,
      retry,
      disabled: loading || savingPreference,
      label: "Retry alert storage",
    },
    {
      key: "notifications",
      message: notificationError,
      retry,
      disabled: loading || savingPreference || notificationBusy,
      label: "Check notification status",
    },
    {
      key: "settings",
      message: settingsError,
      retry: openSystemSettings,
      disabled: false,
      label: "Retry system settings",
    },
    {
      key: "markets",
      message: market.error,
      retry: market.reload,
      disabled: market.loading || market.paused || market.retryAt !== null,
      label: "Retry market update",
    },
    {
      key: "profile",
      message: profileError,
      retry: () => void reloadProfile(),
      disabled: profileLoading || saving,
      label: "Retry watchlist",
      hidden: Boolean(profile),
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">
            Alerts
          </Text>
        </View>
        <FlatList
          style={styles.list}
          data={visibleEvents}
          extraData={colors}
          keyExtractor={(event) => event.id}
          renderItem={({ item }) => (
            <PriceAlertRow
              onOpen={() =>
                setSelectedDetail({
                  asset: getDetailAsset(item.symbol, assets.get(item.symbol)),
                  context: { kind: "alert", event: item },
                })
              }
              event={item}
              asset={assets.get(item.symbol)}
            />
          )}
          initialNumToRender={8}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <View style={styles.preferences}>
                <SettingsRow
                  title="Watchlist alerts"
                  description={preferenceStatus}
                >
                  {savingPreference ? (
                    <ActivityIndicator
                      color={colors.primary}
                      accessibilityLabel="Saving alert preference"
                    />
                  ) : null}
                  <AppSwitch
                    value={monitoring}
                    onValueChange={setEnabled}
                    disabled={preferenceDisabled}
                    accessibilityLabel="Watchlist price alerts"
                    accessibilityHint="Monitor your followed pairs while Kripto is active. Pausing keeps your history."
                  />
                </SettingsRow>
                <Text style={styles.caption}>
                  Threshold ±{DEFAULT_PRICE_ALERT_SETTINGS.thresholdPercent}% ·{" "}
                  {DEFAULT_PRICE_ALERT_SETTINGS.cooldownMs / 60_000} min between
                  alerts per pair
                </Text>
                <View style={styles.divider} />
                <SettingsRow
                  title="Price notifications"
                  description={notificationStatus}
                >
                  {notificationBusy ? (
                    <ActivityIndicator
                      color={colors.primary}
                      accessibilityLabel="Checking notification permission"
                    />
                  ) : null}
                  <AppSwitch
                    value={notifying}
                    onValueChange={(next) => void setNotificationsEnabled(next)}
                    disabled={notificationDisabled}
                    accessibilityLabel="Price alert notifications"
                    accessibilityHint="Allow local notifications for new price alerts on this device."
                  />
                </SettingsRow>
                <Text style={styles.caption}>
                  Checks run while Kripto is active. Pausing keeps your history.
                  {notificationSupported
                    ? " Only new alerts are notified; history is never replayed."
                    : ""}
                </Text>
                {notificationSupported &&
                (permission === "denied" || permission === "provisional") ? (
                  <ActionButton
                    title="System settings"
                    accessibilityLabel="Open notification system settings"
                    secondary
                    onPress={openSystemSettings}
                  />
                ) : null}
              </View>
              <View style={styles.summary}>
                <Text style={styles.status} accessibilityLiveRegion="polite">
                  {status}
                </Text>
                {market.snapshot ? (
                  <Text style={styles.caption}>
                    {market.stale
                      ? "Outdated price update"
                      : "Last price update"}{" "}
                    {new Date(market.snapshot.receivedAt).toLocaleTimeString(
                      [],
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      },
                    )}
                  </Text>
                ) : null}
              </View>
              {failures
                .filter((failure) => failure.message && !failure.hidden)
                .map((failure) => (
                  <View key={failure.key} style={styles.issue}>
                    <Feedback message={failure.message} />
                    <ActionButton
                      title={failure.label}
                      secondary
                      onPress={failure.retry}
                      disabled={failure.disabled}
                    />
                  </View>
                ))}
              <View style={styles.historyHeading}>
                <Text style={styles.status} accessibilityRole="header">
                  Latest alerts
                </Text>
                <Text style={styles.caption}>
                  {visibleEvents.length}
                  {visibleEvents.length < filteredEvents.length
                    ? ` of ${filteredEvents.length}`
                    : ""}{" "}
                  {filter === "all"
                    ? ""
                    : filter === "up"
                      ? "upward "
                      : "downward "}
                  {filteredEvents.length === 1 ? "alert" : "alerts"} on this
                  device
                </Text>
              </View>
              <View
                style={styles.filters}
                accessibilityRole="radiogroup"
                accessibilityLabel="Alert direction"
              >
                {FILTERS.map((option) => (
                  <Pressable
                    key={option.value}
                    onPress={() => selectFilter(option.value)}
                    accessibilityRole="radio"
                    accessibilityLabel={`${option.label} alerts`}
                    accessibilityState={{ checked: filter === option.value }}
                    aria-checked={filter === option.value}
                    style={[
                      styles.filter,
                      filter === option.value && styles.selectedFilter,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterLabel,
                        filter === option.value && styles.selectedFilterLabel,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              {initialLoading ? (
                <ActivityIndicator
                  color={colors.primary}
                  size="large"
                  accessibilityLabel="Loading alerts"
                />
              ) : (
                <>
                  <View style={styles.emptyIcon}>
                    <SymbolView
                      name={{
                        ios: "bell",
                        android: "notifications_none",
                        web: "notifications_none",
                      }}
                      tintColor={colors.accent}
                      size={28}
                    />
                  </View>
                  <Text style={styles.emptyTitle}>{emptyTitle}</Text>
                  {events.length > 0 && filter !== "all" ? (
                    <ActionButton
                      title="Show all alerts"
                      secondary
                      onPress={() => selectFilter("all")}
                    />
                  ) : profile?.watchlist.length === 0 ? (
                    <Link href="/markets" style={styles.marketLink}>
                      Browse markets
                    </Link>
                  ) : !error && profile ? (
                    <Text style={styles.emptyDescription}>
                      {monitoring
                        ? "New movements from your watchlist appear here while Kripto is active."
                        : "Enable watchlist alerts to monitor new price movements."}
                    </Text>
                  ) : null}
                </>
              )}
            </View>
          }
          ListFooterComponent={
            nextCount > 0 ? (
              <View style={styles.footer}>
                <ActionButton
                  title={`Show ${nextCount} more`}
                  accessibilityLabel={`Show ${nextCount} more alerts`}
                  secondary
                  onPress={() =>
                    setVisibleCount((count) =>
                      Math.min(count + ALERT_PAGE_SIZE, filteredEvents.length),
                    )
                  }
                />
              </View>
            ) : null
          }
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: getTabContentPadding(insets.bottom) },
          ]}
        />
      </View>
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
    content: { flex: 1, width: "100%", maxWidth: 688, alignSelf: "center" },
    header: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 14 },
    title: {
      fontSize: 26,
      lineHeight: 34,
      fontWeight: "700",
      color: colors.text,
    },
    caption: { fontSize: 12, lineHeight: 18, color: colors.muted },
    filters: {
      flexDirection: "row",
      borderRadius: 18,
      padding: 4,
      gap: 4,
      backgroundColor: colors.surface,
    },
    filter: {
      flex: 1,
      minWidth: 0,
      minHeight: 44,
      paddingHorizontal: 4,
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 14,
    },
    selectedFilter: { backgroundColor: colors.primarySoft },
    filterLabel: { fontSize: 14, color: colors.muted, fontWeight: "600" },
    selectedFilterLabel: { color: colors.primary },
    list: { flex: 1 },
    listContent: { flexGrow: 1 },
    footer: { paddingHorizontal: 20, paddingTop: 6 },
    listHeader: { paddingHorizontal: 20, paddingBottom: 16, gap: 12 },
    preferences: {
      padding: 14,
      gap: 4,
      borderRadius: CORNER_RADIUS.card,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginTop: 10,
    },
    summary: { gap: 4 },
    historyHeading: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 6,
    },
    issue: { gap: 8 },
    status: { fontSize: 15, fontWeight: "600", color: colors.text },
    empty: {
      flexGrow: 1,
      minHeight: 160,
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
      gap: 12,
    },
    emptyIcon: {
      width: 48,
      height: 48,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.elevated,
      borderRadius: 22,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      textAlign: "center",
    },
    emptyDescription: {
      fontSize: 14,
      lineHeight: 21,
      color: colors.muted,
      textAlign: "center",
      maxWidth: 320,
    },
    marketLink: {
      minHeight: 44,
      paddingVertical: 12,
      color: colors.primary,
      fontSize: 14,
      fontWeight: "600",
    },
  });
