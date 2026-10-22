import { useAppTheme } from "@/src/context/ThemeContext";
import { useMarketList } from "@/src/hooks/useMarketList";
import { Keyboard, Modal } from "react-native";
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
  // Keep catalog preferences mounted while its native presentation is closed.
  const model = useMarketList({
    snapshot: data.catalog.snapshot,
    watched: data.watched,
    watchlistOnly: false,
  });

  function closeCatalog() {
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
        if (model.menu !== null) model.setMenu(null);
        else closeCatalog();
      }}
    >
      {visible ? (
        <SafeAreaProvider style={{ backgroundColor: colors.background }}>
          <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <MarketList
              data={data}
              model={model}
              onCloseCatalog={closeCatalog}
            />
          </SafeAreaView>
        </SafeAreaProvider>
      ) : null}
    </Modal>
  );
}
