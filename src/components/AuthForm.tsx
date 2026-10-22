import { Link } from "expo-router";
import { useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useThemeStyles } from "@/src/context/ThemeContext";
import type { ThemeColors } from "@/src/lib/theme";

import { supabaseClient } from "@/src/lib/supabase";
import { Feedback } from "./AccountScreen";
import { ActionButton } from "./ActionButton";
import { AuthScreen } from "./AuthScreen";
import { FormField } from "./FormField";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const styles = useThemeStyles(createStyles);
  const registering = mode === "register";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function change(setter: (value: string) => void, value: string) {
    setter(value);
    setError(null);
    setMessage(null);
  }

  async function submit() {
    if (submitting.current) return;
    const normalizedEmail = email.trim().toLowerCase();
    setError(null);
    setMessage(null);
    if (!normalizedEmail || !password || (registering && !confirmation)) {
      setError("Please fill in all fields.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (registering && password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }
    if (registering && password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }

    submitting.current = true;
    setLoading(true);
    try {
      const credentials = { email: normalizedEmail, password };
      const { data, error: authError } = registering
        ? await supabaseClient.auth.signUp(credentials)
        : await supabaseClient.auth.signInWithPassword(credentials);
      if (authError) {
        setError(authError.message);
      } else if (registering && !data.session) {
        setMessage(
          "If your registration was accepted, check your email to confirm your account, then sign in.",
        );
        setPassword("");
        setConfirmation("");
      }
    } catch {
      setError(
        "Unable to connect. Please check your connection and try again.",
      );
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  return (
    <AuthScreen
      title={registering ? "Create your account" : "Welcome back"}
      subtitle={
        registering
          ? "Your watchlist starts here."
          : "Pick up where you left off."
      }
      compact={registering}
    >
      <View style={styles.form}>
        <FormField
          label="Email"
          placeholder="you@example.com"
          value={email}
          onChangeText={(value) => change(setEmail, value)}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          editable={!loading}
        />
        <View style={styles.password}>
          <FormField
            label="Password"
            password
            value={password}
            onChangeText={(value) => change(setPassword, value)}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete={registering ? "new-password" : "current-password"}
            editable={!loading}
            returnKeyType={registering ? "next" : "go"}
            onSubmitEditing={registering ? undefined : () => void submit()}
          />
          {registering ? (
            <Text style={styles.hint}>Use at least 8 characters.</Text>
          ) : null}
        </View>
        {registering ? (
          <FormField
            label="Confirm password"
            password
            value={confirmation}
            onChangeText={(value) => change(setConfirmation, value)}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            editable={!loading}
            returnKeyType="go"
            onSubmitEditing={() => void submit()}
          />
        ) : null}
        <Feedback message={error} />
        <Feedback message={message} success />
        <ActionButton
          title={registering ? "Create account" : "Sign in"}
          loading={loading}
          onPress={() => void submit()}
        />
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {registering ? "Already have an account?" : "New to Kripto?"}
        </Text>
        <Link
          href={registering ? "/login" : "/register"}
          replace
          disabled={loading}
          style={styles.link}
        >
          {registering ? "Sign in" : "Create an account"}
        </Link>
      </View>
    </AuthScreen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    form: { gap: 20 },
    password: { gap: 6 },
    hint: { color: colors.muted, fontSize: 12, lineHeight: 18 },
    footer: {
      marginTop: 18,
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "center",
      columnGap: 6,
    },
    footerText: { color: colors.muted, fontSize: 13, lineHeight: 20 },
    link: {
      color: colors.primary,
      fontWeight: "600",
      fontSize: 13,
      lineHeight: 20,
      paddingVertical: 12,
      minHeight: 44,
      textDecorationLine: "underline",
    },
  });
