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
      <View style={styles.backdrop}>
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
                tintColor="#20262D"
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
                    tintColor="#2375AE"
                    size={20}
                  />
                )}
              </Pressable>
            )}
          />
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    width: "100%",
    maxWidth: 600,
    maxHeight: "75%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 20,
    paddingRight: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E8EB",
  },
  title: { flex: 1, fontSize: 18, fontWeight: "600", color: "#20262D" },
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
  selected: { backgroundColor: "#EFF6FB" },
  label: { flex: 1, fontSize: 16, color: "#20262D" },
});
