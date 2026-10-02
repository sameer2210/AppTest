import { Platform, StyleSheet, TextInput, type TextInputProps, View } from "react-native";
import { fontTextStyles } from "@/utils/typography";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import CustomText from "@/components/CustomText";

import { Ionicons } from "@expo/vector-icons";

type Props = TextInputProps & {
  label?: string;
  prefix?: string;
  suffix?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  containerStyle?: object;
  inputStyle?: object;
};
const CreateGlassField = ({
  label,
  prefix,
  suffix,
  icon,
  containerStyle,
  inputStyle,
  placeholder,
  style,
  ...props
}: Props) => (
  <View style={[styles.wrap, containerStyle]}>
    {label ? (
      <CustomText style={styles.label} numberOfLines={1}>
        {label}
      </CustomText>
    ) : null}
    <View style={[styles.field, inputStyle]}>
      <BlurView
        pointerEvents="none"
        intensity={Platform.OS === "ios" ? 20 : 30}
        tint="dark"
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={["#2f74db10", "#2967ca3f", "#84a9ec11"]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
      {prefix ? (
        <CustomText style={styles.prefix}>
          {prefix}
        </CustomText>
      ) : null}
      <TextInput
        placeholder={placeholder}
        placeholderTextColor="rgba(255, 255, 255, 0.5)"
        style={[
          styles.input,
          prefix ? styles.inputWithPrefix : null,
          suffix ? styles.inputWithSuffix : null,
          style,
        ]}
        {...props}
      />
      {suffix ? (
        <CustomText style={styles.suffix}>
          {suffix}
        </CustomText>
      ) : null}
      {icon ? (
        <Ionicons name={icon} size={18} color="rgba(255,255,255,0.75)" style={styles.suffix} />
      ) : null}
    </View>
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
  },
  label: {
    fontFamily: "SpaceGrotesk-Medium",
    fontSize: 14,
    lineHeight: 18,
    color: "#FFFFFF",
    marginBottom: 8,
  },
  field: {
    height: 48,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
  },
  input: {
    ...fontTextStyles.sixteenNormalBlack,
    flex: 1,
    color: "#FFFFFF",
    padding: 0,
    paddingVertical: 0,
    margin: 0,
    zIndex: 2,
  },
  inputWithSuffix: {
    paddingRight: 8,
  },
  inputWithPrefix: {
    paddingLeft: 4,
  },
  prefix: {
    fontFamily: "SpaceGrotesk-Regular",
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.9)",
    marginRight: 4,
    zIndex: 2,
  },
  suffix: {
    fontFamily: "SpaceGrotesk-Regular",
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.75)",
    zIndex: 2,
  },
});

export default CreateGlassField;
