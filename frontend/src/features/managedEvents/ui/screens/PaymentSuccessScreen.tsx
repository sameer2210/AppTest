import React from "react";
import { ScrollView, StatusBar, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { PressableScale, ScreenSafeArea } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { fontTextStyles, headingTextStyles } from "@/utils/typography";
import { SCREEN_HORIZONTAL_PADDING } from "@/utils/screen-layout";
import { href } from "@/navigation/href";
import { downloadAndShareReceiptThunk } from "@/features/payments";
import { useAppDispatch } from "@/store/hooks";
import { captureEvent } from "@/analytics/posthog/events";
import { PaymentBackIcon, PaymentLockIcon, PaymentSuccessStatusIcon } from "../components/participant/PaymentResultIcons";

const readParam = (value: string | string[] | undefined, fallback: string) =>
  typeof value === "string" && value.trim()
    ? value
    : Array.isArray(value)
      ? value[0] || fallback
      : fallback;

const formatRef = (ref: string) => {
  if (!ref || ref === "—") return ref;
  if (ref.length <= 16) return ref;
  return `${ref.slice(0, 8)}...${ref.slice(-4)}`;
};

const DetailRow = ({
  label,
  value,
  isTotal,
}: {
  label: string;
  value: string;
  isTotal?: boolean;
}) => (
  <View style={styles.detailRow}>
    <CustomText
      style={[
        isTotal ? fontTextStyles.sixteenMediumBlack : fontTextStyles.sixteenNormalBlack,
        { color: isTotal ? "#FFFFFF" : "rgba(255,255,255,0.6)" },
      ]}
    >
      {label}
    </CustomText>
    <CustomText
      style={[
        isTotal ? fontTextStyles.sixteenMediumBlack : fontTextStyles.sixteenNormalBlack,
        { color: "#FFFFFF" },
      ]}
      selectable
    >
      {value}
    </CustomText>
  </View>
);

const PaymentSuccessScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{
    eventKey?: string;
    eventTitle?: string;
    planName?: string;
    ticketNumber?: string;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    paymentMethod?: string;
    dateTime?: string;
    transactionId?: string;
    totalPaid?: string;
    subtitle?: string;
    buttonLabel?: string;
    source?: string;
    businessId?: string;
    scanId?: string;
    entityName?: string;
    title?: string;
  }>();

  const eventKey = readParam(params.eventKey, "");
  const eventTitle = readParam(params.eventTitle, "Event");
  const planName = readParam(params.planName, readParam(params.eventTitle, "STRON Business"));
  const ticketNumber = readParam(params.ticketNumber, "");
  const razorpayOrderId = readParam(params.razorpayOrderId, "");
  const razorpayPaymentId = readParam(params.razorpayPaymentId, "");

  const paymentMethod = readParam(params.paymentMethod, "—");
  const dateTime = readParam(params.dateTime, "—");
  const transactionId = formatRef(
    readParam(params.transactionId, razorpayPaymentId || razorpayOrderId || ticketNumber || "—"),
  );
  const totalPaid = readParam(params.totalPaid, "—");
  const subtitle = readParam(
    params.subtitle,
    "Your payment was received. Check your plan for details.",
  );
  const buttonLabel = readParam(params.buttonLabel, "Go to Plan");
  const title = readParam(params.title, "Payment Successful");

  const goToEvent = () => {
    const source = readParam(params.source, "");
    if (source === "gym") {
      router.replace({
        pathname: href.app.checkInSelection,
        params: {
          businessId: readParam(params.businessId, ""),
          scanId: readParam(params.scanId, ""),
          entityName: readParam(params.entityName, ""),
        },
      } as never);
      return;
    }
    if (!eventKey) {
      router.replace(href.app.home);
      return;
    }
    router.replace({
      pathname: href.app.stronEvent,
      params: { key: eventKey },
    } as never);
  };

  const dispatch = useAppDispatch();
  const onDownloadReceipt = () => {
    captureEvent("receipt_downloaded", { event_key: eventKey || undefined });
    void dispatch(
      downloadAndShareReceiptThunk({
        planName,
        eventTitle,
        ticketNumber,
        paymentMethod,
        dateTime,
        transactionId: readParam(
          params.transactionId,
          razorpayPaymentId || razorpayOrderId || ticketNumber || "—",
        ),
        totalPaid,
      }),
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ScreenSafeArea edges={["top", "bottom"]}>
        <View style={styles.topBar}>
          <PressableScale onPress={goToEvent} accessibilityRole="button" accessibilityLabel="Back">
            <PaymentBackIcon />
          </PressableScale>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <PaymentSuccessStatusIcon />
          <CustomText style={styles.titleText}>
            {title}
          </CustomText>
          <CustomText style={styles.subtitleText}>
            {subtitle}
          </CustomText>

          <View style={styles.card}>
            <View style={styles.detailList}>
              <DetailRow label="Plan" value={planName} />
              <DetailRow label="Payment Method" value={paymentMethod} />
              <DetailRow label="Date & Time" value={dateTime} />
              <DetailRow label="Transaction Id" value={transactionId} />
              {ticketNumber ? <DetailRow label="Ticket Number" value={ticketNumber} /> : null}
            </View>
            <View style={styles.divider} />
            <DetailRow label="Total Paid" value={totalPaid} isTotal />
          </View>
        </ScrollView>

        <View style={styles.bottomBar}>
          <PressableScale
            style={styles.primaryButton}
            onPress={goToEvent}
          >
            <CustomText style={styles.primaryButtonText}>
              {buttonLabel}
            </CustomText>
          </PressableScale>

          <PressableScale
            style={styles.secondaryButton}
            onPress={onDownloadReceipt}
          >
            <CustomText style={styles.secondaryButtonText}>
              Download Receipt
            </CustomText>
          </PressableScale>

          <View style={styles.securityRow}>
            <PaymentLockIcon />
            <CustomText style={styles.securityText}>
              payments secured by <CustomText style={styles.securityBrand}>Razorpay</CustomText>
            </CustomText>
          </View>
        </View>
      </ScreenSafeArea>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050506",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    alignItems: "center",
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
    paddingTop: 16,
    paddingBottom: 40,
  },
  titleText: {
    ...headingTextStyles.twentyEightBoldBlack,
    color: "#FFFFFF",
    textAlign: "center",
    marginTop: 20,
  },
  subtitleText: {
    ...fontTextStyles.eighteenNormalBlack,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    maxWidth: 314,
    marginTop: 4,
  },
  card: {
    marginTop: 24,
    width: "100%",
    maxWidth: 315,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#272727",
    backgroundColor: "#141417",
    paddingHorizontal: 18,
    paddingVertical: 24,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  detailList: {
    gap: 24,
  },
  divider: {
    marginVertical: 16,
    height: 1,
    backgroundColor: "#272727",
  },
  bottomBar: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 16,
  },
  primaryButton: {
    height: 60,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#2A80FF",
  },
  primaryButtonText: {
    ...fontTextStyles.eighteenMediumBlack,
    color: "#FFFFFF",
  },
  secondaryButton: {
    marginTop: 10,
    height: 60,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#2B2B31",
  },
  secondaryButtonText: {
    ...fontTextStyles.eighteenMediumBlack,
    color: "#FFFFFF",
  },
  securityRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  securityText: {
    ...fontTextStyles.twelveNormalBlack,
    color: "#FFFFFF",
    marginLeft: 6,
  },
  securityBrand: {
    ...fontTextStyles.twelveMediumBlack,
    color: "#FFFFFF",
  },
});

export default PaymentSuccessScreen;

