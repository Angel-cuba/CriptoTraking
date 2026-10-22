import { useAppTheme, useThemeStyles } from "@/src/context/ThemeContext";
import { CORNER_RADIUS, type ThemeColors } from "@/src/lib/theme";
import { SymbolView } from "expo-symbols";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Option = { label: string; selected: boolean; onSelect: () => void };

type Props = {
  title: string;
  visible: boolean;
  options: Option[];
  onClose: () => void;
};

export function MarketOptionsModal({
  title,
  visible,
  options,
  onClose,
}: Props) {
  return (
    <Modal visible={visible} transparent onRequestClose={onClose}>
      <MarketOptionsSheet title={title} options={options} onClose={onClose} />
    </Modal>
  );
}

export function MarketOptionsSheet({
  title,
  options,
  onClose,
}: Omit<Props, "visible">) {
  const { colors: accountColors } = useAppTheme();
  const styles = useThemeStyles(createStyles);
  return (
    <View
      style={[StyleSheet.absoluteFill, styles.backdrop]}
      accessibilityViewIsModal
    >
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close options"
      />
      <SafeAreaView
        style={styles.sheet}
        edges={["bottom"]}
        accessibilityViewIsModal
      >
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          <Pressable
            onPress={onClose}
            style={styles.close}
            accessibilityRole="button"
            accessibilityLabel="Close options"
          >
            <SymbolView
              name={{ ios: "xmark", android: "close", web: "close" }}
              tintColor={accountColors.text}
              size={18}
            />
          </Pressable>
        </View>
        <FlatList
          data={options}
          keyExtractor={(option) => option.label}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="radio"
              accessibilityLabel={item.label}
              accessibilityState={{ checked: item.selected }}
              aria-checked={item.selected}
              onPress={() => {
                item.onSelect();
                onClose();
              }}
              style={[styles.option, item.selected && styles.selected]}
            >
              <Text style={styles.label}>{item.label}</Text>
              {item.selected && (
                <SymbolView
                  name={{ ios: "checkmark", android: "check", web: "check" }}
                  tintColor={accountColors.primary}
                  size={20}
                />
              )}
            </Pressable>
          )}
        />
      </SafeAreaView>
    </View>
  );
}

const createStyles = (accountColors: ThemeColors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      justifyContent: "flex-end",
      alignItems: "center",
      backgroundColor: accountColors.overlay,
    },
    sheet: {
      width: "100%",
      maxWidth: 600,
      maxHeight: "75%",
      borderWidth: 1,
      borderColor: accountColors.border,
      overflow: "hidden",
      backgroundColor: accountColors.surface,
      borderTopLeftRadius: CORNER_RADIUS.sheet,
      borderTopRightRadius: CORNER_RADIUS.sheet,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingLeft: 20,
      paddingRight: 8,
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: accountColors.border,
    },
    title: {
      flex: 1,
      fontSize: 18,
      fontWeight: "600",
      color: accountColors.text,
    },
    close: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    option: {
      minHeight: 52,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 14,
    },
    selected: { backgroundColor: accountColors.primarySoft },
    label: { flex: 1, fontSize: 16, color: accountColors.text },
  });
