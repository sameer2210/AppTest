import { useCallback, useEffect, useMemo, useState } from "react";
import { fontTextStyles } from "@/utils/typography";
import { SCREEN_HORIZONTAL_PADDING } from "@/utils/screen-layout";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale, ScreenImageBackground } from "@/components/ui";
import CustomText from "@/components/CustomText";
import KeyboardAwareScrollView from "@/components/KeyboardAwareScrollView";
import StronBackHeader from "@/components/StronBackHeader";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { selectAuthUser } from "@/features/auth";
import { selectTodaySteps } from "@/features/steps";
import { href } from "@/navigation/href";
import {
  fetchEvent,
  fetchMyParticipantInfoPrefill,
  validateRegistrationCouponThunk,
} from "../../model/managedEvents.thunks";
import {
  createStronTicketOrderThunk,
  checkoutStronTicketOrderThunk,
  type StronTicketOrder,
} from "@/features/payments";
import type { StronEvent, StronTicketType } from "@/models/stronManaged/event";
import { showToastMessage } from "@/utils/app-utils";
import {
  preparePaymentChrome,
  restorePaymentChrome,
  waitForPaymentUiPaint,
} from "@/utils/paymentChrome";
import { formatPaymentError } from "@/utils/paymentErrors";
import { images } from "@/utils/images";
import PublishActionBar from "@/components/actionBar/PublishActionBar";
import {
  answersToPayload,
  buildParticipantInfoFieldDefs,
  buildPrefillParticipantAnswers,
  sanitizeIndianMobileDigits,
  sortAddressFields,
  validateParticipantInfoAnswersLocal,
  type ParticipantInfoFieldDef,
} from "../shared/participantInfoFields";
import { isFreeTicket } from "@/utils/stronFreeTicket";
import { MARATHON_COUPON_CODE, MARATHON_COUPON_DISCOUNT_PERCENT } from "@/constants/stron";
import { SCREEN_CONTENT_PADDING_BOTTOM, SCREEN_CONTENT_PADDING_TOP } from "@/utils/screen-layout";

const BG_GRADIENT_COLORS = [
  "rgba(10, 92, 255, 0.85)",
  "rgba(8, 65, 190, 0.55)",
  "rgba(4, 15, 45, 0.88)",
  "#04060A",
  "#000000",
] as const;
const BG_GRADIENT_LOCATIONS = [0, 0.22, 0.48, 0.78, 1] as const;

const formatInr = (value?: number | null) =>
  `₹${Math.round(Number(value) || 0).toLocaleString("en-IN")}`;

const normalizeCouponCode = (value?: string | null) =>
  String(value || "")
    .trim()
    .toUpperCase();

type CouponUiState = "idle" | "applied" | "failed";

const BreakdownRow = ({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) => (
  <View style={styles.breakdownRow}>
    <CustomText style={[styles.breakdownLabel, emphasize && styles.breakdownLabelEmph]}>{label}</CustomText>
    <CustomText style={[styles.breakdownValue, emphasize && styles.breakdownValueEmph]}>{value}</CustomText>
  </View>
);

const ReviewPaymentScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, StatusBar.currentHeight ?? 0);
  const user = useAppSelector(selectAuthUser);
  const todaySteps = useAppSelector(selectTodaySteps);
  const dispatch = useAppDispatch();
  const params = useLocalSearchParams<{ eventKey?: string; ticketTypeId?: string }>();
  const eventKey = typeof params.eventKey === "string" ? params.eventKey : "";
  const ticketTypeId = typeof params.ticketTypeId === "string" ? params.ticketTypeId : "";

  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [event, setEvent] = useState<StronEvent | null>(null);
  const [ticket, setTicket] = useState<StronTicketType | null>(null);
  const [order, setOrder] = useState<StronTicketOrder | null>(null);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [dropdownField, setDropdownField] = useState<ParticipantInfoFieldDef | null>(null);

  const [couponInput, setCouponInput] = useState("");
  const [couponState, setCouponState] = useState<CouponUiState>("idle");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponDiscountPercent, setCouponDiscountPercent] = useState(0);
  const [couponBusy, setCouponBusy] = useState(false);
  const [previewBreakdown, setPreviewBreakdown] = useState<Record<string, number> | null>(null);

  const fieldDefs = useMemo(
    () => buildParticipantInfoFieldDefs(event?.participantInfoFields),
    [event?.participantInfoFields],
  );

  const infoFields = useMemo(() => fieldDefs.filter((f) => f.section !== "address"), [fieldDefs]);
  const addressFields = useMemo(
    () => sortAddressFields(fieldDefs.filter((f) => f.section === "address")),
    [fieldDefs],
  );
  const addressFullFields = useMemo(
    () => addressFields.filter((f) => !f.halfWidth),
    [addressFields],
  );
  const addressHalfFields = useMemo(
    () => addressFields.filter((f) => f.halfWidth),
    [addressFields],
  );

  const openTerms = () => {
    router.push({
      pathname: href.app.policyWebView,
      params: { policy: "terms-and-conditions" },
    } as never);
  };

  const loadEvent = useCallback(async () => {
    if (!eventKey || !ticketTypeId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [nextEvent, priorInfo] = await Promise.all([
        dispatch(fetchEvent(eventKey)).unwrap(),
        dispatch(fetchMyParticipantInfoPrefill())
          .unwrap()
          .catch(() => []),
      ]);
      const nextTicket = nextEvent.ticketTypes?.find((item) => item.id === ticketTypeId) || null;
      if (!nextTicket) throw new Error("Selected ticket is no longer available.");
      setEvent(nextEvent);
      setTicket(nextTicket);
      setOrder(null);
      setPreviewBreakdown(null);

      const defs = buildParticipantInfoFieldDefs(nextEvent.participantInfoFields);
      setAnswers(buildPrefillParticipantAnswers(defs, user, priorInfo));
    } catch (error) {
      showToastMessage((error as Error)?.message || "Could not load registration.");
      router.back();
    } finally {
      setLoading(false);
    }
    // Prefill reads current auth user once per event/ticket load.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- avoid reload loops on user object identity
  }, [eventKey, router, ticketTypeId]);

  useEffect(() => {
    void loadEvent();
  }, [loadEvent]);

  const ticketIsFree = useMemo(
    () => (ticket ? isFreeTicket(ticket, event) : false),
    [ticket, event],
  );

  const breakdown = useMemo(() => {
    const source = order?.breakdown || previewBreakdown || {};
    if (ticketIsFree) {
      return {
        subtotal: 0,
        convenienceFee: 0,
        couponDiscount: 0,
        taxes: 0,
        totalCharged: 0,
      };
    }
    const original = Number(source.originalTicketPrice) || Number(ticket?.price) || 0;
    const registrationFee =
      source.ticketPrice != null && Number.isFinite(Number(source.ticketPrice))
        ? Number(source.ticketPrice)
        : Math.max(0, original - (Number(source.couponDiscount) || couponDiscount || 0));
    const taxes = Number(source.taxes ?? source.tax) || 0;
    const gatewayFee = Number(source.gatewayFee) || 0;
    const discount = Number(source.couponDiscount) || couponDiscount || 0;
    // Prefer nullish checks — `0 || fallback` wrongly treated free totals as missing.
    const totalCharged =
      source.totalCharged != null && Number.isFinite(Number(source.totalCharged))
        ? Number(source.totalCharged)
        : registrationFee + taxes + gatewayFee;

    return {
      subtotal: original || registrationFee + discount,
      convenienceFee: gatewayFee,
      couponDiscount: discount,
      taxes,
      totalCharged,
    };
  }, [order, previewBreakdown, ticket, couponDiscount, ticketIsFree]);

  const setAnswer = (field: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [field]: value }));
  };

  const applyCouponLocally = (rawCode: string) => {
    const code = normalizeCouponCode(rawCode);
    const envCode = normalizeCouponCode(MARATHON_COUPON_CODE);
    const percent = MARATHON_COUPON_DISCOUNT_PERCENT;
    const price = Math.max(0, Number(ticket?.price) || 0);

    if (!envCode || !percent) {
      throw new Error("Coupon is not configured in the app.");
    }
    if (code !== envCode) {
      throw new Error("Invalid coupon code.");
    }
    if (!(price > 0)) {
      throw new Error("Coupons cannot be applied to free tickets.");
    }

    const discountRupees = Math.min(price, Math.round((price * percent) / 100));
    if (!(discountRupees > 0)) {
      throw new Error("This coupon has no remaining value.");
    }

    const netTicketPrice = Math.max(0, price - discountRupees);
    setAppliedCoupon(code);
    setCouponDiscount(discountRupees);
    setCouponDiscountPercent(percent);
    setPreviewBreakdown({
      originalTicketPrice: price,
      ticketPrice: netTicketPrice,
      couponDiscount: discountRupees,
      couponDiscountPercent: percent,
      gatewayFee: 0,
      taxes: 0,
      totalCharged: netTicketPrice,
    });
    setCouponState("applied");
    setOrder(null);
    showToastMessage(`Coupon applied — ${percent}% off`);
  };

  const onApplyCoupon = async () => {
    if (!eventKey || !ticketTypeId || couponBusy) return;
    const code = couponInput.trim();
    if (!code) {
      showToastMessage("Enter a coupon code.");
      return;
    }
    setCouponBusy(true);
    try {
      const envCode = normalizeCouponCode(MARATHON_COUPON_CODE);
      const isEnvCoupon =
        Boolean(envCode) &&
        normalizeCouponCode(code) === envCode &&
        MARATHON_COUPON_DISCOUNT_PERCENT > 0;

      // Apply .env coupon locally first so checkout updates even if apidev
      // doesn't have MARATHON_COUPON_DISCOUNT_PERCENT yet.
      if (isEnvCoupon) {
        applyCouponLocally(code);
        try {
          const result = await dispatch(
            validateRegistrationCouponThunk({
              eventKey,
              ticketTypeId,
              code,
            }),
          ).unwrap();
          const percent = Number(result.discountPercent) || MARATHON_COUPON_DISCOUNT_PERCENT;
          setAppliedCoupon(result.couponCode || envCode);
          setCouponDiscount(result.discountRupees);
          setCouponDiscountPercent(percent);
          if (result.breakdown) setPreviewBreakdown(result.breakdown);
        } catch {
          // Keep local preview — order creation still sends the code.
        }
        return;
      }

      const result = await dispatch(
        validateRegistrationCouponThunk({
          eventKey,
          ticketTypeId,
          code,
        }),
      ).unwrap();
      const percent =
        Number(result.discountPercent) ||
        (Number(ticket?.price) > 0
          ? Math.round((result.discountRupees / Number(ticket?.price)) * 100)
          : 0);
      setAppliedCoupon(result.couponCode);
      setCouponDiscount(result.discountRupees);
      setCouponDiscountPercent(percent);
      setPreviewBreakdown(result.breakdown || null);
      setCouponState("applied");
      setOrder(null);
      showToastMessage(
        percent > 0 ? `Coupon applied — ${percent}% off` : "Coupon applied successfully",
      );
    } catch (error) {
      setAppliedCoupon(null);
      setCouponDiscount(0);
      setCouponDiscountPercent(0);
      setPreviewBreakdown(null);
      setCouponState("failed");
      setOrder(null);
      showToastMessage(error instanceof Error ? error.message : "Invalid coupon code.");
    } finally {
      setCouponBusy(false);
    }
  };

  const onBuy = async () => {
    if (paying || !event || !ticket) return;

    const validationError = validateParticipantInfoAnswersLocal(answers, fieldDefs);
    if (validationError) {
      showToastMessage(validationError);
      return;
    }
    if (!termsAccepted) {
      showToastMessage("Please accept the Terms & Conditions to continue.");
      return;
    }

    setPaying(true);
    await waitForPaymentUiPaint();
    try {
      const participantInfo = answersToPayload(answers, fieldDefs);
      const nextOrder = await dispatch(
        createStronTicketOrderThunk({
          eventKey,
          ticketTypeId,
          currentStepCount: todaySteps,
          participantInfo,
          couponCode: appliedCoupon,
        }),
      ).unwrap();
      setOrder(nextOrder);

      const orderAmount = Number(nextOrder.amount);
      const claimAsFree =
        nextOrder.free === true ||
        ticketIsFree ||
        (Number.isFinite(orderAmount) && orderAmount <= 0);

      if (claimAsFree) {
        // Never open Razorpay for free tickets (₹0 / Free label / free markers).
        if (!nextOrder.free && ticketIsFree && Number.isFinite(orderAmount) && orderAmount > 0) {
          throw new Error(
            "This ticket is free but the server started a paid checkout. Pull to refresh and try again.",
          );
        }
        await restorePaymentChrome();
        setPaying(false);
        showToastMessage("You're registered!");
        // Pop back to the existing event screen so focus refresh hides Buy Ticket.
        // replace() alone can leave a stale ParticipantEvent instance stacked underneath.
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace({
            pathname: href.app.stronEvent,
            params: { key: eventKey },
          } as never);
        }
        return;
      }

      await preparePaymentChrome();
      const result = await dispatch(
        checkoutStronTicketOrderThunk({
          order: nextOrder,
          prefill: {
            prefillName: user?.username || undefined,
            prefillEmail: user?.email || undefined,
            prefillContact: user?.contactNo || undefined,
          },
        }),
      ).unwrap();

      if (!result.participation) {
        throw new Error("Payment is processing. Your ticket will appear once Razorpay confirms.");
      }

      const now = new Date();
      const formattedDateTime = `${now.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      })}, ${now.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })}`;

      router.replace({
        pathname: href.app.paymentSuccess,
        params: {
          eventKey,
          eventTitle: event?.title || "Event",
          planName: `${event?.title || "Event"} - ${ticket?.label || "Ticket"}`,
          ticketNumber: result.ticketNumber || result.participation.ticketNumber || "",
          razorpayOrderId: result.razorpayOrderId || nextOrder.orderId || "",
          razorpayPaymentId: result.razorpayPaymentId || "",
          paymentMethod: "Razorpay (Online)",
          dateTime: formattedDateTime,
          transactionId:
            result.razorpayPaymentId || result.razorpayOrderId || nextOrder.orderId || "",
          totalPaid: formatInr(breakdown.totalCharged),
          subtitle: `Your payment was successful and your ticket for ${event?.title || "Event"} is confirmed.`,
          buttonLabel: "View my ticket",
        },
      } as never);
    } catch (error) {
      const friendly = formatPaymentError(error);
      await restorePaymentChrome();
      setPaying(false);

      const msg = (error as Error)?.message || "";

      // Free / validation errors stay on this screen — never the Razorpay failure page.
      if (
        ticketIsFree ||
        /fill in|invalid|coupon|terms|free ticket|registered|sold out|organizer/i.test(msg)
      ) {
        if (msg && !/razorpay|checkout|cancelled/i.test(msg)) {
          showToastMessage(msg);
          return;
        }
        if (ticketIsFree) {
          showToastMessage(msg || "Could not complete free registration. Please try again.");
          return;
        }
      }

      router.replace({
        pathname: href.app.paymentFailed,
        params: {
          eventKey,
          ticketTypeId,
          planName: `${event?.title || "Event"} - ${ticket?.label || "Ticket"}`,
          amount: formatInr(breakdown.totalCharged),
          status: friendly.kind === "cancelled" ? "Cancelled" : "Declined",
          razorpayRef: order?.orderId || "—",
          errorMessage:
            friendly.kind === "cancelled"
              ? "Payment checkout was closed by user. No amount has been deducted."
              : "Razorpay reported this payment as declined. No amount has been deducted.",
        },
      } as never);
    }
  };

  const renderField = (def: ParticipantInfoFieldDef, forceFullWidth?: boolean) => {
    const value = answers[def.field] || "";
    const useHalf = Boolean(def.halfWidth) && !forceFullWidth;

    if (def.type === "select") {
      return (
        <View key={def.field} style={[styles.fieldBlock, useHalf && styles.halfField]}>
          <CustomText style={styles.fieldLabel}>{def.field}</CustomText>
          <PressableScale style={styles.inputBox} onPress={() => setDropdownField(def)}>
            <CustomText style={value ? styles.inputValue : styles.inputPlaceholder} numberOfLines={1}>
              {value || `Select ${def.field}`}
            </CustomText>
            <Ionicons name="chevron-down" size={18} color="rgba(255,255,255,0.55)" />
          </PressableScale>
        </View>
      );
    }

    if (def.type === "phone") {
      return (
        <View key={def.field} style={[styles.fieldBlock, useHalf && styles.halfField]}>
          <CustomText style={styles.fieldLabel}>{def.field}</CustomText>
          <View style={styles.phoneRow}>
            <View style={styles.phonePrefix}>
              <CustomText style={styles.phonePrefixText}>+91</CustomText>
            </View>
            <TextInput
              value={value}
              onChangeText={(text) => setAnswer(def.field, sanitizeIndianMobileDigits(text))}
              placeholder="10-digit mobile"
              placeholderTextColor="rgba(255,255,255,0.35)"
              keyboardType="phone-pad"
              maxLength={10}
              style={styles.phoneInput}
            />
          </View>
        </View>
      );
    }

    return (
      <View key={def.field} style={[styles.fieldBlock, useHalf && styles.halfField]}>
        <CustomText style={styles.fieldLabel}>{def.field}</CustomText>
        <TextInput
          value={value}
          onChangeText={(text) => {
            if (def.type === "number") {
              setAnswer(def.field, text.replace(/\D/g, "").slice(0, 6));
              return;
            }
            setAnswer(def.field, text);
          }}
          placeholder=""
          placeholderTextColor="rgba(255,255,255,0.35)"
          keyboardType={def.type === "number" ? "number-pad" : "default"}
          maxLength={def.type === "number" ? 6 : undefined}
          style={styles.textInput}
        />
      </View>
    );
  };

  const couponPillLabel =
    couponState === "applied"
      ? "Applied"
      : couponState === "failed"
        ? "Failed, Retry"
        : couponBusy
          ? "…"
          : "Apply";
  const couponPillColor =
    couponState === "applied" ? "#2DE441" : couponState === "failed" ? "#FF6B7A" : "#000000";

  return (
    <View style={styles.root}>
      <ScreenImageBackground source={images.HOME_V2.BG} edgeToEdge />
      <LinearGradient
        colors={BG_GRADIENT_COLORS}
        locations={BG_GRADIENT_LOCATIONS}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {loading ? (
        <View style={[styles.centered, { paddingTop: topInset + 12 }]}>
          <ActivityIndicator color="#D9D9D9" size="large" />
          <CustomText style={styles.loadingText}>Preparing registration…</CustomText>
        </View>
      ) : (
        <View style={styles.body}>
          <KeyboardAwareScrollView
            style={styles.scroll}
            contentContainerStyle={[
              styles.content,
              {
                paddingTop: topInset + 12,
                paddingBottom: 130 + Math.max(insets.bottom, 16),
              },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            enableOnAndroid
            extraScrollHeight={120}
            enableResetScrollToCoords={false}
          >
            <View style={styles.headerInner}>
              <StronBackHeader
                align="inline"
                title="Required From Participants"
                onBack={() => router.back()}
              />
            </View>

            {infoFields.map((def) => renderField(def))}

            {addressFields.length > 0 ? (
              <>
                <View style={styles.sectionRule} />
                <CustomText style={styles.sectionTitle}>Address</CustomText>
                {addressFullFields.map((def) => renderField(def, true))}
                {addressHalfFields.length > 0 ? (
                  <View style={styles.addressHalfRow}>
                    {addressHalfFields.map((def) => renderField(def))}
                  </View>
                ) : null}
              </>
            ) : null}

            <View style={styles.sectionRule} />

            {/* Coupon */}
            <View style={styles.fieldBlock}>
              <CustomText style={styles.fieldLabel}>Apply Coupon Code</CustomText>
              <View style={styles.couponBox}>
                <TextInput
                  value={couponInput}
                  onChangeText={(text) => {
                    setCouponInput(text.toUpperCase());
                    if (couponState !== "idle") {
                      setCouponState("idle");
                      setAppliedCoupon(null);
                      setCouponDiscount(0);
                      setCouponDiscountPercent(0);
                      setPreviewBreakdown(null);
                      setOrder(null);
                    }
                  }}
                  autoCapitalize="characters"
                  placeholder="Enter code"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  style={styles.couponInput}
                />
                <PressableScale
                  onPress={() => void onApplyCoupon()}
                  disabled={couponBusy}
                  style={styles.couponPill}
                >
                  <CustomText style={[styles.couponPillText, { color: couponPillColor }]}>
                    {couponPillLabel}
                  </CustomText>
                </PressableScale>
              </View>
              {couponState === "applied" && appliedCoupon ? (
                <CustomText style={styles.couponAppliedHint}>
                  {appliedCoupon}
                  {couponDiscountPercent > 0 ? ` · ${couponDiscountPercent}% off` : ""}
                </CustomText>
              ) : null}
            </View>

            {/* Terms */}
            <View style={styles.termsRow}>
              <PressableScale
                onPress={() => setTermsAccepted((v) => !v)}
                style={styles.termsCheckHit}
              >
                <View style={[styles.termsCheck, termsAccepted && styles.termsCheckOn]}>
                  {termsAccepted ? <CustomText style={styles.termsCheckMark}>✓</CustomText> : null}
                </View>
              </PressableScale>
              <CustomText style={styles.termsText}>
                I confirm that all information provided is accurate. I agree to STRON&apos;s{" "}
                <CustomText style={styles.termsLink} onPress={openTerms} accessibilityRole="link">
                  Terms and Policies
                </CustomText>
                .
              </CustomText>
            </View>

            {/* Checkout Summary */}
            <View style={styles.summaryCard}>
              <CustomText style={styles.summaryTitle}>Checkout Summary</CustomText>
              <BreakdownRow label="Subtotal" value={formatInr(breakdown.subtotal)} />
              <BreakdownRow
                label="Convenience Fee"
                value={
                  breakdown.convenienceFee === 0 ? "₹0.00" : formatInr(breakdown.convenienceFee)
                }
              />
              {breakdown.couponDiscount > 0 ? (
                <BreakdownRow
                  label={
                    couponDiscountPercent > 0
                      ? `Discount Coupon (${couponDiscountPercent}%)`
                      : "Discount Coupon"
                  }
                  value={`-${formatInr(breakdown.couponDiscount)}`}
                />
              ) : (
                <BreakdownRow label="Discount Coupon" value="-₹0" />
              )}
              <BreakdownRow label="Taxes" value={formatInr(breakdown.taxes)} />
              <View style={styles.summaryDivider} />
              <BreakdownRow label="Total" value={formatInr(breakdown.totalCharged)} emphasize />
            </View>
          </KeyboardAwareScrollView>

          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <PublishActionBar
              label={breakdown.totalCharged > 0 ? "Buy Now" : "Register"}
              onPress={() => void onBuy()}
              loading={paying}
              disabled={paying || !ticket}
              arrow="right"
              variant="glass"
              circleVariant="white"
            />
          </View>
        </View>
      )}

      <Modal
        visible={Boolean(dropdownField)}
        transparent
        animationType="fade"
        onRequestClose={() => setDropdownField(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setDropdownField(null)}>
          <Pressable style={styles.dropdownCard} onPress={() => {}}>
            <CustomText style={styles.dropdownTitle}>Select {dropdownField?.field || "option"}</CustomText>
            <ScrollView
              style={styles.dropdownScroll}
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
            >
              {(dropdownField?.options || []).map((opt) => (
                <PressableScale
                  key={opt}
                  style={styles.dropdownOption}
                  onPress={() => {
                    if (dropdownField) setAnswer(dropdownField.field, opt);
                    setDropdownField(null);
                  }}
                >
                  <CustomText style={styles.dropdownOptionText}>{opt}</CustomText>
                </PressableScale>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "transparent" },
  body: { flex: 1 },
  scroll: { flex: 1 },
  headerInner: {
    marginHorizontal: -4,
    marginBottom: 14,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  loadingText: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 16,
  },
  content: { paddingHorizontal: SCREEN_HORIZONTAL_PADDING, flexGrow: 1 },
  fieldBlock: { marginBottom: 16, width: "100%" },
  halfField: { width: "48%" },
  fieldLabel: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "#FFFFFF",
    marginBottom: 8,
  },
  inputBox: {
    height: 48,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.2)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  inputValue: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "#FFFFFF",
    flex: 1,
    marginRight: 8,
  },
  inputPlaceholder: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "rgba(255,255,255,0.45)",
    flex: 1,
    marginRight: 8,
  },
  textInput: {
    ...fontTextStyles.sixteenNormalBlack,
    height: 48,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.2)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 14,
    color: "#FFFFFF",
  },
  phoneRow: {
    height: 48,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.2)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.12)",
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
  phonePrefix: {
    height: "100%",
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  phonePrefixText: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "#FFFFFF",
  },
  phoneInput: {
    ...fontTextStyles.sixteenNormalBlack,
    flex: 1,
    height: "100%",
    paddingHorizontal: 14,
    color: "#FFFFFF",
  },
  sectionRule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginVertical: 14,
    marginHorizontal: -4,
  },
  sectionTitle: {
    ...fontTextStyles.twentyFourNormalBlack,
    color: "#FFFFFF",
    marginBottom: 14,
    marginTop: 4,
  },
  addressHalfRow: {
    flexDirection: "row",
    flexWrap: "nowrap",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  couponBox: {
    height: 48,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.2)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.12)",
    paddingLeft: 14,
    paddingRight: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  couponInput: {
    ...fontTextStyles.fourteenNormalBlack,
    flex: 1,
    color: "#FFFFFF",
    paddingVertical: 0,
  },
  couponPill: {
    minWidth: 68,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  couponPillText: { ...fontTextStyles.fourteenSemiBoldBlack },
  couponAppliedHint: {
    ...fontTextStyles.fourteenSemiBoldBlack,
    marginTop: 8,
    color: "#2DE441",
  },
  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 18,
    marginTop: 4,
  },
  termsCheckHit: { paddingTop: 2 },
  termsCheck: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  termsCheckOn: {
    ...fontTextStyles.twelveNormalBlack,
    backgroundColor: "#086CFF",
    borderColor: "#086CFF",
  },
  termsCheckMark: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "#FFFFFF",
  },
  termsText: {
    ...fontTextStyles.sixteenNormalBlack,
    flex: 1,
    color: "rgba(255,255,255,0.85)",
  },
  termsLink: {
    color: "#71BAFF",
    textDecorationLine: "underline",
  },
  summaryCard: {
    backgroundColor: "#191919",
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 20,
    marginBottom: 16,
  },
  summaryTitle: {
    ...fontTextStyles.eighteenNormalBlack,
    color: "#FFFFFF",
    marginBottom: 14,
  },
  summaryDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginVertical: 10,
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  breakdownLabel: {
    ...fontTextStyles.eighteenLightBlack,
    color: "#FFFFFF",
  },
  breakdownLabelEmph: {
    ...fontTextStyles.twentySemiBoldBlack,
    color: "#FFFFFF",
  },
  breakdownValue: {
    ...fontTextStyles.eighteenNormalBlack,
    color: "#FFFFFF",
  },
  breakdownValueEmph: {
    ...fontTextStyles.twentyFourSemiBoldBlack,
    color: "#FFFFFF",
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: "transparent",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  dropdownCard: {
    backgroundColor: "#1A1A1C",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingVertical: 14,
    paddingHorizontal: 16,
    maxHeight: "70%",
  },
  dropdownScroll: { maxHeight: 360 },
  dropdownTitle: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "rgba(255,255,255,0.55)",
    marginBottom: 10,
  },
  dropdownOption: {
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  dropdownOptionText: {
    ...fontTextStyles.eighteenNormalBlack,
    color: "#FFFFFF",
  },
});

export default ReviewPaymentScreen;
