import { useThemeStyles } from "@/src/context/ThemeContext";
import { CORNER_RADIUS, type ThemeColors } from "@/src/lib/theme";
import type { PropsWithChildren } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { BrandArtwork } from "./Branding";

export function AuthScreen({
  title,
  subtitle,
  compact = false,
  children,
}: PropsWithChildren<{ title: string; subtitle: string; compact?: boolean }>) {
  const styles = useThemeStyles(createStyles);
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const heroHeight = Math.min(
    compact ? 160 : 224,
    Math.max(108, height * (compact ? 0.19 : 0.26)),
  );
  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <View style={[styles.hero, { height: heroHeight }]}>
              <BrandArtwork />
              <Text style={styles.wordmark}>KRIPTO</Text>
            </View>
            <View
              style={[styles.panel, { paddingBottom: Math.max(insets.bottom, 24) }]}
            >
              <View style={styles.heading}>
                <Text style={styles.title} accessibilityRole="header">
                  {title}
                </Text>
                <Text style={styles.subtitle}>{subtitle}</Text>
              </View>
              {children}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    flex: { flex: 1 },
    screen: { flex: 1, backgroundColor: colors.background },
    scroll: { flexGrow: 1 },
    content: { flexGrow: 1, width: "100%", maxWidth: 560, alignSelf: "center" },
    hero: { overflow: "hidden", padding: 24 },
    wordmark: { color: colors.text, fontSize: 19, fontWeight: "800", letterSpacing: 2 },
    panel: {
      flexGrow: 1,
      marginTop: -CORNER_RADIUS.sheet,
      paddingHorizontal: 24,
      paddingTop: 32,
      borderTopLeftRadius: CORNER_RADIUS.sheet,
      borderTopRightRadius: CORNER_RADIUS.sheet,
      backgroundColor: colors.surface,
    },
    heading: { gap: 8, marginBottom: 28 },
    title: {
      color: colors.text,
      fontSize: 30,
      lineHeight: 36,
      fontWeight: "700",
      letterSpacing: -0.7,
    },
    subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  });
