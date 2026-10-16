import { PriceAlertProvider } from "@/src/context/PriceAlertContext";
import { ProfileProvider } from "@/src/context/ProfileContext";
import { SignalNotificationProvider } from "@/src/context/SignalNotificationContext";
import { useAppTheme } from "@/src/context/ThemeContext";
import { useAuth } from "@/src/hooks/useAuth";
import { TAB_BAR_HEIGHT } from "@/src/lib/theme";
import { Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const { colors: accountColors, mode } = useAppTheme();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const side = Math.max(16, (width - 520) / 2);
  const bottom = Math.max(insets.bottom, 16);
  if (!user) return null;
  return (
    <ProfileProvider key={user.id} userId={user.id}>
      <SignalNotificationProvider key={user.id} userId={user.id}>
        <PriceAlertProvider key={user.id} userId={user.id}>
          <Tabs
            initialRouteName="profile"
            screenOptions={{
              headerShown: false,
              tabBarActiveTintColor: accountColors.onPrimary,
              tabBarInactiveTintColor: accountColors.muted,
              tabBarActiveBackgroundColor: accountColors.action,
              tabBarLabelPosition: "below-icon",
              tabBarHideOnKeyboard: true,
              tabBarLabelStyle: {
                fontSize: 11,
                fontWeight: "700",
                marginTop: 3,
              },
              tabBarItemStyle: {
                borderRadius: 20,
                marginHorizontal: 3,
                overflow: "hidden",
              },
              tabBarBackground: () => (
                <>
                  <View
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      top: -12,
                      bottom: -bottom,
                      start: -side,
                      end: -side,
                      backgroundColor: accountColors.background,
                      boxShadow: `0 -16px 24px ${accountColors.background}`,
                    }}
                  />
                  <View
                    pointerEvents="none"
                    style={[
                      StyleSheet.absoluteFill,
                      {
                        backgroundColor: accountColors.elevated,
                        borderRadius: 28,
                        borderWidth: 1,
                        borderColor: accountColors.border,
                        boxShadow:
                          mode === "dark"
                            ? "0 8px 24px rgba(0,0,0,0.32)"
                            : "0 8px 24px rgba(24,32,50,0.12)",
                      },
                    ]}
                  />
                </>
              ),
              tabBarStyle: {
                position: "absolute",
                start: side,
                end: side,
                bottom,
                height: TAB_BAR_HEIGHT,
                paddingTop: 8,
                paddingBottom: 8,
                paddingHorizontal: 5,
                backgroundColor: "transparent",
                borderWidth: 0,
                borderTopWidth: 0,
                borderRadius: 28,
                elevation: 0,
              },
            }}
          >
            <Tabs.Screen
              name="markets"
              options={{
                title: "Markets",
                tabBarIcon: ({ color }) => (
                  <SymbolView
                    name={{
                      ios: "chart.bar.xaxis",
                      android: "bar_chart",
                      web: "bar_chart",
                    }}
                    tintColor={color}
                    size={23}
                  />
                ),
              }}
            />
            <Tabs.Screen
              name="signals"
              options={{
                title: "Signals",
                tabBarIcon: ({ color }) => (
                  <SymbolView
                    name={{
                      ios: "waveform.path.ecg",
                      android: "monitoring",
                      web: "monitoring",
                    }}
                    tintColor={color}
                    size={23}
                  />
                ),
              }}
            />
            <Tabs.Screen
              name="alerts"
              options={{
                title: "Alerts",
                tabBarIcon: ({ color }) => (
                  <SymbolView
                    name={{
                      ios: "bell",
                      android: "notifications_none",
                      web: "notifications_none",
                    }}
                    tintColor={color}
                    size={23}
                  />
                ),
              }}
            />
            <Tabs.Screen
              name="profile"
              options={{
                title: "Profile",
                tabBarIcon: ({ color }) => (
                  <SymbolView
                    name={{
                      ios: "person.crop.circle",
                      android: "account_circle",
                      web: "account_circle",
                    }}
                    tintColor={color}
                    size={23}
                  />
                ),
              }}
            />
          </Tabs>
        </PriceAlertProvider>
      </SignalNotificationProvider>
    </ProfileProvider>
  );
}
