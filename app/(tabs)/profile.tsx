import type { User } from "@supabase/supabase-js";
import { useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import {
  AccountScreen,
  Feedback,
  useAccountStyles,
} from "@/src/components/AccountScreen";
import { ActionButton } from "@/src/components/ActionButton";
import { AppearanceSettings } from "@/src/components/AppearanceSettings";
import { FormField } from "@/src/components/FormField";
import { NotificationSettings } from "@/src/components/NotificationSettings";
import { WatchlistActivity } from "@/src/components/WatchlistActivity";
import { useAppTheme, useThemeStyles } from "@/src/context/ThemeContext";
import { useAuth } from "@/src/hooks/useAuth";
import { useProfile } from "@/src/hooks/useProfile";
import { supabaseClient } from "@/src/lib/supabase";
import { CORNER_RADIUS, type ThemeColors } from "@/src/lib/theme";

export default function ProfileScreen() {
  const { user } = useAuth();
  return user ? <ProfileContent key={user.id} user={user} /> : null;
}

function ProfileContent({ user }: { user: User }) {
  const styles = useThemeStyles(createStyles);
  const [signingOut, setSigningOut] = useState(false);
  const logoutPending = useRef(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  async function signOut() {
    if (logoutPending.current) return;
    logoutPending.current = true;
    setSigningOut(true);
    setLogoutError(null);
    try {
      const { error } = await supabaseClient.auth.signOut({ scope: "local" });
      if (error) throw error;
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
      <View style={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
          Profile
        </Text>
        <ProfileIdentity user={user} disabled={signingOut} />
        <WatchlistActivity disabled={signingOut} />
        <View style={styles.group}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <AppearanceSettings disabled={signingOut} />
          <View style={styles.divider} />
          <NotificationSettings disabled={signingOut} />
        </View>
        <View style={styles.session}>
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

function ProfileIdentity({
  user,
  disabled,
}: {
  user: User;
  disabled: boolean;
}) {
  const { colors } = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const accountStyles = useAccountStyles();
  const { profile, loading, saving, error, reloadProfile, saveProfile } =
    useProfile();
  const [draft, setDraft] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  // Guard actions before the provider's saving state reaches the next render.
  const savePending = useRef(false);
  const unavailable = disabled || loading || saving;
  const name = draft?.trim() ?? "";
  const canSave = Boolean(
    profile &&
    draft !== null &&
    name &&
    name !== profile.display_name.trim() &&
    !unavailable,
  );
  const initial = (profile?.display_name || user.email || "K")
    .charAt(0)
    .toUpperCase();

  function beginEdit() {
    if (!profile || unavailable || savePending.current) return;
    setDraft(profile.display_name);
    setMessage(null);
  }

  function cancelEdit() {
    if (unavailable || savePending.current) return;
    setDraft(null);
    setMessage(null);
  }

  async function saveName() {
    if (!canSave || savePending.current) return;
    savePending.current = true;
    setMessage(null);
    try {
      if (await saveProfile({ display_name: name })) {
        setDraft(null);
        setMessage("Display name saved.");
      }
    } finally {
      savePending.current = false;
    }
  }

  return (
    <View style={styles.group}>
      <View style={styles.identity}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.identityText}>
          <Text style={styles.name}>
            {profile?.display_name || "Your Kripto account"}
          </Text>
          <Text style={accountStyles.body} selectable>
            {user.email}
          </Text>
          <Text style={styles.verified}>
            {user.email_confirmed_at ? "Email verified" : "Signed in"}
          </Text>
        </View>
        {profile && draft === null ? (
          <ActionButton
            title="Edit"
            accessibilityLabel="Edit display name"
            secondary
            disabled={unavailable}
            onPress={beginEdit}
          />
        ) : null}
      </View>
      {draft !== null ? (
        <View style={styles.editor}>
          <FormField
            autoFocus
            label="Display name"
            placeholder="How should we call you?"
            value={draft}
            maxLength={60}
            autoCapitalize="words"
            autoCorrect={false}
            editable={!unavailable}
            returnKeyType="done"
            onSubmitEditing={() => void saveName()}
            onChangeText={setDraft}
          />
          <View style={styles.editorActions}>
            <View style={styles.editorAction}>
              <ActionButton
                title="Cancel"
                secondary
                disabled={unavailable}
                onPress={cancelEdit}
              />
            </View>
            <View style={styles.editorAction}>
              <ActionButton
                title="Save name"
                loading={saving}
                disabled={!canSave}
                onPress={() => void saveName()}
              />
            </View>
          </View>
        </View>
      ) : null}
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator
            color={colors.primary}
            accessibilityLabel={
              profile ? "Refreshing profile" : "Loading profile"
            }
          />
          <Text style={accountStyles.body}>
            {profile ? "Refreshing your details…" : "Loading your details…"}
          </Text>
        </View>
      ) : null}
      <Feedback
        message={
          error ||
          (!profile && !loading ? "Your profile is unavailable." : null)
        }
      />
      {!profile && !loading ? (
        <ActionButton
          title="Retry loading profile"
          secondary
          disabled={disabled}
          onPress={() => void reloadProfile()}
        />
      ) : null}
      <Feedback message={message} success />
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    content: { gap: 14 },
    title: {
      color: colors.text,
      fontSize: 26,
      lineHeight: 34,
      fontWeight: "700",
    },
    group: {
      padding: 16,
      gap: 4,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: CORNER_RADIUS.card,
      backgroundColor: colors.surface,
    },
    sectionTitle: {
      color: colors.muted,
      fontSize: 12,
      lineHeight: 18,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
    },
    identity: { flexDirection: "row", alignItems: "center", gap: 10 },
    identityText: { flex: 1, minWidth: 0, gap: 3 },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 16,
      backgroundColor: colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: { color: colors.primary, fontSize: 22, fontWeight: "700" },
    name: {
      color: colors.text,
      fontSize: 18,
      lineHeight: 24,
      fontWeight: "700",
    },
    verified: { color: colors.success, fontSize: 12, lineHeight: 18 },
    editor: { gap: 12, marginTop: 12 },
    editorActions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    editorAction: { flex: 1, minWidth: 120 },
    loading: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingTop: 8,
    },
    session: { gap: 8 },
  });
