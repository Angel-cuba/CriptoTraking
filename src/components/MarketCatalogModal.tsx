import { useAppTheme } from "@/src/context/ThemeContext";
import { useMarketList } from "@/src/hooks/useMarketList";
import { useState } from "react";
import type { MarketAsset } from "@/src/types/market";
import { AssetDetailContent } from "./AssetDetailPresentation";
import { Keyboard, Modal, Platform, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { MarketList, type MarketListData } from "./MarketList";

export function MarketCatalogModal({
  visible,
  data,
  onClose,
}: {
  visible: boolean;
  data: MarketListData;
  onClose: () => void;
}) {
  const { colors } = useAppTheme();
  const [selectedAsset, setSelectedAsset] = useState<MarketAsset | null>(null);
  // Keep catalog preferences mounted while its native presentation is closed.
  const model = useMarketList({
    snapshot: data.catalog.snapshot,
    watched: data.watched,
    watchlistOnly: false,
  });

  function closeCatalog() {
    setSelectedAsset(null);
    Keyboard.dismiss();
    model.setMenu(null);
    onClose();
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      backdropColor={colors.background}
      onRequestClose={() => {
        if (selectedAsset) setSelectedAsset(null);
        else if (model.menu !== null) model.setMenu(null);
        else closeCatalog();
      }}
    >
      {visible ? (
        <SafeAreaProvider style={{ backgroundColor: colors.background }}>
          <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={{ flex: 1 }}>
              <View
                style={{ flex: 1, opacity: selectedAsset ? 0 : 1 }}
                pointerEvents={selectedAsset ? "none" : "auto"}
                accessibilityElementsHidden={!!selectedAsset}
                importantForAccessibility={
                  selectedAsset ? "no-hide-descendants" : "auto"
                }
                aria-hidden={!!selectedAsset}
                {...(Platform.OS === "web" ? { inert: !!selectedAsset } : {})}
              >
                <MarketList
                  onOpenAsset={(asset) => {
                    Keyboard.dismiss();
                    model.setMenu(null);
                    setSelectedAsset(asset);
                  }}
                  data={data}
                  model={model}
                  onCloseCatalog={closeCatalog}
                />
              </View>
              {selectedAsset ? (
                <View style={{ position: "absolute", inset: 0 }}>
                  <AssetDetailContent
                    asset={selectedAsset}
                    onClose={() => setSelectedAsset(null)}
                  />
                </View>
              ) : null}
            </View>
          </SafeAreaView>
        </SafeAreaProvider>
      ) : null}
    </Modal>
  );
}
