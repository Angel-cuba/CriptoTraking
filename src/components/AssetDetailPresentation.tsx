import { useAppTheme } from "@/src/context/ThemeContext";
import type { MarketAsset } from "@/src/types/market";
import { lazy, Suspense } from "react";
import { ActivityIndicator, Modal, Pressable, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

const AssetDetail = lazy(() => import("./AssetDetail"));

export function AssetDetailContent({
  asset,
  onClose,
}: {
  asset: MarketAsset;
  onClose: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <Suspense
      fallback={
        <View
          style={{
            flex: 1,
            padding: 20,
            backgroundColor: colors.background,
            gap: 20,
          }}
        >
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={{ minHeight: 44, justifyContent: "center" }}
          >
            <Text style={{ color: colors.primary }}>Close asset details</Text>
          </Pressable>
          <ActivityIndicator color={colors.primary} />
        </View>
      }
    >
      <AssetDetail key={asset.symbol} asset={asset} onClose={onClose} />
    </Suspense>
  );
}

export function AssetDetailModal({
  asset,
  onClose,
}: {
  asset: MarketAsset | null;
  onClose: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <Modal
      visible={asset !== null}
      animationType="slide"
      presentationStyle="fullScreen"
      backdropColor={colors.background}
      onRequestClose={onClose}
    >
      {asset ? (
        <SafeAreaProvider>
          <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <AssetDetailContent asset={asset} onClose={onClose} />
          </SafeAreaView>
        </SafeAreaProvider>
      ) : null}
    </Modal>
  );
}
