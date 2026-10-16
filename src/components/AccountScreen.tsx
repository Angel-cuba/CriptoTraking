import { useAppTheme, useThemeStyles } from '@/src/context/ThemeContext';
import { getTabContentPadding, type ThemeColors } from '@/src/lib/theme';
import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';


export function useAccountStyles() {
  return useThemeStyles(createAccountStyles);
}

export function AccountScreen({ children, centered = false, tabbed = false }: PropsWithChildren<{ centered?: boolean; tabbed?: boolean }>) {
  const styles = useThemeStyles(createStyles);
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView style={styles.safeArea} edges={tabbed ? ['top', 'left', 'right'] : undefined}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.scroll, centered && styles.centered, tabbed && { paddingBottom: getTabContentPadding(insets.bottom) }]} keyboardShouldPersistTaps="handled">
          <View style={[styles.content, centered && styles.authContent]}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function AccountHeading({ title, subtitle }: { title: string; subtitle: string }) {
  const styles = useThemeStyles(createStyles);
  return (
    <View style={styles.heading}>
      <View style={styles.brandMark}><Text style={styles.brandLetter}>K</Text></View>
      <Text style={styles.brand}>KRIPTO</Text>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

export function Feedback({ message, success = false }: { message: string | null; success?: boolean }) {
  const styles = useThemeStyles(createStyles);
  const { colors: accountColors } = useAppTheme();
  if (!message) return null;
  return (
    <Text accessibilityRole={success ? 'text' : 'alert'} accessibilityLiveRegion="polite"
      style={[styles.feedback, { color: success ? accountColors.success : accountColors.danger }]}>
      {message}
    </Text>
  );
}

const createAccountStyles = (accountColors: ThemeColors) => StyleSheet.create({
  card: { backgroundColor: accountColors.surface, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: accountColors.border, gap: 18 },
  sectionTitle: { color: accountColors.text, fontSize: 18, fontWeight: '700' },
  body: { color: accountColors.muted, fontSize: 14, lineHeight: 21 },
  link: { color: accountColors.primary, fontSize: 15, fontWeight: '600', minHeight: 44, paddingVertical: 12, textAlign: 'center' },
  footer: { marginTop: 22, alignItems: 'center', gap: 2 },
  gap: { gap: 18 },
});

const createStyles = (accountColors: ThemeColors) => StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: accountColors.background },
  scroll: { flexGrow: 1, padding: 24, paddingBottom: 40 },
  centered: { justifyContent: 'center' },
  content: { width: '100%', maxWidth: 640, alignSelf: 'center' },
  authContent: { maxWidth: 460 },
  heading: { marginBottom: 28 },
  brandMark: { width: 44, height: 44, borderRadius: 14, backgroundColor: accountColors.action, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  brandLetter: { color: accountColors.onPrimary, fontWeight: '800', fontSize: 25 },
  brand: { color: accountColors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 2, marginBottom: 20 },
  title: { color: accountColors.text, fontSize: 30, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: accountColors.muted, fontSize: 16, lineHeight: 24 },
  feedback: { fontSize: 14, lineHeight: 21 },
});
