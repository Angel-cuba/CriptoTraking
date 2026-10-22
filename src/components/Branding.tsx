import { useAppTheme, useThemeStyles } from "@/src/context/ThemeContext";
import type { ThemeColors } from "@/src/lib/theme";
import { Image, StyleSheet, Text, View } from "react-native";

export function BrandMark({ size = 96 }: { size?: number }) {
  return (
    <Image
      source={require("@/assets/images/splash-icon.png")}
      accessible={false}
      aria-hidden
      resizeMode="contain"
      style={{ width: size, height: size }}
    />
  );
}

export function BrandArtwork({ subtle = false }: { subtle?: boolean }) {
  const { mode } = useAppTheme();
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, styles.artwork]}
    >
      <Image
        source={require("@/assets/images/brand-waves.png")}
        accessible={false}
        aria-hidden
        resizeMode="cover"
        style={[
          StyleSheet.absoluteFill,
          styles.image,
          { opacity: subtle ? 0.09 : mode === "dark" ? 0.6 : 0.88 },
        ]}
      />
    </View>
  );
}

export function BrandSplash() {
  const themed = useThemeStyles(createStyles);
  return (
    <View
      style={themed.splash}
      accessible
      accessibilityLabel="Kripto. Restoring your session."
    >
      <View style={styles.splashArtwork}>
        <BrandArtwork subtle />
      </View>
      <View style={styles.identity}>
        <BrandMark />
        <Text style={themed.wordmark}>KRIPTO</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { width: "100%", height: "100%" },
  artwork: { overflow: "hidden" },
  identity: { alignItems: "center", gap: 14 },
  splashArtwork: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: "45%",
  },
});

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    splash: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
    },
    wordmark: {
      color: colors.text,
      fontSize: 27,
      fontWeight: "800",
      letterSpacing: 4,
    },
  });
