import { StyleSheet, View } from "react-native";
import { ShimmerBox } from "../ShimmerPlaceholder";
import { SCREEN_HORIZONTAL_PADDING, screenSectionInsetStyle } from "@/utils/screen-layout";

type CountProps = {
  count?: number;
};

export const BattleCardSkeleton = () => (
  <View style={styles.battleCard}>
    <View style={styles.rowBetween}>
      <View style={styles.flex}>
        <ShimmerBox width="70%" height={20} borderRadius={8} />
        <ShimmerBox width="45%" height={10} borderRadius={6} style={styles.gapSm} />
      </View>
      <ShimmerBox width={64} height={24} borderRadius={12} />
    </View>
    <ShimmerBox width="100%" height={37} borderRadius={10} style={styles.gapMd} />
  </View>
);

export const HorizontalClanCardsSkeleton = ({ count = 3 }: CountProps) => (
  <View style={styles.horizontalRow}>
    {Array.from({ length: count }).map((_, index) => (
      <ShimmerBox key={index} width={128} height={151} borderRadius={18} />
    ))}
  </View>
);

export const ClanListItemSkeleton = () => (
  <View style={styles.clanListItem}>
    <ShimmerBox width={48} height={48} borderRadius={24} />
    <View style={styles.flex}>
      <ShimmerBox width="55%" height={16} borderRadius={6} />
      <ShimmerBox width="40%" height={12} borderRadius={6} style={styles.gapSm} />
    </View>
    <ShimmerBox width={56} height={28} borderRadius={14} />
  </View>
);

export const ClanListSkeleton = ({ count = 4 }: CountProps) => (
  <View style={styles.listGap}>
    {Array.from({ length: count }).map((_, index) => (
      <ClanListItemSkeleton key={index} />
    ))}
  </View>
);

export const ListCardSkeleton = () => (
  <View style={styles.listCard}>
    <ShimmerBox width="60%" height={18} borderRadius={8} />
    <ShimmerBox width="40%" height={12} borderRadius={6} style={styles.gapSm} />
    <ShimmerBox width="30%" height={12} borderRadius={6} style={styles.gapSm} />
  </View>
);

export const ListCardsSkeleton = ({ count = 3 }: CountProps) => (
  <View style={styles.listGap}>
    {Array.from({ length: count }).map((_, index) => (
      <ListCardSkeleton key={index} />
    ))}
  </View>
);

export const ChartBarsSkeleton = () => (
  <View style={styles.chartWrap}>
    <View style={styles.barRow}>
      {Array.from({ length: 7 }).map((_, index) => (
        <ShimmerBox key={index} width={32} height={60 + (index % 3) * 28} borderRadius={20} />
      ))}
    </View>
  </View>
);

export const LeaderboardRowsSkeleton = ({ count = 5 }: CountProps) => (
  <View style={styles.listGap}>
    {Array.from({ length: count }).map((_, index) => (
      <View key={index} style={styles.leaderboardRow}>
        <ShimmerBox width={28} height={14} borderRadius={4} />
        <ShimmerBox width="45%" height={14} borderRadius={4} style={styles.flex} />
        <ShimmerBox width={48} height={14} borderRadius={4} />
      </View>
    ))}
  </View>
);

export const FormFieldsSkeleton = ({ count = 4 }: CountProps) => (
  <View style={styles.listGap}>
    <ShimmerBox width="100%" height={140} borderRadius={16} />
    {Array.from({ length: count }).map((_, index) => (
      <View key={index} style={styles.fieldBlock}>
        <ShimmerBox width="30%" height={12} borderRadius={6} />
        <ShimmerBox width="100%" height={44} borderRadius={10} style={styles.gapSm} />
      </View>
    ))}
  </View>
);

export const ClanViewSkeleton = () => (
  <View style={styles.listGap}>
    <View style={styles.clanProfileCard}>
      <View style={styles.row}>
        <ShimmerBox width={72} height={72} borderRadius={36} />
        <View style={styles.flex}>
          <ShimmerBox width="70%" height={20} borderRadius={8} />
          <ShimmerBox width="50%" height={12} borderRadius={6} style={styles.gapSm} />
          <ShimmerBox width="60%" height={12} borderRadius={6} style={styles.gapSm} />
        </View>
      </View>
      <ShimmerBox width="40%" height={10} borderRadius={6} style={styles.gapMd} />
      <ShimmerBox width="100%" height={48} borderRadius={8} />
    </View>
    <View style={styles.tabRow}>
      <ShimmerBox width="48%" height={36} borderRadius={10} />
      <ShimmerBox width="48%" height={36} borderRadius={10} />
    </View>
    <ClanListSkeleton count={4} />
  </View>
);

export const EventHeroSkeleton = () => (
  <View style={styles.listGap}>
    <ShimmerBox width="100%" height={200} borderRadius={18} />
    <ShimmerBox width="75%" height={28} borderRadius={10} />
    <ShimmerBox width="100%" height={14} borderRadius={6} />
    <ShimmerBox width="90%" height={14} borderRadius={6} />
    <ShimmerBox width="35%" height={12} borderRadius={6} />
    <ShimmerBox width="30%" height={12} borderRadius={6} />
  </View>
);

export const PanelItemsSkeleton = ({ count = 4 }: CountProps) => (
  <View style={styles.listGap}>
    <ShimmerBox width="50%" height={24} borderRadius={8} />
    {Array.from({ length: count }).map((_, index) => (
      <View key={index} style={styles.panelItem}>
        <ShimmerBox width="45%" height={16} borderRadius={6} />
        <ShimmerBox width="70%" height={12} borderRadius={6} style={styles.gapSm} />
      </View>
    ))}
  </View>
);

export const ProfileScreenSkeleton = () => (
  <View style={{ gap: 16, paddingTop: 40, paddingHorizontal: 16, paddingBottom: 120 }}>
    {/* Profile Header Card */}
    <View
      style={{
        borderRadius: 30,
        padding: 24,
        backgroundColor: "rgba(255, 255, 255, 0.08)",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.15)",
      }}
    >
      <ShimmerBox width={96} height={96} borderRadius={48} style={{ marginBottom: 16 }} />
      <ShimmerBox width="55%" height={24} borderRadius={8} style={{ marginBottom: 8 }} />
      <ShimmerBox width="35%" height={14} borderRadius={4} style={{ marginBottom: 16 }} />
      <ShimmerBox width="45%" height={32} borderRadius={16} style={{ marginBottom: 16 }} />
      <ShimmerBox width="85%" height={14} borderRadius={4} />
    </View>

    {/* Rewards Strip */}
    <View style={{ backgroundColor: "#212121", borderRadius: 20, padding: 16 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
        <ShimmerBox width="40%" height={18} borderRadius={6} />
        <ShimmerBox width={20} height={18} borderRadius={4} />
      </View>
      <View style={{ flexDirection: "row", gap: 12 }}>
        {Array.from({ length: 4 }).map((_, index) => (
          <View key={index} style={{ width: 78, alignItems: "center" }}>
            <ShimmerBox width={68} height={76} borderRadius={12} />
            <ShimmerBox width="70%" height={10} borderRadius={4} style={{ marginTop: 6 }} />
          </View>
        ))}
      </View>
    </View>

    {/* 4-Stat Summary Row */}
    <View
      style={{
        backgroundColor: "#212121",
        borderRadius: 20,
        padding: 16,
        flexDirection: "row",
        justifyContent: "space-between",
      }}
    >
      {Array.from({ length: 4 }).map((_, index) => (
        <View key={index} style={{ alignItems: "center", flex: 1 }}>
          <ShimmerBox width={40} height={20} borderRadius={6} />
          <ShimmerBox width={32} height={12} borderRadius={4} style={{ marginTop: 6 }} />
        </View>
      ))}
    </View>

    {/* Activity Chart Container */}
    <View style={{ backgroundColor: "#212121", borderRadius: 30, padding: 20 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <View>
          <ShimmerBox width={60} height={24} borderRadius={6} />
          <ShimmerBox width={90} height={12} borderRadius={4} style={{ marginTop: 4 }} />
        </View>
        <ShimmerBox width={160} height={36} borderRadius={18} />
      </View>
      <ChartBarsSkeleton />
    </View>

    {/* Action Menu Items */}
    <View style={{ gap: 12 }}>
      {Array.from({ length: 3 }).map((_, index) => (
        <ShimmerBox key={index} width="100%" height={60} borderRadius={15} />
      ))}
    </View>
  </View>
);

export const KingdomScreenSkeleton = () => (
  <View style={styles.listGap}>
    <View style={styles.kingdomSectionInset}>
      <ShimmerBox width="45%" height={20} borderRadius={8} />
      <ShimmerBox width="70%" height={12} borderRadius={6} style={styles.gapSm} />
    </View>
    <View style={[styles.horizontalRow, styles.kingdomHonorRow]}>
      {Array.from({ length: 3 }).map((_, index) => (
        <ShimmerBox key={index} width={84} height={139} borderRadius={12} />
      ))}
    </View>
    <View style={styles.kingdomSectionInset}>
      <ShimmerBox width="50%" height={20} borderRadius={8} style={styles.gapMd} />
      <ShimmerBox width="85%" height={12} borderRadius={6} />
      <ShimmerBox width="100%" height={96} borderRadius={16} style={styles.gapSm} />
      <ShimmerBox width="35%" height={20} borderRadius={8} style={styles.gapMd} />
      <ShimmerBox width="75%" height={12} borderRadius={6} />
    </View>
    <View style={[styles.relicGrid, styles.kingdomSectionInset]}>
      {Array.from({ length: 6 }).map((_, index) => (
        <ShimmerBox key={index} width="30%" height={93} borderRadius={6} />
      ))}
    </View>
  </View>
);

export const ButtonSkeleton = () => <ShimmerBox width="100%" height={44} borderRadius={10} />;

export const ChipGridSkeleton = ({ count = 8 }: CountProps) => (
  <View style={styles.chipGrid}>
    {Array.from({ length: count }).map((_, index) => (
      <ShimmerBox key={index} width={96} height={36} borderRadius={18} />
    ))}
  </View>
);

export const GoogleFitChartSkeleton = () => (
  <View style={styles.listGap}>
    <ShimmerBox width="100%" height={140} borderRadius={18} />
    <View style={styles.tabRow}>
      <ShimmerBox width="48%" height={36} borderRadius={10} />
      <ShimmerBox width="48%" height={36} borderRadius={10} />
    </View>
    <View style={styles.rowBetween}>
      <ShimmerBox width="48%" height={72} borderRadius={12} />
      <ShimmerBox width="48%" height={72} borderRadius={12} />
    </View>
    <ChartBarsSkeleton />
  </View>
);

export const ScreenCenterSkeleton = () => (
  <View style={styles.screenCenter}>
    <ShimmerBox width="80%" height={180} borderRadius={20} />
    <ShimmerBox width="60%" height={20} borderRadius={8} style={styles.gapSm} />
    <ShimmerBox width="45%" height={14} borderRadius={6} style={styles.gapSm} />
    <ShimmerBox width="100%" height={120} borderRadius={16} style={styles.gapMd} />
  </View>
);

/** Compact shimmer for primary/secondary buttons while an action is in flight. */
export const InlineButtonSkeleton = ({ width = 72 }: { width?: number | string }) => (
  <ShimmerBox width={width} height={14} borderRadius={6} />
);

export const MatchmakingSkeleton = () => (
  <View style={styles.matchmakingWrap}>
    <ShimmerBox width={120} height={120} borderRadius={60} />
    <ShimmerBox width="70%" height={16} borderRadius={8} style={styles.gapSm} />
    <ShimmerBox width="50%" height={12} borderRadius={6} style={styles.gapSm} />
    <ShimmerBox width={140} height={44} borderRadius={12} style={styles.gapMd} />
  </View>
);

export const WaitingForFriendSkeleton = () => (
  <View style={styles.listGap}>
    <ShimmerBox width="80%" height={14} borderRadius={6} style={styles.centerSelf} />
    <ShimmerBox width="100%" height={72} borderRadius={12} />
    <ButtonSkeleton />
    <ShimmerBox width="100%" height={46} borderRadius={12} />
  </View>
);

export const GlobalLoaderSkeleton = () => (
  <View style={styles.globalLoader}>
    <ShimmerBox width="75%" height={160} borderRadius={20} />
    <ShimmerBox width="55%" height={18} borderRadius={8} style={styles.gapSm} />
    <ShimmerBox width="100%" height={14} borderRadius={6} style={styles.gapSm} />
    <ShimmerBox width="90%" height={14} borderRadius={6} style={styles.gapSm} />
  </View>
);

const styles = StyleSheet.create({
  battleCard: {
    width: 264,
    minHeight: 116,
    borderRadius: 20,
    backgroundColor: "#192B44",
    borderWidth: 1,
    borderColor: "#28394E",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  horizontalRow: {
    flexDirection: "row",
    gap: 12,
  },
  clanListItem: {
    minHeight: 72,
    borderRadius: 20,
    backgroundColor: "#192B44",
    borderWidth: 1,
    borderColor: "rgba(245,236,216,0.07)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  listCard: {
    borderRadius: 16,
    backgroundColor: "#192B44",
    borderWidth: 1,
    borderColor: "#28394E",
    padding: 16,
  },
  chartWrap: {
    height: 210,
    justifyContent: "flex-end",
  },
  barRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 8,
    minHeight: 210,
  },
  leaderboardRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  fieldBlock: {
    gap: 6,
  },
  clanProfileCard: {
    borderRadius: 20,
    backgroundColor: "#192B44",
    borderWidth: 1,
    borderColor: "#28394E",
    padding: 16,
  },
  tabRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  panelItem: {
    borderRadius: 14,
    backgroundColor: "#192B44",
    borderWidth: 1,
    borderColor: "#28394E",
    padding: 16,
  },
  profileHeader: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  screenCenter: {
    width: "100%",
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  homeCardSkeleton: {
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  matchmakingWrap: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 22,
  },
  globalLoader: {
    width: "78%",
    maxWidth: 320,
    alignItems: "stretch",
  },
  centerSelf: {
    alignSelf: "center",
  },
  relicGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "space-between",
  },
  kingdomSectionInset: screenSectionInsetStyle,
  kingdomHonorRow: {
    paddingLeft: SCREEN_HORIZONTAL_PADDING,
    gap: 8,
  },
  listGap: {
    gap: 12,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  flex: {
    flex: 1,
  },
  gapSm: {
    marginTop: 8,
  },
  gapMd: {
    marginTop: 12,
  },
});

export const HomeEventCardSkeleton = () => (
  <View style={styles.homeCardSkeleton}>
    <View style={styles.rowBetween}>
      <View style={styles.flex}>
        <ShimmerBox width="65%" height={22} borderRadius={6} />
        <ShimmerBox width="45%" height={14} borderRadius={4} style={styles.gapSm} />
      </View>
      <ShimmerBox width={56} height={24} borderRadius={12} />
    </View>
    <View style={[styles.rowBetween, { marginTop: 20, marginBottom: 6 }]}>
      <ShimmerBox width="35%" height={14} borderRadius={4} />
      <ShimmerBox width={70} height={22} borderRadius={4} />
    </View>
    <ShimmerBox width="100%" height={8} borderRadius={4} />
  </View>
);

export const HomeFeedSkeleton = ({ count = 2 }: CountProps) => (
  <View style={styles.listGap}>
    {Array.from({ length: count }).map((_, index) => (
      <HomeEventCardSkeleton key={index} />
    ))}
  </View>
);

export const NotificationCardSkeleton = () => (
  <View
    style={{
      backgroundColor: "#191919",
      borderRadius: 10,
      marginBottom: 12,
      flexDirection: "row",
      overflow: "hidden",
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.08)",
      height: 72,
    }}
  >
    <View
      style={{
        width: 114,
        backgroundColor: "rgba(8, 108, 255, 0.25)",
        paddingHorizontal: 12,
        paddingVertical: 12,
        justifyContent: "center",
      }}
    >
      <ShimmerBox width={78} height={12} borderRadius={3} />
      <ShimmerBox width={50} height={18} borderRadius={4} style={{ marginTop: 6 }} />
    </View>
    <View
      style={{
        flex: 1,
        paddingHorizontal: 14,
        paddingVertical: 12,
        justifyContent: "center",
      }}
    >
      <ShimmerBox width="85%" height={16} borderRadius={4} />
      <ShimmerBox width="45%" height={12} borderRadius={3} style={{ marginTop: 6 }} />
    </View>
  </View>
);

export const NotificationListSkeleton = ({ count = 4 }: CountProps) => (
  <View style={{ paddingTop: 4 }}>
    <ShimmerBox
      width={120}
      height={16}
      borderRadius={4}
      style={{ marginTop: 8, marginBottom: 8 }}
    />
    <View style={{ backgroundColor: "#191919", borderRadius: 12, padding: 16, marginBottom: 20 }}>
      <ShimmerBox width="50%" height={14} borderRadius={4} />
      <ShimmerBox width="35%" height={16} borderRadius={6} style={{ marginTop: 6 }} />
    </View>

    <ShimmerBox width={100} height={16} borderRadius={4} style={{ marginBottom: 12 }} />
    {Array.from({ length: count }).map((_, index) => (
      <NotificationCardSkeleton key={index} />
    ))}
  </View>
);

export const ExploreEventCardSkeleton = () => (
  <View
    style={{
      flexDirection: "row",
      width: "100%",
      height: 100,
      backgroundColor: "rgba(255, 255, 255, 0.08)",
      borderRadius: 14,
      marginBottom: 16,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.12)",
    }}
  >
    <ShimmerBox width={140} height={100} borderRadius={0} />
    <View
      style={{
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        justifyContent: "space-between",
      }}
    >
      <View>
        <ShimmerBox width="80%" height={16} borderRadius={4} />
        <ShimmerBox width="40%" height={12} borderRadius={4} style={{ marginTop: 6 }} />
      </View>
      <View
        style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}
      >
        <View>
          <ShimmerBox width={60} height={12} borderRadius={4} />
          <ShimmerBox width={70} height={14} borderRadius={4} style={{ marginTop: 4 }} />
        </View>
        <ShimmerBox width={16} height={16} borderRadius={8} />
      </View>
    </View>
  </View>
);

export const ExploreFeedSkeleton = ({ count = 5 }: CountProps) => (
  <View style={{ paddingHorizontal: 14, paddingTop: 4 }}>
    {Array.from({ length: count }).map((_, index) => (
      <ExploreEventCardSkeleton key={index} />
    ))}
  </View>
);

export const TicketCardSkeleton = () => (
  <View
    style={{
      backgroundColor: "#191919",
      borderRadius: 13,
      padding: 14,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: "#323232",
      minHeight: 168,
    }}
  >
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <View style={{ flex: 1, paddingRight: 10 }}>
        <ShimmerBox width="75%" height={22} borderRadius={6} />
        <ShimmerBox
          width="45%"
          height={14}
          borderRadius={4}
          style={{ marginTop: 8, marginBottom: 12 }}
        />
        <View style={{ gap: 8 }}>
          <ShimmerBox width={147} height={38} borderRadius={8} />
          <ShimmerBox width={147} height={38} borderRadius={8} />
        </View>
      </View>
      <ShimmerBox width={120} height={120} borderRadius={6} />
    </View>
  </View>
);

export const TicketListSkeleton = ({ count = 5 }: CountProps) => (
  <View style={{ marginTop: 12 }}>
    {Array.from({ length: count }).map((_, index) => (
      <TicketCardSkeleton key={index} />
    ))}
  </View>
);

export const EventDetailSkeleton = () => (
  <View style={{ flex: 1, paddingHorizontal: 16, gap: 14, paddingTop: 48 }}>
    <ShimmerBox width="100%" height={200} borderRadius={14} />
    <ShimmerBox width="100%" height={150} borderRadius={14} />
    <ShimmerBox width="100%" height={80} borderRadius={14} />
    <ShimmerBox width="100%" height={64} borderRadius={14} />
  </View>
);

export const RewardCardSkeleton = () => (
  <View
    style={{
      backgroundColor: "#191919",
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    }}
  >
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14, flex: 1 }}>
      <ShimmerBox width={64} height={64} borderRadius={32} />
      <View style={{ flex: 1 }}>
        <ShimmerBox width="70%" height={18} borderRadius={6} />
        <ShimmerBox width="45%" height={12} borderRadius={4} style={{ marginTop: 8 }} />
      </View>
    </View>
    <ShimmerBox width={80} height={32} borderRadius={16} />
  </View>
);

export const RewardListSkeleton = ({ count = 5 }: CountProps) => (
  <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
    <View style={{ backgroundColor: "#191919", borderRadius: 20, padding: 16, marginBottom: 20 }}>
      <ShimmerBox width="40%" height={18} borderRadius={6} style={{ marginBottom: 14 }} />
      <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
        {Array.from({ length: 3 }).map((_, index) => (
          <View key={index} style={{ alignItems: "center" }}>
            <ShimmerBox width={48} height={48} borderRadius={24} />
            <ShimmerBox width={36} height={12} borderRadius={4} style={{ marginTop: 6 }} />
          </View>
        ))}
      </View>
    </View>
    {Array.from({ length: count }).map((_, index) => (
      <RewardCardSkeleton key={index} />
    ))}
  </View>
);

export const LeaderboardScreenSkeleton = () => (
  <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 60 }}>
    <ShimmerBox width={48} height={48} borderRadius={24} style={{ marginBottom: 16 }} />
    <View style={{ backgroundColor: "#191919", borderRadius: 24, padding: 20 }}>
      <ShimmerBox width="100%" height={48} borderRadius={24} style={{ marginBottom: 16 }} />
      <ShimmerBox width={140} height={24} borderRadius={6} style={{ marginBottom: 16 }} />
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: "rgba(255,255,255,0.08)",
          paddingBottom: 12,
        }}
      >
        <ShimmerBox width={40} height={14} borderRadius={4} />
        <ShimmerBox width={80} height={14} borderRadius={4} />
        <ShimmerBox width={100} height={14} borderRadius={4} />
      </View>
      {Array.from({ length: 6 }).map((_, index) => (
        <View
          key={index}
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: "rgba(255,255,255,0.04)",
          }}
        >
          <ShimmerBox width={28} height={16} borderRadius={4} style={{ marginRight: 16 }} />
          <ShimmerBox width={44} height={44} borderRadius={22} style={{ marginRight: 12 }} />
          <View style={{ flex: 1, gap: 6 }}>
            <ShimmerBox width="60%" height={14} borderRadius={4} />
            <ShimmerBox width="40%" height={11} borderRadius={4} />
          </View>
          <ShimmerBox width={54} height={16} borderRadius={4} />
        </View>
      ))}
    </View>
  </View>
);
