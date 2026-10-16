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

import { AppSwitch } from "@/src/components/AppSwitch";
import { PriceAlertRow } from "@/src/components/PriceAlertRow";
import { useAppTheme, useThemeStyles } from "@/src/context/ThemeContext";
import { useMarketCatalog } from "@/src/hooks/useMarketCatalog";
import { usePriceAlerts } from "@/src/hooks/usePriceAlerts";
import { useProfile } from "@/src/hooks/useProfile";
import { getTabContentPadding, type ThemeColors } from "@/src/lib/theme";
import { DEFAULT_PRICE_ALERT_SETTINGS } from "@/src/services/priceAlertService";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "up", label: "Up" },
  { value: "down", label: "Down" },
] as const;

export default function AlertsScreen() {
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
  const [filter, setFilter] =
    useState<(typeof FILTERS)[number]["value"]>("all");
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const assets = useMemo(
    () =>
      new Map(market.snapshot?.assets.map((asset) => [asset.symbol, asset])),
    [market.snapshot],
  );
  const visibleEvents = useMemo(
    () =>
      events
        .filter((event) => filter === "all" || event.direction === filter)
        .sort(
          (a, b) => b.receivedAt - a.receivedAt || b.createdAt - a.createdAt,
        ),
    [events, filter],
  );

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
          <Text style={styles.brand}>KRIPTO</Text>
          <Text style={styles.title} accessibilityRole="header">
            Alerts
          </Text>
          <Text style={styles.subtitle}>Your price movement history.</Text>
        </View>
        <View
          style={styles.filters}
          accessibilityRole="radiogroup"
          accessibilityLabel="Alert direction"
        >
          {FILTERS.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => setFilter(option.value)}
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
        <FlatList
          style={styles.list}
          data={visibleEvents}
          extraData={colors}
          keyExtractor={(event) => event.id}
          renderItem={({ item }) => (
            <PriceAlertRow event={item} asset={assets.get(item.symbol)} />
          )}
          initialNumToRender={8}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <View style={styles.monitoringCard}>
                <View style={styles.monitoringHeader}>
                  <View style={styles.monitoringCopy}>
                    <Text style={styles.status}>Watchlist alerts</Text>
                    <Text
                      style={styles.caption}
                      accessibilityLiveRegion="polite"
                    >
                      {preferenceStatus}
                    </Text>
                  </View>
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
                </View>
                <View style={styles.rules}>
                  <Text style={styles.rule}>
                    Threshold ±{DEFAULT_PRICE_ALERT_SETTINGS.thresholdPercent}%
                  </Text>
                  <Text style={styles.rule}>
                    {DEFAULT_PRICE_ALERT_SETTINGS.cooldownMs / 60_000} min
                    between alerts per pair
                  </Text>
                </View>
                <Text style={styles.caption}>
                  Checks run while Kripto is active. Pausing keeps your history.
                </Text>
              </View>
              <View style={styles.monitoringCard}>
                <View style={styles.monitoringHeader}>
                  <View style={styles.monitoringCopy}>
                    <Text style={styles.status}>Price notifications</Text>
                    <Text
                      style={styles.caption}
                      accessibilityLiveRegion="polite"
                    >
                      {notificationStatus}
                    </Text>
                  </View>
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
                </View>
                {notificationSupported ? (
                  <Text style={styles.caption}>
                    Only new alerts are notified while Kripto is active. Your
                    history is never replayed.
                  </Text>
                ) : null}
                {notificationSupported &&
                (permission === "denied" || permission === "provisional") ? (
                  <Pressable
                    onPress={openSystemSettings}
                    style={styles.settings}
                    accessibilityRole="button"
                    accessibilityLabel="Open notification system settings"
                  >
                    <SymbolView
                      name={{
                        ios: "gearshape",
                        android: "settings",
                        web: "settings",
                      }}
                      tintColor={colors.primary}
                      size={17}
                    />
                    <Text style={styles.retryLabel}>System settings</Text>
                  </Pressable>
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
                <Text style={styles.caption}>
                  {visibleEvents.length}
                  {filter !== "all" ? ` of ${events.length}` : ""}{" "}
                  {events.length === 1 ? "alert" : "alerts"} on this device
                </Text>
              </View>
              {failures
                .filter((failure) => failure.message && !failure.hidden)
                .map((failure) => (
                  <View
                    key={failure.key}
                    style={styles.error}
                    accessibilityRole="alert"
                  >
                    <Text style={styles.errorText}>{failure.message}</Text>
                    <Pressable
                      onPress={failure.retry}
                      disabled={failure.disabled}
                      accessibilityRole="button"
                      accessibilityLabel={failure.label}
                      accessibilityState={{ disabled: failure.disabled }}
                      style={styles.retry}
                    >
                      <SymbolView
                        name={{
                          ios: "arrow.clockwise",
                          android: "refresh",
                          web: "refresh",
                        }}
                        tintColor={
                          failure.disabled ? colors.muted : colors.primary
                        }
                        size={17}
                      />
                      <Text
                        style={[
                          styles.retryLabel,
                          failure.disabled && styles.disabledLabel,
                        ]}
                      >
                        {failure.key === "notifications"
                          ? "Check status"
                          : "Retry"}
                      </Text>
                    </Pressable>
                  </View>
                ))}
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
                    <Pressable
                      onPress={() => setFilter("all")}
                      style={styles.retry}
                      accessibilityRole="button"
                      accessibilityLabel="Show all alerts"
                    >
                      <Text style={styles.retryLabel}>Show all alerts</Text>
                    </Pressable>
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
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: getTabContentPadding(insets.bottom) },
          ]}
        />
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { flex: 1, width: "100%", maxWidth: 688, alignSelf: "center" },
    header: {
      paddingHorizontal: 20,
      paddingTop: 28,
      paddingBottom: 20,
      gap: 7,
    },
    brand: {
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 1.8,
      color: colors.primary,
    },
    title: { fontSize: 30, fontWeight: "700", color: colors.text },
    subtitle: { fontSize: 14, lineHeight: 21, color: colors.muted },
    caption: { fontSize: 12, lineHeight: 18, color: colors.muted },
    filters: {
      flexDirection: "row",
      marginHorizontal: 20,
      marginBottom: 18,
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
    listHeader: { paddingHorizontal: 20, paddingBottom: 16, gap: 12 },
    monitoringCard: {
      padding: 18,
      gap: 12,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    monitoringHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
    monitoringCopy: { flex: 1, gap: 5 },
    settings: {
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      alignSelf: "flex-start",
    },
    rules: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    rule: {
      fontSize: 12,
      lineHeight: 18,
      color: colors.primary,
      backgroundColor: colors.primarySoft,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    summary: {
      padding: 18,
      gap: 6,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    status: { fontSize: 15, fontWeight: "600", color: colors.text },
    error: {
      padding: 16,
      borderRadius: 16,
      backgroundColor: colors.dangerSoft,
      gap: 4,
    },
    errorText: { fontSize: 13, lineHeight: 19, color: colors.danger },
    retry: {
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      alignSelf: "center",
      paddingHorizontal: 8,
    },
    retryLabel: { fontSize: 14, fontWeight: "600", color: colors.primary },
    disabledLabel: { color: colors.muted },
    empty: {
      flexGrow: 1,
      minHeight: 240,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      gap: 12,
    },
    emptyIcon: {
      width: 64,
      height: 64,
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
