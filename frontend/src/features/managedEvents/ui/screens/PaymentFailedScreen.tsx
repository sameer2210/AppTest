import React from "react";
import { Linking, ScrollView, StatusBar, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { PressableScale, ScreenSafeArea } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { fontTextStyles, headingTextStyles } from "@/utils/typography";
import { SCREEN_HORIZONTAL_PADDING } from "@/utils/screen-layout";
import { href } from "@/navigation/href";
import {
  PaymentBackIcon,
  PaymentFailedStatusIcon,
  PaymentLockIcon,
  PaymentRefreshIcon,
} from "../components/participant/PaymentResultIcons";

const readParam = (value: string | string[] | undefined, fallback: string) =>
  typeof value === "string" && value.trim()
    ? value
    : Array.isArray(value)
      ? value[0] || fallback
      : fallback;

const formatRef = (ref: string) => {
  if (!ref || ref === "—") return ref;
  if (ref.length <= 14) return ref;
  return `${ref.slice(0, 6)}...${ref.slice(-4)}`;
};

const DetailRow = ({
  label,
  value,
  isStatus,
}: {
  label: string;
  value: string;
  isStatus?: boolean;
}) => (
  <View style={styles.detailRow}>
    <CustomText style={styles.detailLabel}>{label}</CustomText>
    <CustomText
      style={[styles.detailValue, isStatus && styles.detailValueStatus]}
      selectable
    >
      {value}
    </CustomText>
  </View>
);

const PaymentFailedScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{
    eventKey?: string;
    ticketTypeId?: string;
    planName?: string;
    amount?: string;
    status?: string;
    razorpayRef?: string;
    errorMessage?: string;
    source?: string;
    businessId?: string;
    scanId?: string;
    entityName?: string;
    title?: string;
  }>();

  const eventKey = readParam(params.eventKey, "");
  const ticketTypeId = readParam(params.ticketTypeId, "");
  const planName = readParam(params.planName, "—");
  const amount = readParam(params.amount, "—");
  const status = readParam(params.status, "Failed");
  const razorpayRef = formatRef(readParam(params.razorpayRef, "—"));
  const errorMessage = readParam(
    params.errorMessage,
    "Razorpay reported this payment as declined. No amount has been deducted.",
  );
  const title = readParam(params.title, "Payment Failed");

  const onBack = () => {
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
    if (eventKey) {
      router.replace({
        pathname: href.app.stronEvent,
        params: { key: eventKey },
      } as never);
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(href.app.home);
    }
  };

  const onRetry = () => {
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
    if (eventKey && ticketTypeId) {
      router.replace({
        pathname: href.app.reviewPayment,
        params: { eventKey, ticketTypeId },
      } as never);
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(href.app.home);
    }
  };

  const onContactSupport = () => {
    Linking.openURL("mailto:contact@stron.in?subject=Payment%20Support%20Request").catch(() => {});
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ScreenSafeArea edges={["top", "bottom"]}>
        <View style={styles.topBar}>
          <PressableScale onPress={onBack} accessibilityRole="button" accessibilityLabel="Back">
            <PaymentBackIcon />
          </PressableScale>
          <PressableScale onPress={onContactSupport} hitSlop={8}>
            <CustomText style={styles.supportLink}>
              Contact Support
            </CustomText>
          </PressableScale>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <PaymentFailedStatusIcon />
          <CustomText style={styles.titleText}>
            {title}
          </CustomText>
          <CustomText style={styles.errorText}>
            {errorMessage}
          </CustomText>

          <View style={styles.card}>
            <DetailRow label="Plan" value={planName} />
            <DetailRow label="Amount" value={amount} />
            <DetailRow label="Status" value={status} isStatus />
            <DetailRow label="Razorpay ref." value={razorpayRef} />
          </View>
        </ScrollView>

        <View style={styles.bottomBar}>
          <PressableScale
            style={styles.retryButton}
            onPress={onRetry}
          >
            <View style={styles.retryIconWrap}>
              <PaymentRefreshIcon />
            </View>
            <CustomText style={styles.retryButtonText}>Retry Payment</CustomText>
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
  supportLink: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "#FFFFFF",
    textDecorationLine: "underline",
    lineHeight: 39,
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
    marginTop: 12,
    lineHeight: 39,
  },
  errorText: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    maxWidth: 314,
    marginTop: 4,
    lineHeight: 20,
  },
  card: {
    marginTop: 24,
    width: "100%",
    maxWidth: 315,
    gap: 24,
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
  detailLabel: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "rgba(255, 255, 255, 0.6)",
    lineHeight: 20,
  },
  detailValue: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "#FFFFFF",
    lineHeight: 20,
  },
  detailValueStatus: {
    color: "#FF5555",
  },
  bottomBar: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 16,
  },
  retryButton: {
    height: 60,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#2A80FF",
  },
  retryIconWrap: {
    marginRight: 8,
  },
  retryButtonText: {
    ...fontTextStyles.sixteenMediumBlack,
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

export default PaymentFailedScreen;

