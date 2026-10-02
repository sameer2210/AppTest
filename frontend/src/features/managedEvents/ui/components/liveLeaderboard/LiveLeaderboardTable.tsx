import { Image, ScrollView, StyleSheet, View } from "react-native";
import CustomText from "@/components/CustomText";
import { getProfileImageSource } from "@/utils/profileImage.utils";
import type { StronLeaderboardEntry } from "@/models/stronManaged/participation";

export type LiveLeaderboardRow = {
  uid: string;
  rank: number;
  username?: string | null;
  profileImageUrl?: string | null;
  subtitle?: string | null;
  metric: string;
};

type Props = {
  title?: string;
  metricHeader?: string;
  rows: LiveLeaderboardRow[];
  myUid?: string | null;
  emptyText?: string;
  maxHeight?: number;
};

/** Shared Rank / Name / metric table — marathon, KotH, step challenge. */
const LiveLeaderboardTable = ({
  title = "Leaderboard",
  metricHeader = "King Time",
  rows,
  myUid,
  emptyText = "No rankings yet.",
  maxHeight = 420,
}: Props) => (
  <View style={styles.card}>
    <CustomText style={styles.title}>{title}</CustomText>

    <View style={styles.tableHeaderRow}>
      <CustomText style={styles.colRank}>Rank</CustomText>
      <CustomText style={styles.colName}>Name</CustomText>
      <CustomText style={styles.colMetric}>{metricHeader}</CustomText>
    </View>

    {rows.length === 0 ? (
      <CustomText style={styles.emptyText}>{emptyText}</CustomText>
    ) : (
      <ScrollView style={{ maxHeight }} nestedScrollEnabled showsVerticalScrollIndicator>
        {rows.map((row, idx) => {
          const isMe = Boolean(myUid && row.uid === myUid);
          const name = row.username?.trim() || "Participant";
          const avatar = getProfileImageSource(row.profileImageUrl, name);
          return (
            <View
              key={row.uid || `lb-${idx}`}
              style={[
                styles.row,
                isMe && styles.myRow,
              ]}
            >
              <CustomText style={styles.rowRank}>
                #{row.rank || idx + 1}
              </CustomText>
              <View style={styles.participantCell}>
                <View style={styles.avatarWrap}>
                  <Image source={avatar} style={styles.avatarImg} resizeMode="cover" />
                </View>
                <View style={styles.flex1}>
                  <CustomText style={styles.rowName} numberOfLines={1}>
                    {isMe ? "You" : name}
                  </CustomText>
                  {row.subtitle ? (
                    <CustomText style={styles.rowSubtitle} numberOfLines={1}>
                      {row.subtitle}
                    </CustomText>
                  ) : null}
                </View>
              </View>
              <CustomText
                style={styles.rowMetric}
                numberOfLines={1}
              >
                {row.metric}
              </CustomText>
            </View>
          );
        })}
      </ScrollView>
    )}
  </View>
);

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "#141416",
    paddingHorizontal: 16,
    paddingBottom: 8,
    paddingTop: 18,
  },
  title: {
    marginBottom: 14,
    fontSize: 22,
    color: "#FFFFFF",
  },
  tableHeaderRow: {
    marginBottom: 4,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
    paddingBottom: 10,
  },
  colRank: {
    width: 44,
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.55)",
  },
  colName: {
    flex: 1,
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.55)",
  },
  colMetric: {
    width: 96,
    textAlign: "right",
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.55)",
  },
  emptyText: {
    paddingVertical: 28,
    textAlign: "center",
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.45)",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
    paddingVertical: 12,
  },
  myRow: {
    marginHorizontal: -8,
    borderRadius: 10,
    backgroundColor: "rgba(8, 108, 255, 0.1)",
    paddingHorizontal: 8,
  },
  rowRank: {
    width: 44,
    fontSize: 16,
    fontWeight: "700",
    color: "#086CFF",
  },
  participantCell: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 8,
  },
  avatarWrap: {
    marginRight: 10,
    width: 36,
    height: 36,
    overflow: "hidden",
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
  },
  flex1: {
    flex: 1,
  },
  rowName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  rowSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
  },
  rowMetric: {
    width: 96,
    textAlign: "right",
    fontSize: 16,
    fontWeight: "700",
    color: "#086CFF",
  },
});

export const mapLeaderboardRows = (
  entries: StronLeaderboardEntry[],
  opts: {
    formatMetric: (entry: StronLeaderboardEntry) => string;
    formatSubtitle?: (entry: StronLeaderboardEntry) => string | null;
  },
): LiveLeaderboardRow[] =>
  (entries || []).map((entry, idx) => ({
    uid: entry.uid,
    rank: entry.rank || idx + 1,
    username: entry.username,
    profileImageUrl: entry.profileImageUrl,
    subtitle: opts.formatSubtitle?.(entry) ?? null,
    metric: opts.formatMetric(entry),
  }));

export default LiveLeaderboardTable;
