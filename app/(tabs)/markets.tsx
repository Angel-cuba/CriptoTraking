import { AssetDetailModal } from "@/src/components/AssetDetailPresentation";
import type { MarketAsset } from "@/src/types/market";
import { MarketCatalogModal } from "@/src/components/MarketCatalogModal";
import { MarketList } from "@/src/components/MarketList";
import { useAppTheme } from "@/src/context/ThemeContext";
import { useMarketCatalog } from "@/src/hooks/useMarketCatalog";
import { useMarketList } from "@/src/hooks/useMarketList";
import { useProfile } from "@/src/hooks/useProfile";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Keyboard } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function MarketsScreen() {
  const { scope } = useLocalSearchParams<{ scope?: string }>();
  const { colors } = useAppTheme();
  const catalog = useMarketCatalog();
  const account = useProfile();
  const { profile, loading: profileLoading, saving, toggleWatchlist } = account;
  const [selectedAsset, setSelectedAsset] = useState<MarketAsset | null>(null);
  const [catalogVisible, setCatalogVisible] = useState(false);
  const [pendingSymbol, setPendingSymbol] = useState<string | null>(null);
  const pendingFollow = useRef(false);
  const watched = useMemo(
    () => new Set(profile?.watchlist ?? []),
    [profile?.watchlist],
  );
  const model = useMarketList({
    snapshot: catalog.snapshot,
    watched,
    watchlistOnly: true,
  });
  const { resetFilters } = model;
  const watchlistDisabled =
    profileLoading || saving || !profile || pendingSymbol !== null;
  const toggle = useCallback(
    async (symbol: string) => {
      if (watchlistDisabled || pendingFollow.current) return;
      pendingFollow.current = true;
      setPendingSymbol(symbol);
      try {
        await toggleWatchlist(symbol);
      } finally {
        pendingFollow.current = false;
        setPendingSymbol(null);
      }
    },
    [toggleWatchlist, watchlistDisabled],
  );

  useFocusEffect(
    useCallback(() => {
      if (scope !== "watchlist") return;
      setSelectedAsset(null);
      setCatalogVisible(false);
      resetFilters();
      router.setParams({ scope: undefined });
    }, [scope, resetFilters]),
  );

  const data = {
    catalog,
    account,
    watched,
    watchlistDisabled,
    pendingSymbol,
    toggle,
  };
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={["top", "left", "right"]}
    >
      <MarketList
        data={data}
        model={model}
        onOpenAsset={(asset) => {
          Keyboard.dismiss();
          model.setMenu(null);
          setSelectedAsset(asset);
        }}
        onOpenCatalog={() => {
          Keyboard.dismiss();
          model.setMenu(null);
          setCatalogVisible(true);
        }}
      />
      <AssetDetailModal
        asset={selectedAsset}
        onClose={() => setSelectedAsset(null)}
      />
      <MarketCatalogModal
        visible={catalogVisible}
        data={data}
        onClose={() => setCatalogVisible(false)}
      />
    </SafeAreaView>
  );
}
