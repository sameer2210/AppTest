import React from "react";
import { StyleSheet, View, StatusBar } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { SCREEN_HORIZONTAL_PADDING_WIDE } from "@/utils/screen-layout";

interface CreateEventHeroCardProps {
  title?: string;
  children: React.ReactNode;
}

export const CreateEventHeroCard = React.memo(
  ({ title = "Create Event", children }: CreateEventHeroCardProps) => {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const topInset = Math.max(insets.top, StatusBar.currentHeight ?? 0);

    return (
      <View style={styles.card}>
        <LinearGradient
          colors={["#0c45ffff", "#014db7f1", "#6395f3ff"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={[styles.safeArea, { paddingTop: topInset + 8 }]}>
          <View style={styles.headerRow}>
            <PressableScale
              onPress={() => router.back()}
              style={styles.backBtn}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            </PressableScale>
            <CustomText style={styles.title}>
              {title}
            </CustomText>
          </View>

          <View style={styles.content}>{children}</View>
        </View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  safeArea: {
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING_WIDE,
    paddingBottom: 28,
  },
  headerRow: {
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    height: 44,
    width: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  title: {
    flex: 1,
    fontFamily: "SpaceGrotesk-Bold",
    fontSize: 26,
    lineHeight: 34,
    paddingBottom: 4,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "right",
    letterSpacing: -0.5,
  },
  content: {
    width: "100%",
    gap: 12,
  },
});

export default CreateEventHeroCard;
