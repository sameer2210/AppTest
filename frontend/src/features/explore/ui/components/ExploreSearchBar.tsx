import React from "react";
import { fontTextStyles } from "@/utils/typography";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { href } from "@/navigation/href";

const BAR_HEIGHT = 50;
const RADIUS = BAR_HEIGHT / 2;

type Props = {
  compact?: boolean;
};

/** Dark glass pill — thin shiny border only, no top sheen fill. */
const ExploreSearchBar = ({ compact = false }: Props) => {
  const router = useRouter();

  return (
    <View style={compact ? styles.wrapperCompact : styles.wrapper}>
      {/* Thin gradient rim = shine on the border only */}
      <LinearGradient
        colors={[
          "rgba(220,240,255,0.75)",
          "rgba(120,160,210,0.22)",
          "rgba(120,160,210,0.18)",
          "rgba(200,230,255,0.55)",
        ]}
        locations={[0, 0.35, 0.65, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.rim}
      >
        <PressableScale
          onPress={() => router.push(href.app.searchResults as never)}
          style={styles.inner}
          accessibilityRole="button"
          accessibilityLabel="Search events"
        >
          <LinearGradient
            colors={["#1F3964", "#102345", "#071632", "#00050F"]}
            locations={[0, 0.3, 0.6, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.row}>
            <Ionicons name="search" size={20} color="rgba(210,220,235,0.9)" />
            <CustomText style={styles.placeholder} numberOfLines={1}>
              Search your Favourite
            </CustomText>
          </View>
        </PressableScale>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 13,
  },
  wrapperCompact: {
    flex: 1,
  },
  rim: {
    height: BAR_HEIGHT,
    borderRadius: RADIUS,
    padding: 1, // thin border only
  },
  inner: {
    flex: 1,
    borderRadius: RADIUS - 1,
    overflow: "hidden",
  },
  row: {
    zIndex: 2,
    height: "100%",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  placeholder: {
    ...fontTextStyles.eighteenNormalBlack,
    flex: 1,
    marginLeft: 10,
    color: "rgba(200,210,225,0.85)",
  },
});

export default ExploreSearchBar;
