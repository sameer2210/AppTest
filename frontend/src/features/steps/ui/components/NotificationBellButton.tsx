import { Ionicons } from "@expo/vector-icons";
import { useCallback } from "react";
import { StyleSheet, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { GlassSurface, PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { fontTextStyles } from "@/utils/typography";
import {
  selectUnreadNotificationCount,
  fetchUnreadNotificationCount,
} from "@/features/notifications";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { captureEvent } from "@/analytics/posthog/events";

type Props = {
  onPress?: () => void;
};

const NotificationBellButton = ({ onPress }: Props) => {
  const dispatch = useAppDispatch();
  const unreadCount = useAppSelector(selectUnreadNotificationCount);

  useFocusEffect(
    useCallback(() => {
      void dispatch(fetchUnreadNotificationCount());
    }, [dispatch]),
  );

  return (
    <PressableScale
      onPress={() => {
        captureEvent("notification_bell_tapped", { unread_count: unreadCount });
        onPress?.();
      }}
      style={styles.hit}
      accessibilityRole="button"
      accessibilityLabel="Notifications"
    >
      <GlassSurface intensity={30} borderRadius={25} style={styles.glass}>
        <View style={styles.iconWrap}>
          <Ionicons name="notifications-outline" size={23} color="#FFFFFF" />
        </View>
      </GlassSurface>
      {unreadCount > 0 ? (
        <View style={styles.badge}>
          <CustomText style={[fontTextStyles.tenBoldBlack, { color: "#FFFFFF" }]}>
            {unreadCount > 9 ? "9+" : String(unreadCount)}
          </CustomText>
        </View>
      ) : null}
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  hit: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  glass: {
    width: 50,
    height: 50,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  iconWrap: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 8,
    right: 8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#FF3B30",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    zIndex: 3,
  },
});

export default NotificationBellButton;
