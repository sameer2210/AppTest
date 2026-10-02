import { useCallback, useEffect, useState } from "react";
import { fontTextStyles } from "@/utils/typography";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { EventDetailSkeleton } from "@/components/skeletons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";
import type { StronEvent } from "@/models/stronManaged/event";
import type { StronSettlement } from "@/features/managedEvents";
import {
  fetchEvent,
  fetchSettlement,
  initSettlement,
  releaseSettlement,
} from "../../model/managedEvents.thunks";
import { useAppDispatch } from "@/store/hooks";
import {
  SCREEN_CONTENT_PADDING_TOP,
  SCREEN_CONTENT_PADDING_BOTTOM,
  screenContentContainerStyle,
} from "@/utils/screen-layout";
import { showToastMessage } from "@/utils/app-utils";
import { href } from "@/navigation/href";

const formatInr = (value: number) => `₹${Math.round(Number(value) || 0).toLocaleString("en-IN")}`;

const statusLabel = (status: string) => {
  if (status === "preview") return "Preview";
  if (status === "ready") return "Ready for payout";
  if (status === "released") return "Released";
  if (status === "pending_kyc") return "KYC required";
  if (status === "on_hold") return "On hold";
  return status;
};

const formatDate = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

/**
 * Organizer settlement screen — request payout (init) and confirm release (owner).
 */
const EventSettlementScreen = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { key } = useLocalSearchParams<{ key?: string }>();
  const eventKey = typeof key === "string" ? key : "";

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [event, setEvent] = useState<StronEvent | null>(null);
  const [settlement, setSettlement] = useState<StronSettlement | null>(null);

  const load = useCallback(async () => {
    if (!eventKey) return;
    setLoading(true);
    try {
      const ev = await dispatch(fetchEvent(eventKey)).unwrap();
      setEvent(ev);

      try {
        const sett = await dispatch(fetchSettlement(eventKey)).unwrap();
        setSettlement(sett);
      } catch {
        const gross =
          ev.ticketTypes?.reduce((sum: number, t: any) => sum + (t.price || 0) * (t.soldCount || 0), 0) ||
          (ev.ticketTypes?.[0]?.price || 0) * (ev.registrationCount || 0);
        const participants = ev.registrationCount ?? 0;
        const commission = Math.round(gross * 0.05);
        const gatewayFees = Math.round(gross * 0.02);
        const net = Math.max(0, gross - commission - gatewayFees);

        setSettlement({
          eventKey,
          status: "preview",
          participantCount: participants,
          grossTicketSales: gross,
          totalGatewayFees: gatewayFees,
          totalPlatformCommission: commission,
          totalRefunds: 0,
          netPayable: net,
        });
      }
    } catch (error) {
      showToastMessage(error instanceof Error ? error.message : "Could not load settlement.");
    } finally {
      setLoading(false);
    }
  }, [dispatch, eventKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const onRequestPayout = async () => {
    if (!eventKey || busy) return;
    setBusy(true);
    try {
      const sett = await dispatch(initSettlement(eventKey)).unwrap();
      setSettlement(sett);
      showToastMessage(
        sett.status === "released"
          ? "No payout due — marked settled."
          : "Payout requested. Status is ready.",
      );
      const ev = await dispatch(fetchEvent(eventKey)).unwrap();
      setEvent(ev);
    } catch (error) {
      const err = error as Error & { code?: string };
      if (err.code === "kyc_incomplete") {
        Alert.alert("KYC required", "Add PAN and bank details before requesting payout.", [
          { text: "Cancel", style: "cancel" },
          {
            text: "Open bank details",
            onPress: () => router.push(href.app.bankDetails as never),
          },
        ]);
      } else {
        showToastMessage(err.message || "Could not request payout.");
      }
    } finally {
      setBusy(false);
    }
  };

  const onConfirmReleased = () => {
    if (!eventKey || busy) return;
    Alert.alert(
      "Confirm payout released",
      "Mark this settlement as paid/released? Use this once the organizer payout is done.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          style: "destructive",
          onPress: () => {
            void (async () => {
              setBusy(true);
              try {
                const sett = await dispatch(releaseSettlement({ eventKey })).unwrap();
                setSettlement(sett);
                const ev = await dispatch(fetchEvent(eventKey)).unwrap();
                setEvent(ev);
                showToastMessage("Settlement marked as released.");
              } catch (error) {
                showToastMessage(
                  error instanceof Error ? error.message : "Could not release settlement.",
                );
              } finally {
                setBusy(false);
              }
            })();
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={[styles.root, { paddingTop: SCREEN_CONTENT_PADDING_TOP + 20 }]}>
        <EventDetailSkeleton />
      </View>
    );
  }

  const status = settlement?.status || "preview";
  const canInit =
    (event?.status === "completed" || event?.status === "settled") && status !== "released";
  const canRelease = status === "ready";

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: SCREEN_CONTENT_PADDING_TOP + 10 }]}>
        <PressableScale onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#D9D9D9" />
        </PressableScale>
        <CustomText style={styles.headerTitle}>Settlements</CustomText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          screenContentContainerStyle,
          {
            paddingBottom: SCREEN_CONTENT_PADDING_BOTTOM + 40,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <CustomText style={styles.eventTitle}>{event?.title || "Event"}</CustomText>
        <View style={styles.statusPill}>
          <CustomText style={styles.statusText}>{statusLabel(status)}</CustomText>
        </View>

        <View style={styles.card}>
          <CustomText style={styles.cardTitle}>Payout summary</CustomText>
          <Row label="Ticket sales" value={formatInr(settlement?.grossTicketSales || 0)} />
          <Row
            label="Platform commission"
            value={formatInr(settlement?.totalPlatformCommission || 0)}
          />
          <Row label="Gateway fees" value={formatInr(settlement?.totalGatewayFees || 0)} />
          <Row label="Refunds" value={formatInr(settlement?.totalRefunds || 0)} />
          <View style={styles.divider} />
          <Row label="Net payable" value={formatInr(settlement?.netPayable || 0)} emphasize />
          <Row label="Participants" value={String(settlement?.participantCount || 0)} />
          {settlement?.expectedReleaseBy ? (
            <Row label="Expected by" value={formatDate(settlement.expectedReleaseBy)} />
          ) : null}
          {settlement?.releasedAt ? (
            <Row label="Released on" value={formatDate(settlement.releasedAt)} />
          ) : null}
        </View>

        {status === "preview" ? (
          <CustomText style={styles.hint}>
            Request payout after the event completes. KYC (PAN + bank) is required.
          </CustomText>
        ) : null}

        {canInit && status !== "ready" ? (
          <PressableScale
            style={[styles.primaryBtn, busy && styles.btnDisabled]}
            onPress={() => void onRequestPayout()}
            disabled={busy}
          >
            <CustomText style={styles.primaryBtnText}>{busy ? "Working…" : "Request payout"}</CustomText>
          </PressableScale>
        ) : null}

        {canRelease ? (
          <>
            <PressableScale
              style={[styles.primaryBtn, busy && styles.btnDisabled]}
              onPress={onConfirmReleased}
              disabled={busy}
            >
              <CustomText style={styles.primaryBtnText}>
                {busy ? "Working…" : "Confirm payout released"}
              </CustomText>
            </PressableScale>
            <CustomText style={styles.hint}>
              Temporary: organizers can confirm release until finance admin is live.
            </CustomText>
          </>
        ) : null}

        {status === "released" ? (
          <View style={styles.doneCard}>
            <Ionicons name="checkmark-circle" size={22} color="#71BAFF" />
            <CustomText style={styles.doneText}>
              This settlement is released
              {settlement?.releaseReference ? ` (${settlement.releaseReference})` : ""}.
            </CustomText>
          </View>
        ) : null}

        {event?.status !== "completed" && event?.status !== "settled" && status === "preview" ? (
          <CustomText style={styles.hint}>Settlement unlocks when the event status is completed.</CustomText>
        ) : null}
      </ScrollView>
    </View>
  );
};

const Row = ({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) => (
  <View style={styles.row}>
    <CustomText style={[styles.rowLabel, emphasize && styles.rowEmphasize]}>{label}</CustomText>
    <CustomText style={[styles.rowValue, emphasize && styles.rowEmphasize]}>{value}</CustomText>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#090909" },
  centered: { alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#222",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    ...fontTextStyles.twentyFourNormalBlack,
    color: "#D9D9D9",
  },
  eventTitle: {
    ...fontTextStyles.twentyEightBoldBlack,
    color: "#D9D9D9",
    marginBottom: 10,
  },
  statusPill: {
    alignSelf: "flex-start",
    backgroundColor: "#086CFF",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 18,
  },
  statusText: {
    ...fontTextStyles.twelveBoldBlack,
    color: "#FFF",
  },
  card: {
    backgroundColor: "#191919",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    ...fontTextStyles.eighteenNormalBlack,
    color: "#D9D9D9",
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  rowLabel: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "rgba(255,255,255,0.55)",
  },
  rowValue: {
    ...fontTextStyles.sixteenSemiBoldBlack,
    color: "#D9D9D9",
  },
  rowEmphasize: {
    ...fontTextStyles.eighteenNormalBlack,
    color: "#71BAFF",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginVertical: 8,
  },
  primaryBtn: {
    height: 52,
    borderRadius: 40,
    backgroundColor: "#086CFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  btnDisabled: {
    ...fontTextStyles.eighteenBoldBlack,
    opacity: 0.6,
  },
  primaryBtnText: {
    ...fontTextStyles.eighteenBoldBlack,
    color: "#FFF",
  },
  hint: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "rgba(255,255,255,0.5)",
    marginBottom: 12,
  },
  doneCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#191919",
    borderRadius: 12,
    padding: 14,
  },
  doneText: {
    ...fontTextStyles.sixteenNormalBlack,
    flex: 1,
    color: "#D9D9D9",
  },
});

export default EventSettlementScreen;
