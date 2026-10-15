import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { User } from '@supabase/supabase-js';

import { AccountScreen, accountColors, accountStyles, Feedback } from '@/src/components/AccountScreen';
import { ActionButton } from '@/src/components/ActionButton';
import { FormField } from '@/src/components/FormField';
import { NotificationSettings } from '@/src/components/NotificationSettings';
import { useAuth } from '@/src/hooks/useAuth';
import { useProfile } from '@/src/hooks/useProfile';
import { supabaseClient } from '@/src/lib/supabase';
import { RISK_PROFILES, SUPPORTED_ASSETS, type Profile, type ProfileUpdate } from '@/src/types/profile';

const riskDescriptions = {
  conservative: 'A more cautious approach to market movement.',
  balanced: 'A balance between opportunity and risk.',
  aggressive: 'Comfortable with greater market volatility.',
};

export default function ProfileScreen() {
  const { user } = useAuth();
  return user ? <ProfileContent key={user.id} user={user} /> : null;
}

function ProfileContent({ user }: { user: User }) {
  const { profile, loading, saving, error, reloadProfile, saveProfile } = useProfile(user.id);
  const [signingOut, setSigningOut] = useState(false);
  const logoutPending = useRef(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const initial = (profile?.display_name || user.email || 'K').charAt(0).toUpperCase();

  async function signOut() {
    if (logoutPending.current || saving) return;
    logoutPending.current = true;
    setSigningOut(true);
    setLogoutError(null);
    try {
      const { error: signOutError } = await supabaseClient.auth.signOut({ scope: 'local' });
      if (signOutError) throw signOutError;
    } catch {
      setLogoutError('Unable to sign out. Check your connection and try again.');
    } finally {
      logoutPending.current = false;
      setSigningOut(false);
    }
  }

  return (
    <AccountScreen>
      <View style={accountStyles.gap}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>YOUR ACCOUNT</Text>
          <Text accessibilityRole="header" style={styles.title}>My profile</Text>
          <Text style={accountStyles.body}>Your details, your preferences.</Text>
        </View>
        <View style={styles.identity}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{initial}</Text></View>
          <View style={styles.identityText}>
            <Text style={styles.name}>{profile?.display_name || 'Your Kripto account'}</Text>
            <Text style={accountStyles.body} selectable>{user.email}</Text>
            <Text style={styles.status}>{user.email_confirmed_at ? 'Email verified' : 'Signed in'}</Text>
          </View>
        </View>
        {loading ? (
          <View style={accountStyles.card}><ActivityIndicator color={accountColors.primary} /><Text style={accountStyles.body}>Loading your preferences…</Text></View>
        ) : profile ? (
          <ProfileEditor profile={profile} saving={saving} disabled={signingOut} error={error} saveProfile={saveProfile} />
        ) : (
          <View style={accountStyles.card}><Feedback message={error || 'Your profile is unavailable.'} /><ActionButton title="Retry loading profile" onPress={() => void reloadProfile()} disabled={signingOut} /></View>
        )}
        <NotificationSettings disabled={signingOut} />
        <View style={accountStyles.card}>
          <Text style={accountStyles.sectionTitle}>Session</Text>
          <Text style={accountStyles.body}>You will stay signed in on this device until you sign out.</Text>
          <Feedback message={logoutError} />
          <ActionButton title="Sign out" secondary danger loading={signingOut} disabled={saving} onPress={() => void signOut()} />
        </View>
      </View>
    </AccountScreen>
  );
}

function ProfileEditor({ profile, saving, disabled, error, saveProfile }: {
  profile: Profile; saving: boolean; disabled: boolean; error: string | null;
  saveProfile: (changes: ProfileUpdate) => Promise<boolean>;
}) {
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [message, setMessage] = useState<string | null>(null);
  const unavailable = saving || disabled;

  async function save(changes: ProfileUpdate, successMessage: string) {
    setMessage(null);
    if (await saveProfile(changes)) setMessage(successMessage);
  }

  const name = displayName.trim();
  return (
    <View style={accountStyles.gap}>
      <View style={accountStyles.card}>
        <Text style={accountStyles.sectionTitle}>Personal details</Text>
        <FormField label="Display name" placeholder="How should we call you?" value={displayName} maxLength={60}
          autoCapitalize="words" editable={!unavailable} onChangeText={(value) => { setDisplayName(value); setMessage(null); }} />
        <ActionButton title="Save display name" loading={saving} disabled={disabled || !name || name === profile.display_name}
          onPress={() => void save({ display_name: name }, 'Display name saved.')} />
        <Feedback message={error} />
        <Feedback message={message} success />
      </View>
      <View style={accountStyles.card}>
        <Text style={accountStyles.sectionTitle}>Risk profile</Text>
        <Text style={accountStyles.body}>Choose the approach that best describes you.</Text>
        {RISK_PROFILES.map((risk) => (
          <Pressable key={risk} accessibilityRole="radio" accessibilityLabel={risk}
            accessibilityState={{ checked: profile.risk_profile === risk, disabled: unavailable }} disabled={unavailable}
            style={[styles.option, profile.risk_profile === risk && styles.selected]}
            onPress={() => { if (risk !== profile.risk_profile) void save({ risk_profile: risk }, 'Risk profile saved.'); }}>
            <View style={styles.optionText}><Text style={styles.optionTitle}>{risk.charAt(0).toUpperCase() + risk.slice(1)}</Text><Text style={accountStyles.body}>{riskDescriptions[risk]}</Text></View>
            <Text style={styles.indicator}>{profile.risk_profile === risk ? '●' : '○'}</Text>
          </Pressable>
        ))}
      </View>
      <View style={accountStyles.card}>
        <Text style={accountStyles.sectionTitle}>My watchlist</Text>
        <Text style={accountStyles.body}>Save the assets you want to follow.</Text>
        {SUPPORTED_ASSETS.map((asset) => {
          const selected = profile.watchlist.includes(asset);
          return (
            <Pressable key={asset} accessibilityRole="checkbox" accessibilityLabel={asset}
              accessibilityState={{ checked: selected, disabled: unavailable }} disabled={unavailable}
              style={[styles.option, selected && styles.selected]} onPress={() => void save({
                watchlist: selected ? profile.watchlist.filter((item) => item !== asset) : [...profile.watchlist, asset],
              }, 'Watchlist saved.')}>
              <Text style={styles.optionTitle}>{asset}</Text><Text style={styles.indicator}>{selected ? '✓' : '+'}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: 8, paddingTop: 10 },
  eyebrow: { color: accountColors.primary, fontSize: 12, letterSpacing: 1.8, fontWeight: '700' },
  title: { color: accountColors.text, fontSize: 30, fontWeight: '700' },
  identity: { flexDirection: 'row', gap: 16, alignItems: 'center', paddingVertical: 8 },
  identityText: { flex: 1, gap: 4 },
  avatar: { width: 64, height: 64, borderRadius: 22, backgroundColor: '#e3edff', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 28, fontWeight: '700', color: accountColors.primary },
  name: { color: accountColors.text, fontSize: 19, fontWeight: '700' },
  status: { color: accountColors.success, fontSize: 12, fontWeight: '600', marginTop: 3 },
  option: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 14, borderWidth: 1, borderColor: accountColors.border, borderRadius: 12 },
  selected: { borderColor: accountColors.primary, backgroundColor: '#f0f5ff' },
  optionText: { flex: 1, gap: 4 },
  optionTitle: { color: accountColors.text, fontSize: 15, fontWeight: '600' },
  indicator: { color: accountColors.primary, fontSize: 21 },
});
