import { useAppTheme, useThemeStyles } from '@/src/context/ThemeContext';
import type { ThemeColors } from '@/src/lib/theme';
import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AccountScreen, useAccountStyles, Feedback } from '@/src/components/AccountScreen';
import { ActionButton } from '@/src/components/ActionButton';
import { SignalCard } from '@/src/components/SignalCard';
import { useSignalNotifications } from '@/src/context/SignalNotificationContext';
import { useAuth } from '@/src/hooks/useAuth';
import { useProfile } from '@/src/hooks/useProfile';
import { useSignals } from '@/src/hooks/useSignals';

export default function SignalsScreen() {
  const { user } = useAuth();
  return user ? <SignalsContent key={user.id} userId={user.id} /> : null;
}

function SignalsContent({ userId }: { userId: string }) {
  const { colors: accountColors } = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const accountStyles = useAccountStyles();
  const { signals, loading, error, cacheError, updatedAt, fromCache, refresh } = useSignals(userId);
  const { profile, loading: profileLoading, error: profileError, reloadProfile } = useProfile();
  const { processSignals, ready: notificationsReady, error: notificationError } = useSignalNotifications();
  const focused = useRef(false);
  const isFocused = useCallback(() => focused.current, []);
  const [filter, setFilter] = useState<'all' | 'watchlist'>('all');

  useFocusEffect(useCallback(() => {
    focused.current = true;
    return () => { focused.current = false; };
  }, []));

  useEffect(() => {
    if (!notificationsReady || fromCache || loading || updatedAt === null || profileLoading || profileError || !profile) return;
    let current = true;
    void processSignals(signals, profile.watchlist, () => current && isFocused());
    return () => { current = false; };
  }, [notificationsReady, fromCache, loading, updatedAt, profileLoading, profileError, profile, signals, processSignals, isFocused]);

  const watchlist = profile?.watchlist ?? [];
  const visible = filter === 'all' ? signals : signals.filter((signal) => watchlist.includes(signal.symbol));
  const waitingForWatchlist = filter === 'watchlist' && profileLoading;
  const missingWatchlist = filter === 'watchlist' && !profile;

  return (
    <AccountScreen tabbed>
      <View style={accountStyles.gap}>
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>MARKET OVERVIEW</Text>
          <Text accessibilityRole="header" style={styles.title}>Market signals</Text>
          <Text style={accountStyles.body}>SMA5 / SMA10 crossovers from closed hourly candles.</Text>
        </View>
        <ActionButton title="Refresh signals" loading={loading} onPress={() => { refresh(); void reloadProfile(); }} />
        <View accessibilityRole="tablist" style={styles.filters}>
          {(['all', 'watchlist'] as const).map((value) => (
            <Pressable key={value} accessibilityRole="tab" accessibilityLabel={value === 'all' ? 'All signals' : 'My watchlist'}
              aria-selected={filter === value} accessibilityState={{ selected: filter === value }} onPress={() => setFilter(value)}
              style={[styles.filter, filter === value && styles.selectedFilter]}>
              <Text style={[styles.filterText, filter === value && styles.selectedText]}>{value === 'all' ? 'All signals' : 'My watchlist'}</Text>
            </Pressable>
          ))}
        </View>
        {updatedAt !== null ? (
          <View style={accountStyles.card}>
            <Text style={accountStyles.sectionTitle}>{fromCache ? 'Saved signals' : 'Market snapshot'}</Text>
            <Text style={accountStyles.body}>Fetched {new Date(updatedAt).toLocaleString()}</Text>
            {fromCache ? <Text style={accountStyles.body}>{loading ? 'Showing saved results while checking for updates.' : 'Showing saved results. Refresh when connected.'}</Text> : null}
          </View>
        ) : null}
        {notificationError ? <Feedback message={notificationError} /> : null}
        {cacheError ? <Feedback message={cacheError} /> : null}
        {error ? (
          <View style={accountStyles.card}><Feedback message={error} /><ActionButton title="Retry signals" secondary disabled={loading} onPress={refresh} /></View>
        ) : null}
        {filter === 'watchlist' && profileError && !profileLoading ? (
          <View style={accountStyles.card}>
            <Feedback message={profile ? 'Your watchlist could not be refreshed. Showing your last loaded preferences.' : profileError} />
            <ActionButton title="Retry watchlist" secondary onPress={() => void reloadProfile()} />
          </View>
        ) : null}
        {(loading && signals.length === 0) || waitingForWatchlist ? (
          <View style={accountStyles.card}><ActivityIndicator color={accountColors.primary} /><Text style={accountStyles.body}>{waitingForWatchlist ? 'Loading your watchlist…' : 'Loading market signals…'}</Text></View>
        ) : !missingWatchlist ? (
          <>
            {filter === 'watchlist' && visible.length === 0 && !loading && !error ? (
              <View style={accountStyles.card}>
                <Text style={accountStyles.sectionTitle}>{watchlist.length === 0 ? 'Your watchlist is empty' : 'No tracked signals'}</Text>
                <Text style={accountStyles.body}>{watchlist.length === 0 ? 'Choose the pairs you want to follow in Markets.' : 'Signals currently cover BTCUSDT, ETHUSDT and SOLUSDT. Your other saved pairs remain available in Markets.'}</Text>
                <Link href="/markets" style={accountStyles.link}>Manage watchlist</Link>
              </View>
            ) : null}
            {visible.map((signal) => <SignalCard key={signal.symbol} signal={signal} />)}
          </>
        ) : null}
        <Text style={styles.source}>Binance spot · 1h · BTC / ETH / SOL</Text>
      </View>
    </AccountScreen>
  );
}

const createStyles = (accountColors: ThemeColors) => StyleSheet.create({
  heading: { gap: 8, paddingTop: 10 },
  eyebrow: { color: accountColors.primary, fontSize: 12, letterSpacing: 1.8, fontWeight: '700' },
  title: { color: accountColors.text, fontSize: 30, fontWeight: '700' },
  filters: { flexDirection: 'row', gap: 10 },
  filter: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', padding: 12, borderWidth: 1, borderColor: accountColors.border, borderRadius: 16, backgroundColor: accountColors.surface },
  selectedFilter: { borderColor: accountColors.primary, backgroundColor: accountColors.primarySoft },
  filterText: { color: accountColors.muted, fontSize: 14, fontWeight: '600' },
  selectedText: { color: accountColors.primary },
  source: { color: accountColors.muted, fontSize: 12, textAlign: 'center', lineHeight: 18 },
});
