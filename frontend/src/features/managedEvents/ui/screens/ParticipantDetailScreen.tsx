import { useEffect, useMemo, useState } from "react";
import { ScrollView, StatusBar, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { ScreenSafeArea, PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { EventDetailSkeleton } from "@/components/skeletons";
import { STAGGER_MS } from "@/utils/motion";
import { useAppDispatch } from "@/store/hooks";
import { fetchEvent, fetchEventDashboard } from "../../model/managedEvents.thunks";
import {
  SCREEN_CONTENT_PADDING_BOTTOM,
  screenContentContainerStyle,
} from "@/utils/screen-layout";
import { fontTextStyles } from "@/utils/typography";
import { mapRecentRegistrations } from "../components/organize/components/mapRecentRegistrations";
import ParticipantTicketCard, { type ParticipantTicket } from "../components/preview/components/ParticipantTicketCard";

const readParam = (value: string | string[] | undefined, fallback = "") =>
  typeof value === "string" ? value : Array.isArray(value) ? value[0] || fallback : fallback;

interface CustomInfoField {
  field: string;
  value: string;
}

/**
 * Organizer view of a participant's ticket and shared purchase info.
 * Opened from Analytics → Recent Registrations or Leaderboard.
 */
const ParticipantDetailScreen = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const params = useLocalSearchParams<{
    name?: string;
    email?: string;
    contactNo?: string;
    ticketCode?: string;
    dateLabel?: string;
    timeLabel?: string;
    priceLabel?: string;
    benefits?: string;
    avatarUri?: string;
    avatarUid?: string;
    qrUri?: string;
    eventKey?: string;
    registrationId?: string;
    participantInfo?: string;
  }>();

  const name = readParam(params.name);
  const rawEmail = readParam(params.email);
  const rawContactNo = readParam(params.contactNo);
  const ticketCode = readParam(params.ticketCode);
  const dateLabel = readParam(params.dateLabel, "TBD");
  const timeLabel = readParam(params.timeLabel, "—");
  const priceLabel = readParam(params.priceLabel, "₹0");
  const benefits = readParam(params.benefits);
  const avatarUri = readParam(params.avatarUri);
  const avatarUid = readParam(params.avatarUid);
  const qrUri = readParam(params.qrUri);
  const eventKey = readParam(params.eventKey);
  const registrationId = readParam(params.registrationId);
  const rawParticipantInfo = readParam(params.participantInfo);

  const initialCustomInfo = useMemo<CustomInfoField[]>(() => {
    if (!rawParticipantInfo) return [];
    try {
      const parsed = JSON.parse(rawParticipantInfo);
      if (Array.isArray(parsed)) {
        return parsed.filter((item) => Boolean(item?.field && item?.value));
      }
    } catch {
      // ignore JSON parse error
    }
    return [];
  }, [rawParticipantInfo]);

  const [customInfo, setCustomInfo] = useState<CustomInfoField[]>(initialCustomInfo);
  const [participantEmail, setParticipantEmail] = useState<string>(rawEmail);
  const [participantPhone, setParticipantPhone] = useState<string>(rawContactNo);

  const fromParams = useMemo<ParticipantTicket | null>(() => {
    if (!name && !ticketCode && !registrationId) return null;
    return {
      id: registrationId || "primary",
      name: name || "Participant",
      ticketCode: ticketCode ? (ticketCode.startsWith("#") ? ticketCode : `#${ticketCode}`) : "#—",
      dateLabel,
      timeLabel,
      priceLabel,
      benefits: benefits || undefined,
      avatarUri: avatarUri || null,
      avatarUid: avatarUid || null,
      qrUri: qrUri || null,
    };
  }, [
    name,
    ticketCode,
    registrationId,
    dateLabel,
    timeLabel,
    priceLabel,
    benefits,
    avatarUri,
    avatarUid,
    qrUri,
  ]);

  const [fetched, setFetched] = useState<ParticipantTicket | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!eventKey && !registrationId) return;

    let cancelled = false;
    // Always attempt to fetch full registration info from dashboard if email/phone/customInfo missing
    if (!participantEmail || !participantPhone || customInfo.length === 0) {
      setLoading(!fromParams);
      void (async () => {
        try {
          const keyToUse = eventKey;
          if (!keyToUse) return;
          const [event, dashboard] = await Promise.all([
            dispatch(fetchEvent(keyToUse)).unwrap(),
            dispatch(fetchEventDashboard(keyToUse)).unwrap(),
          ]);
          const rows = mapRecentRegistrations(event, dashboard.recentRegistrations);
          const rawRow = (dashboard.recentRegistrations || []).find(
            (r) =>
              r.id === registrationId ||
              r.uid === registrationId ||
              (name && r.name.toLowerCase() === name.toLowerCase()),
          );

          if (rawRow) {
            if (rawRow.email) setParticipantEmail(rawRow.email);
            if (rawRow.contactNo) setParticipantPhone(rawRow.contactNo);
            if (Array.isArray(rawRow.participantInfo) && rawRow.participantInfo.length > 0) {
              setCustomInfo(rawRow.participantInfo);
            }
          }

          const row =
            rows.find(
              (r) =>
                r.id === registrationId ||
                r.ticketParams.registrationId === registrationId ||
                r.ticketParams.avatarUid === registrationId ||
                r.ticketParams.ticketCode === registrationId ||
                (name && r.name.toLowerCase() === name.toLowerCase()),
            ) || rows[0];

          if (cancelled) return;
          if (row) {
            setFetched({
              id: row.id,
              name: row.ticketParams.name,
              ticketCode: row.ticketParams.ticketCode,
              dateLabel: row.ticketParams.dateLabel,
              timeLabel: row.ticketParams.timeLabel,
              priceLabel: row.ticketParams.priceLabel,
              benefits: row.ticketParams.benefits,
              avatarUri: row.ticketParams.avatarUri,
              avatarUid: row.ticketParams.avatarUid,
              qrUri: row.ticketParams.qrUri,
            });
          }
        } catch {
          // fall through to empty state
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }

    return () => {
      cancelled = true;
    };
  }, [
    dispatch,
    customInfo.length,
    eventKey,
    fromParams,
    name,
    participantEmail,
    participantPhone,
    registrationId,
  ]);

  const ticket = fromParams ?? fetched;

  return (
    <ScreenSafeArea edges={["top", "bottom"]} style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          screenContentContainerStyle,
          { paddingBottom: SCREEN_CONTENT_PADDING_BOTTOM + 36 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <PressableScale
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
        </PressableScale>

        {loading ? (
          <EventDetailSkeleton />
        ) : ticket ? (
          <Animated.View
            entering={FadeInDown.duration(360).delay(STAGGER_MS)}
            style={styles.cardGap}
          >
            {/* Main Ticket Card */}
            <ParticipantTicketCard ticket={ticket} />

            {/* Shared Purchase Information Container */}
            <View style={styles.infoCard}>
              <View style={styles.infoHeaderRow}>
                <Ionicons
                  name="person-circle-outline"
                  size={22}
                  color="#086CFF"
                  style={styles.infoIcon}
                />
                <CustomText style={styles.infoHeaderText}>
                  Shared Participant Information
                </CustomText>
              </View>

              <View style={styles.divider} />

              {/* Standard Profile Fields */}
              <View style={styles.profileFieldsList}>
                <View style={styles.fieldRow}>
                  <CustomText style={styles.fieldLabel}>Full Name</CustomText>
                  <CustomText style={styles.fieldValueBold}>{ticket.name}</CustomText>
                </View>

                {participantEmail ? (
                  <View style={styles.fieldRow}>
                    <CustomText style={styles.fieldLabel}>Email</CustomText>
                    <CustomText style={styles.fieldValue}>
                      {participantEmail}
                    </CustomText>
                  </View>
                ) : null}

                {participantPhone ? (
                  <View style={styles.fieldRow}>
                    <CustomText style={styles.fieldLabel}>Contact Number</CustomText>
                    <CustomText style={styles.fieldValue}>
                      {participantPhone}
                    </CustomText>
                  </View>
                ) : null}

                <View style={styles.fieldRow}>
                  <CustomText style={styles.fieldLabel}>Ticket Code</CustomText>
                  <CustomText style={styles.fieldValueBlue}>
                    {ticket.ticketCode}
                  </CustomText>
                </View>

                <View style={styles.fieldRow}>
                  <CustomText style={styles.fieldLabel}>Amount Paid</CustomText>
                  <CustomText style={styles.fieldValueGreen}>
                    {ticket.priceLabel}
                  </CustomText>
                </View>
              </View>

              {/* Dynamic Custom Questions & Answers from Purchase Form */}
              {customInfo.length > 0 ? (
                <>
                  <View style={styles.divider} />
                  <CustomText style={styles.sectionHeading}>
                    Additional Details
                  </CustomText>
                  <View style={styles.customInfoList}>
                    {customInfo.map((info, idx) => (
                      <View
                        key={`custom-info-${idx}`}
                        style={styles.customInfoRow}
                      >
                        <CustomText style={styles.customInfoField}>
                          {info.field}
                        </CustomText>
                        <CustomText style={styles.customInfoValue}>
                          {info.value}
                        </CustomText>
                      </View>
                    ))}
                  </View>
                </>
              ) : null}
            </View>
          </Animated.View>
        ) : (
          <CustomText style={styles.emptyText}>
            No ticket details available.
          </CustomText>
        )}
      </ScrollView>
    </ScreenSafeArea>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000000",
  },
  flex: { flex: 1 },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.85)",
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  cardGap: {
    gap: 16,
  },
  infoCard: {
    backgroundColor: "#161616",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  infoHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  infoIcon: {
    marginRight: 8,
  },
  infoHeaderText: {
    ...fontTextStyles.eighteenBoldBlack,
    color: "#FFFFFF",
  },
  profileFieldsList: {
    gap: 12,
    marginVertical: 8,
  },
  fieldRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  fieldLabel: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "rgba(255, 255, 255, 0.5)",
  },
  fieldValue: {
    ...fontTextStyles.fourteenMediumBlack,
    color: "#FFFFFF",
  },
  fieldValueBold: {
    ...fontTextStyles.fourteenSemiBoldBlack,
    color: "#FFFFFF",
  },
  fieldValueBlue: {
    ...fontTextStyles.fourteenBoldBlack,
    color: "#086CFF",
  },
  fieldValueGreen: {
    ...fontTextStyles.fourteenBoldBlack,
    color: "#61DC60",
  },
  sectionHeading: {
    ...fontTextStyles.twelveSemiBoldBlack,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 12,
    marginBottom: 8,
  },
  customInfoList: {
    gap: 10,
  },
  customInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    padding: 10,
    borderRadius: 8,
  },
  customInfoField: {
    ...fontTextStyles.twelveNormalBlack,
    color: "rgba(255, 255, 255, 0.6)",
    flex: 1,
    marginRight: 8,
  },
  customInfoValue: {
    ...fontTextStyles.twelveSemiBoldBlack,
    color: "#FFFFFF",
  },
  emptyText: {
    ...fontTextStyles.fourteenNormalBlack,
    marginTop: 32,
    textAlign: "center",
    color: "rgba(255, 255, 255, 0.5)",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginVertical: 10,
  },
});

export default ParticipantDetailScreen;
