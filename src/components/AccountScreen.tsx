import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const accountColors = {
  background: '#f4f7fb', surface: '#ffffff', text: '#16243a', muted: '#5b6b82',
  primary: '#2563eb', border: '#d7e0ed', danger: '#b42318', success: '#167347',
};

export function AccountScreen({ children, centered = false }: PropsWithChildren<{ centered?: boolean }>) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.scroll, centered && styles.centered]} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function AccountHeading({ title, subtitle }: { title: string; subtitle: string }) {
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
  if (!message) return null;
  return (
    <Text accessibilityRole={success ? 'text' : 'alert'} accessibilityLiveRegion="polite"
      style={[styles.feedback, { color: success ? accountColors.success : accountColors.danger }]}>
      {message}
    </Text>
  );
}

export const accountStyles = StyleSheet.create({
  card: { backgroundColor: accountColors.surface, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: accountColors.border, gap: 18 },
  sectionTitle: { color: accountColors.text, fontSize: 19, fontWeight: '700' },
  body: { color: accountColors.muted, fontSize: 14, lineHeight: 21 },
  link: { color: accountColors.primary, fontSize: 15, fontWeight: '600', paddingVertical: 12, textAlign: 'center' },
  footer: { marginTop: 22, alignItems: 'center', gap: 2 },
  gap: { gap: 20 },
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: accountColors.background },
  scroll: { flexGrow: 1, padding: 24, paddingBottom: 40 },
  centered: { justifyContent: 'center' },
  content: { width: '100%', maxWidth: 460, alignSelf: 'center' },
  heading: { marginBottom: 28 },
  brandMark: { width: 44, height: 44, borderRadius: 14, backgroundColor: accountColors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  brandLetter: { color: '#fff', fontWeight: '800', fontSize: 25 },
  brand: { color: accountColors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 2, marginBottom: 20 },
  title: { color: accountColors.text, fontSize: 30, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: accountColors.muted, fontSize: 16, lineHeight: 24 },
  feedback: { fontSize: 14, lineHeight: 21 },
});
