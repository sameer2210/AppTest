import { StyleSheet, TextInput, View, Image } from "react-native";
import { fontTextStyles } from "@/utils/typography";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { getProfileImageSource } from "@/utils/profileImage.utils";

type ActionItem = {
  id: string;
  label: string;
  onPress?: () => void;
};

type Registration = {
  id: string;
  name: string;
  timeAgo: string;
  avatarUri?: string | null;
  avatarUid?: string | null;
};

type Props = {
  checkIn: string;
  registrations: string;
  revenue: string;
  actions: ActionItem[];
  recent: Registration[];
  search: string;
  onSearchChange: (v: string) => void;
  onViewRegistration?: (id: string) => void;
  /** When false, hide Edit Details (e.g. event is live). Default true. */
  showEditDetails?: boolean;
  onOpenLeaderboard?: () => void;
  onOpenSettlements?: () => void;
};

/** Live Analytics tab — Figma 1:4021. */
const AnalyticsPanel = ({
  checkIn,
  registrations,
  revenue,
  actions,
  recent,
  search,
  onSearchChange,
  onViewRegistration,
  showEditDetails = true,
  onOpenLeaderboard,
  onOpenSettlements,
}: Props) => (
  <View style={styles.root}>
    {actions.length > 0 ? (
      <View style={styles.actionsCard}>
        <CustomText style={styles.actionsHeading}>
          {actions.length} actions need your attention
        </CustomText>
        {actions.map((item) => (
          <View key={item.id} style={styles.actionRow}>
            <CustomText style={styles.actionText}>• {item.label}</CustomText>
            <PressableScale
              onPress={item.onPress}
              style={styles.bluePill}
              accessibilityRole="button"
            >
              <CustomText style={styles.actionBtnText}>Action</CustomText>
            </PressableScale>
          </View>
        ))}
      </View>
    ) : null}

    <View style={styles.metricsBar}>
      <View style={styles.metric}>
        <View style={styles.metricTop}>
          <Ionicons name="calendar-outline" size={18} color="#D9D9D9" />
          <CustomText style={styles.metricValue}>{checkIn}</CustomText>
        </View>
        <CustomText style={styles.metricLabel}>Check In</CustomText>
      </View>
      <View style={styles.metricDivider} />
      <View style={styles.metric}>
        <View style={styles.metricTop}>
          <Ionicons name="people-outline" size={18} color="#D9D9D9" />
          <CustomText style={styles.metricValue}>{registrations}</CustomText>
        </View>
        <CustomText style={styles.metricLabel}>Registrations</CustomText>
      </View>
      <View style={styles.metricDivider} />
      <View style={styles.metric}>
        <View style={styles.metricTop}>
          <Ionicons name="cash-outline" size={18} color="#D9D9D9" />
          <CustomText style={styles.metricValue}>{revenue}</CustomText>
        </View>
        <CustomText style={styles.metricLabel}>Total Revenue</CustomText>
      </View>
    </View>

    <View style={styles.managementCard}>
      <CustomText style={styles.managementHeading}>Management Actions</CustomText>
      <View style={styles.actionsGrid}>
        {showEditDetails ? (
          <PressableScale style={styles.actionItem} onPress={() => {}}>
            <Ionicons name="create-outline" size={24} color="#D9D9D9" />
            <CustomText style={styles.actionLabel}>Edit Details</CustomText>
          </PressableScale>
        ) : null}
        <PressableScale style={styles.actionItem} onPress={onOpenLeaderboard}>
          <Ionicons name="list-outline" size={24} color="#D9D9D9" />
          <CustomText style={styles.actionLabel}>Leaderboard</CustomText>
        </PressableScale>
        <PressableScale
          style={styles.actionItem}
          onPress={onOpenSettlements}
          accessibilityRole="button"
        >
          <Ionicons name="wallet-outline" size={24} color="#D9D9D9" />
          <CustomText style={styles.actionLabel}>Settlements</CustomText>
        </PressableScale>
      </View>
    </View>

    <View style={styles.recentCard}>
      <CustomText style={styles.recentHeading}>Recent Registrations</CustomText>
      <View style={styles.search}>
        <TextInput
          value={search}
          onChangeText={onSearchChange}
          placeholder="Search by Name"
          placeholderTextColor="rgba(217,217,217,0.55)"
          style={styles.searchInput}
        />
      </View>
      {recent.length === 0 ? (
        <CustomText style={styles.emptyText}>No registrations yet.</CustomText>
      ) : (
        recent.map((row) => (
          <View key={row.id} style={styles.regRow}>
            <View style={styles.regAvatar}>
              <Image
                source={getProfileImageSource(row.avatarUri, row.avatarUid || row.id)}
                style={styles.regAvatarImg}
              />
            </View>
            <View style={styles.regCopy}>
              <CustomText style={styles.regName}>{row.name}</CustomText>
              <CustomText style={styles.regTime}>{row.timeAgo}</CustomText>
            </View>
            <PressableScale
              onPress={() => onViewRegistration?.(row.id)}
              style={styles.viewPill}
              accessibilityRole="button"
            >
              <CustomText style={styles.viewBtnText}>View</CustomText>
            </PressableScale>
          </View>
        ))
      )}
    </View>
  </View>
);

const styles = StyleSheet.create({
  root: {
    gap: 12,
  },
  actionsCard: {
    backgroundColor: "#D9D9D9",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
  },
  bluePill: {
    height: 26,
    minWidth: 64,
    paddingHorizontal: 12,
    borderRadius: 39,
    backgroundColor: "#086CFF",
    alignItems: "center",
    justifyContent: "center",
  },
  metricsBar: {
    backgroundColor: "#086CFF",
    borderRadius: 12,
    minHeight: 80,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  metric: {
    flex: 1,
    alignItems: "flex-start",
    paddingHorizontal: 8,
  },
  metricTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  metricDivider: {
    width: StyleSheet.hairlineWidth,
    height: 40,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  recentCard: {
    backgroundColor: "#191919",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 10,
    minHeight: 280,
  },
  search: {
    height: 51,
    borderRadius: 108,
    backgroundColor: "#2C2C2C",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  searchInput: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "#D9D9D9",
    padding: 0,
  },
  managementCard: {
    backgroundColor: "#191919",
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  actionsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  actionItem: {
    flex: 1,
    height: 80,
    backgroundColor: "#2C2C2C",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  actionLabel: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "#D9D9D9",
  },
  regRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
  },
  regAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#3A3A3A",
    overflow: "hidden",
  },
  regAvatarImg: {
    width: "100%",
    height: "100%",
  },
  regCopy: {
    flex: 1,
    marginLeft: 10,
  },
  viewPill: {
    height: 25,
    minWidth: 63,
    borderRadius: 70,
    backgroundColor: "#D9D9D9",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  actionsHeading: {
    marginBottom: 12,
    fontSize: 20,
    color: "#000000",
  },
  actionText: {
    flex: 1,
    fontSize: 14,
    color: "rgba(0, 0, 0, 0.6)",
  },
  actionBtnText: {
    fontSize: 12,
    color: "#D9D9D9",
  },
  metricValue: {
    marginLeft: 4,
    fontSize: 20,
    color: "#D9D9D9",
  },
  metricLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.75)",
  },
  managementHeading: {
    marginBottom: 12,
    fontSize: 16,
    fontWeight: "500",
    color: "#D9D9D9",
  },
  recentHeading: {
    marginBottom: 12,
    fontSize: 24,
    color: "#D9D9D9",
  },
  emptyText: {
    marginTop: 16,
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.5)",
  },
  regName: {
    fontSize: 14,
    color: "#D9D9D9",
  },
  regTime: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.75)",
  },
  viewBtnText: {
    fontSize: 12,
    color: "#000000",
  },
});

export default AnalyticsPanel;
