import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, TextInput, View, type StyleProp, type ViewStyle } from "react-native";
import GlassSurface from "./GlassSurface";

export const GLASS_SEARCH_BAR_HEIGHT = 52;
const GLASS_INTENSITY = 30;

type Props = {
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  editable?: boolean;
  autoFocus?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/** Full-width glass search field — matches Explore search bar height and styling. */
const GlassSearchField = ({
  value,
  onChangeText,
  placeholder = "Search",
  editable = true,
  autoFocus = false,
  style,
  accessibilityLabel = "Search",
}: Props) => (
  <View style={[styles.wrap, style]} accessibilityLabel={accessibilityLabel}>
    <GlassSurface
      intensity={GLASS_INTENSITY}
      borderRadius={28}
      className="border border-white/20"
      style={styles.glass}
    >
      <View style={styles.inner}>
        <Ionicons name="search-outline" size={22} color="#FFFFFF" style={styles.icon} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.85)"
          style={styles.input}
          editable={editable}
          autoFocus={autoFocus}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>
    </GlassSurface>
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    minWidth: 0,
    overflow: "hidden",
  },
  glass: {
    width: "100%",
    height: GLASS_SEARCH_BAR_HEIGHT,
    minHeight: GLASS_SEARCH_BAR_HEIGHT,
    overflow: "hidden",
  },
  inner: {
    height: GLASS_SEARCH_BAR_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    zIndex: 3,
    minWidth: 0,
  },
  icon: {
    zIndex: 3,
  },
  input: {
    flex: 1,
    minWidth: 0,
    marginLeft: 10,
    color: "#FFFFFF",
    fontFamily: "Inter-Regular",
    fontSize: 16,
    paddingVertical: 0,
    zIndex: 3,
  },
});

export default GlassSearchField;
