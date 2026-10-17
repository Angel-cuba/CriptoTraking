import { AppearanceSettings } from "@/src/components/AppearanceSettings";
import { useAppTheme, useThemeStyles } from "@/src/context/ThemeContext";
import type { ThemeColors } from "@/src/lib/theme";
import type { User } from "@supabase/supabase-js";
import { Link } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  AccountScreen,
  Feedback,
  useAccountStyles,
} from "@/src/components/AccountScreen";
import { ActionButton } from "@/src/components/ActionButton";
import { FormField } from "@/src/components/FormField";
import { NotificationSettings } from "@/src/components/NotificationSettings";
import { WatchlistActivity } from "@/src/components/WatchlistActivity";
import { useAuth } from "@/src/hooks/useAuth";
import { useProfile } from "@/src/hooks/useProfile";
import { supabaseClient } from "@/src/lib/supabase";
import type { Profile, ProfileUpdate } from "@/src/types/profile";

export default function ProfileScreen() {
  const { user } = useAuth();
  return user ? <ProfileContent key={user.id} user={user} /> : null;
}

function ProfileContent({ user }: { user: User }) {
  const { colors: accountColors } = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const accountStyles = useAccountStyles();
  const { profile, loading, saving, error, reloadProfile, saveProfile } =
    useProfile();
  const followedCount = new Set(profile?.watchlist ?? []).size;
  const [signingOut, setSigningOut] = useState(false);
  const logoutPending = useRef(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const initial = (profile?.display_name || user.email || "K")
    .charAt(0)
    .toUpperCase();

  async function signOut() {
    if (logoutPending.current) return;
    logoutPending.current = true;
    setSigningOut(true);
    setLogoutError(null);
    try {
      const { error: signOutError } = await supabaseClient.auth.signOut({
        scope: "local",
      });
      if (signOutError) throw signOutError;
    } catch {
      setLogoutError(
        "Unable to sign out. Check your connection and try again.",
      );
    } finally {
      logoutPending.current = false;
      setSigningOut(false);
    }
  }

  return (
    <AccountScreen tabbed>
      <View style={accountStyles.gap}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>YOUR ACCOUNT</Text>
          <Text accessibilityRole="header" style={styles.title}>
            My profile
          </Text>
          <Text style={accountStyles.body}>
            Your details, your preferences.
          </Text>
        </View>
        <View style={[accountStyles.card, styles.identity]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.identityText}>
            <Text style={styles.name} numberOfLines={2}>
              {profile?.display_name || "Your Kripto account"}
            </Text>
            <Text style={accountStyles.body} selectable numberOfLines={2}>
              {user.email}
            </Text>
            <Text style={styles.status}>
              {user.email_confirmed_at ? "Email verified" : "Signed in"}
            </Text>
          </View>
        </View>
        {profile ? (
          <>
            {loading ? (
              <View style={accountStyles.card}>
                <ActivityIndicator
                  color={accountColors.primary}
                  accessibilityLabel="Refreshing profile"
                />
                <Text style={accountStyles.body}>
                  Updating your preferences. Your last loaded details are shown
                  below.
                </Text>
              </View>
            ) : null}
            <NameEditor
              profile={profile}
              saving={saving}
              disabled={loading || signingOut}
              error={error}
              saveProfile={saveProfile}
            />
          </>
        ) : loading ? (
          <View style={accountStyles.card}>
            <ActivityIndicator
              color={accountColors.primary}
              accessibilityLabel="Loading profile"
            />
            <Text style={accountStyles.body}>Loading your preferences…</Text>
          </View>
        ) : (
          <View style={accountStyles.card}>
            <Feedback message={error || "Your profile is unavailable."} />
            <ActionButton
              title="Retry loading profile"
              onPress={() => void reloadProfile()}
              disabled={signingOut}
            />
          </View>
        )}
        <WatchlistActivity />
        <View style={[accountStyles.card, styles.watchlistSummary]}>
          <View style={styles.detailText}>
            <Text style={accountStyles.sectionTitle}>Watchlist</Text>
            <Text style={accountStyles.body}>
              {profile
                ? `${followedCount} followed ${followedCount === 1 ? "pair" : "pairs"}`
                : loading
                  ? "Loading watchlist…"
                  : "Watchlist unavailable."}
            </Text>
          </View>
          <Link
            href={{ pathname: "/markets", params: { scope: "watchlist" } }}
            style={accountStyles.link}
            disabled={signingOut}
          >
            Manage watchlist
          </Link>
        </View>
        <AppearanceSettings />
        <NotificationSettings disabled={signingOut} />
        <View style={accountStyles.card}>
          <Text style={accountStyles.sectionTitle}>Session</Text>
          <Text style={accountStyles.body}>
            You will stay signed in on this device until you sign out.
          </Text>
          <Feedback message={logoutError} />
          <ActionButton
            title="Sign out"
            secondary
            danger
            loading={signingOut}
            onPress={() => void signOut()}
          />
        </View>
      </View>
    </AccountScreen>
  );
}

function NameEditor({
  profile,
  saving,
  disabled,
  error,
  saveProfile,
}: {
  profile: Profile;
  saving: boolean;
  disabled: boolean;
  error: string | null;
  saveProfile: (changes: ProfileUpdate) => Promise<boolean>;
}) {
  const { colors } = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const accountStyles = useAccountStyles();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [submitting, setSubmitting] = useState(false);
  const [editFocused, setEditFocused] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const savePending = useRef(false);
  const unavailable = saving || disabled || submitting;
  const name = displayName.trim();
  const canSave =
    editing &&
    !unavailable &&
    Boolean(name) &&
    name !== profile.display_name.trim();

  function beginEdit() {
    if (unavailable || savePending.current) return;
    setDisplayName(profile.display_name);
    setMessage(null);
    setEditError(null);
    setEditFocused(false);
    setEditing(true);
  }

  function cancelEdit() {
    if (unavailable || savePending.current) return;
    setDisplayName(profile.display_name);
    setEditError(null);
    setMessage(null);
    setEditing(false);
  }

  async function saveName() {
    if (!canSave || savePending.current) return;
    savePending.current = true;
    setSubmitting(true);
    setMessage(null);
    setEditError(null);
    try {
      if (await saveProfile({ display_name: name })) {
        setEditing(false);
        setMessage("Display name saved.");
      }
    } catch {
      setEditError("Unable to save your display name. Please try again.");
    } finally {
      savePending.current = false;
      setSubmitting(false);
    }
  }

  return (
    <View style={accountStyles.card}>
      <Text style={accountStyles.sectionTitle}>Personal details</Text>
      {editing ? (
        <>
          <FormField
            label="Display name"
            placeholder="How should we call you?"
            value={displayName}
            maxLength={60}
            autoCapitalize="words"
            autoCorrect={false}
            editable={!unavailable}
            returnKeyType="done"
            onSubmitEditing={() => void saveName()}
            onChangeText={(value) => {
              setDisplayName(value);
              setEditError(null);
              setMessage(null);
            }}
          />
          <View style={styles.editorActions}>
            <View style={styles.cancelAction}>
              <ActionButton
                title="Cancel"
                secondary
                disabled={unavailable}
                onPress={cancelEdit}
              />
            </View>
            <View style={styles.saveAction}>
              <ActionButton
                title="Save display name"
                loading={saving || submitting}
                disabled={!canSave}
                onPress={() => void saveName()}
              />
            </View>
          </View>
        </>
      ) : (
        <View style={styles.detailRow}>
          <View style={styles.detailText}>
            <Text style={accountStyles.body}>Display name</Text>
            <Text style={styles.detailValue}>
              {profile.display_name.trim() || "Not set"}
            </Text>
          </View>
          <Pressable
            onPress={beginEdit}
            onFocus={() => setEditFocused(true)}
            onBlur={() => setEditFocused(false)}
            disabled={unavailable}
            accessibilityRole="button"
            accessibilityLabel="Edit display name"
            accessibilityState={{ disabled: unavailable }}
            style={({ pressed }) => [
              styles.editButton,
              unavailable && styles.disabledControl,
              pressed && !unavailable && styles.pressedControl,
              editFocused && !unavailable && styles.focusedControl,
            ]}
          >
            <SymbolView
              name={{ ios: "pencil", android: "edit", web: "edit" }}
              tintColor={colors.primary}
              size={20}
            />
          </Pressable>
        </View>
      )}
      <Feedback message={editError || error} />
      <Feedback message={message} success />
    </View>
  );
}

const createStyles = (accountColors: ThemeColors) =>
  StyleSheet.create({
    header: { gap: 8, paddingTop: 10 },
    eyebrow: {
      color: accountColors.primary,
      fontSize: 12,
      letterSpacing: 1.8,
      fontWeight: "700",
    },
    title: { color: accountColors.text, fontSize: 30, fontWeight: "700" },
    identity: {
      flexDirection: "row",
      gap: 16,
      alignItems: "center",
      paddingVertical: 22,
      borderColor: accountColors.border,
    },
    identityText: { flex: 1, minWidth: 0, gap: 5 },
    avatar: {
      width: 64,
      height: 64,
      borderRadius: 22,
      backgroundColor: accountColors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      fontSize: 28,
      fontWeight: "700",
      color: accountColors.primary,
    },
    name: { color: accountColors.text, fontSize: 19, fontWeight: "700" },
    status: {
      color: accountColors.success,
      fontSize: 12,
      fontWeight: "600",
      marginTop: 3,
    },
    detailRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    detailText: { flex: 1, minWidth: 0, gap: 6 },
    detailValue: { color: accountColors.text, fontSize: 15, lineHeight: 22 },
    editButton: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: accountColors.border,
      borderRadius: 14,
      backgroundColor: accountColors.primarySoft,
    },
    disabledControl: { opacity: 0.45 },
    pressedControl: { opacity: 0.7 },
    focusedControl: {
      outlineStyle: "solid",
      outlineWidth: 2,
      outlineColor: accountColors.accent,
      outlineOffset: 3,
    },
    editorActions: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    cancelAction: { flex: 1, minWidth: 96 },
    saveAction: { flex: 2, minWidth: 168 },
    watchlistSummary: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      columnGap: 12,
      rowGap: 6,
    },
  });
