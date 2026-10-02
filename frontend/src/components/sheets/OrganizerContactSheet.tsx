import { useCallback, useEffect, useRef, useState } from "react";
import { fontTextStyles } from "@/utils/typography";
import { Linking, Modal, Platform, Pressable, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { ShimmerBox } from "@/components/ShimmerPlaceholder";
import { showToastMessage } from "@/utils/app-utils";
import { captureEvent } from "@/analytics/posthog/events";

export type OrganizerContactSeed = {
  organizerUid?: string | null;
  eventKey?: string | null;
  phone?: string | null;
  email?: string | null;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  seed?: OrganizerContactSeed | null;
  onFetchDetails?: (seed: OrganizerContactSeed) => Promise<{ phone?: string; email?: string }>;
};

/**
 * Same Contact Info sheet as Tickets tab — slides up from bottom with dim overlay.
 */
const OrganizerContactSheet = ({ visible, onClose, seed, onFetchDetails }: Props) => {
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(false);
  const closingRef = useRef(false);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const overlayOpacity = useSharedValue(0);
  const sheetTranslateY = useSharedValue(420);

  const finishClose = useCallback(() => {
    setMounted(false);
    closingRef.current = false;
    // Parent may already have visible=false; always sync so reopen works.
    onClose();
  }, [onClose]);

  const animateOpen = useCallback(() => {
    closingRef.current = false;
    overlayOpacity.value = withTiming(1, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
    sheetTranslateY.value = withTiming(0, {
      duration: 320,
      easing: Easing.out(Easing.cubic),
    });
  }, [overlayOpacity, sheetTranslateY]);

  const animateClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    overlayOpacity.value = withTiming(0, {
      duration: 180,
      easing: Easing.in(Easing.cubic),
    });
    sheetTranslateY.value = withTiming(
      420,
      { duration: 240, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(finishClose)();
      },
    );
  }, [finishClose, overlayOpacity, sheetTranslateY]);

  useEffect(() => {
    if (!visible) return;
    const initialPhone = (seed?.phone || "").trim();
    const initialEmail = (seed?.email || "").trim();
    setPhone(initialPhone);
    setEmail(initialEmail);
    setLoading(false);
    closingRef.current = false;
    overlayOpacity.value = 0;
    sheetTranslateY.value = 420;
    setMounted(true);

    if (onFetchDetails && seed && (!initialPhone || !initialEmail)) {
      setLoading(true);
      let cancelled = false;
      void (async () => {
        try {
          const res = await onFetchDetails(seed);
          if (!cancelled && res) {
            if (res.phone) setPhone(res.phone.trim());
            if (res.email) setEmail(res.email.trim());
          }
        } catch {
          // ignore
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }
  }, [
    visible,
    seed,
    onFetchDetails,
    overlayOpacity,
    sheetTranslateY,
  ]);

  useEffect(() => {
    if (mounted && visible && !closingRef.current) {
      animateOpen();
    }
  }, [mounted, visible, animateOpen]);

  useEffect(() => {
    if (!visible && mounted && !closingRef.current) {
      animateClose();
    }
  }, [visible, mounted, animateClose]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  if (!mounted) return null;

  const phoneVal = phone.trim();
  const emailVal = email.trim();

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={animateClose}
    >
      <View style={styles.root}>
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFillObject, styles.dim, overlayStyle]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          style={StyleSheet.absoluteFillObject}
          onPress={animateClose}
        />

        <Animated.View style={[styles.sheetWrap, sheetStyle]}>
          <BlurView
            intensity={Platform.OS === "ios" ? 50 : 80}
            tint="dark"
            pointerEvents="none"
            style={[styles.sheetGlass, { paddingBottom: Math.max(insets.bottom, 24) + 16 }]}
          >
            <View style={styles.handle} />
            <CustomText style={styles.title}>Contact Info</CustomText>

            {loading && !phoneVal && !emailVal ? (
              <ShimmerBox
                width="100%"
                height={60}
                borderRadius={12}
                style={{ marginVertical: 24 }}
              />
            ) : (
              <>
                <View style={styles.row}>
                  <CustomText
                    style={[styles.valueText, !phoneVal && styles.valueMissing]}
                    numberOfLines={1}
                  >
                    {phoneVal || "not provided by organiser"}
                  </CustomText>
                  {phoneVal ? (
                    <View style={styles.actions}>
                      <PressableScale
                        style={styles.actionBtn}
                        onPress={() => {
                          captureEvent("organizer_contact_tapped", { channel: "whatsapp" });
                          const cleanNumber = phoneVal.replace(/[^0-9]/g, "");
                          Linking.openURL(`https://wa.me/${cleanNumber}`).catch(() => {
                            showToastMessage("Could not open WhatsApp");
                          });
                        }}
                      >
                        <Ionicons name="logo-whatsapp" size={17} color="#25D366" />
                        <CustomText style={styles.actionBtnText}>WhatsApp</CustomText>
                      </PressableScale>
                      <PressableScale
                        style={styles.actionBtn}
                        onPress={() => {
                          captureEvent("organizer_contact_tapped", { channel: "tel" });
                          Linking.openURL(`tel:${phoneVal}`).catch(() => {
                            showToastMessage("Could not start call");
                          });
                        }}
                      >
                        <Ionicons name="call-outline" size={16} color="#FFFFFF" />
                        <CustomText style={styles.actionBtnText}>Call</CustomText>
                      </PressableScale>
                    </View>
                  ) : null}
                </View>

                <View style={[styles.row, { marginTop: 24 }]}>
                  <CustomText
                    style={[styles.valueText, !emailVal && styles.valueMissing]}
                    numberOfLines={1}
                  >
                    {emailVal || "not provided by organiser"}
                  </CustomText>
                  {emailVal ? (
                    <PressableScale
                      style={[styles.actionBtn, { paddingHorizontal: 22 }]}
                      onPress={() => {
                        captureEvent("organizer_contact_tapped", { channel: "email" });
                        void Clipboard.setStringAsync(emailVal);
                        showToastMessage("Email copied to clipboard!");
                      }}
                    >
                      <CustomText style={[styles.actionBtnText, { marginLeft: 0 }]}>Copy</CustomText>
                    </PressableScale>
                  ) : null}
                </View>
              </>
            )}
          </BlurView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  dim: {
    backgroundColor: "rgba(0, 0, 0, 0.65)",
  },
  sheetWrap: {
    zIndex: 2,
  },
  sheetGlass: {
    backgroundColor: "rgba(25, 25, 25, 0.75)",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 24,
    paddingTop: 12,
    overflow: "hidden",
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.28)",
    marginBottom: 16,
  },
  title: {
    ...fontTextStyles.size24BoldBlack,
    color: "#FFFFFF",
    marginBottom: 24,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  valueText: {
    ...fontTextStyles.eighteenNormalBlack,
    color: "rgba(255, 255, 255, 0.75)",
    flex: 1,
    marginRight: 12,
  },
  valueMissing: {
    color: "rgba(255, 255, 255, 0.5)",
    fontStyle: "italic",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  actionBtn: {
    backgroundColor: "#373737",
    borderWidth: 1,
    borderColor: "#474747",
    borderRadius: 8,
    height: 38,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnText: {
    ...fontTextStyles.twelveMediumBlack,
    color: "#FFFFFF",
    marginLeft: 6,
  },
});

export { OrganizerContactSheet };
export default OrganizerContactSheet;
