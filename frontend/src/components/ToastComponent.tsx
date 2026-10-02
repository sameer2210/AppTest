import { Ionicons } from "@expo/vector-icons";
import { fontTextStyles } from "@/utils/typography";
import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet } from "react-native";
import {
  selectLoaderMessage,
  selectLoaderVarient,
  selectShowToast,
  setShowToast,
} from "@/features/system";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { colors } from "../utils/colors";
import { TOAST_PRESETS } from "../utils/constants";
import CustomText from "./CustomText";

const AUTO_DISMISS_MS = 2000;

const toastVisual = (variant: string) => {
  switch (variant) {
    case TOAST_PRESETS.FAILURE:
      return { icon: "close-circle" as const, color: "#EF4444" };
    case TOAST_PRESETS.WARNING:
      return { icon: "warning" as const, color: "#EAB308" };
    case TOAST_PRESETS.SUCCESS:
      return { icon: "checkmark-circle" as const, color: "#4ADE80" };
    case TOAST_PRESETS.INFO:
    case TOAST_PRESETS.GENERAL:
    default:
      return { icon: "information-circle" as const, color: "#60A5FA" };
  }
};

export const ToastComponent = () => {
  const dispatch = useAppDispatch();
  const showToast = useAppSelector(selectShowToast);
  const message = useAppSelector(selectLoaderMessage);
  const variant = useAppSelector(selectLoaderVarient);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!showToast) {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }).start();
      return;
    }
    Animated.timing(opacity, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
    const t = setTimeout(() => dispatch(setShowToast(false)), AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [showToast, message, dispatch, opacity]);

  const { icon, color } = toastVisual(variant);

  if (!showToast) {
    return null;
  }

  return (
    <Animated.View pointerEvents="box-none" style={[styles.wrap, { opacity }]}>
      <Pressable
        onPress={() => dispatch(setShowToast(false))}
        style={styles.inner}
        accessibilityRole="alert"
      >
        <Ionicons name={icon} size={22} color={color} />
        <CustomText text={message} style={styles.message} numberOfLines={4} />
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 40,
    zIndex: 999999,
    elevation: 24,
    alignItems: "center",
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    maxWidth: "100%",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.toastColor,
  },
  message: {
    ...fontTextStyles.eighteenNormalBlack,
    flex: 1,
    flexShrink: 1,
    color: colors.white,
  },
});
