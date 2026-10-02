import React, { memo, useMemo, useState } from "react";
import { StyleSheet, Switch, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { fontTextStyles, headingTextStyles } from "@/utils/typography";

export type MembershipPlan = {
  id: string;
  businessId?: string;
  name: string;
  billingText: string;
  isBought?: boolean;
  isExpired?: boolean;
  isPendingActivation?: boolean;
  statusText?: string;
  price: string;
  originalPrice?: string;
  tags?: string[];
  actionText?:
    | "Check In"
    | "Upgrade"
    | "Choose Plan"
    | "Buy Plan"
    | "Check In to Activate"
    | "Start Free Trial"
    | "Pay to continue"
    | "Register"
    | (string & {});
  billingCycle?: string | null;
  membershipId?: string;
  autoRenew?: boolean;
  endDate?: string;
  isFreeTrial?: boolean;
  isServiceTag?: boolean;
  isRegistration?: boolean;
  trialDuration?: number;
};

type Props = {
  plan: MembershipPlan;
  onCheckIn?: (plan: MembershipPlan) => void;
  onSelectPlan?: (plan: MembershipPlan) => void;
  onAutoRenewChange?: (plan: MembershipPlan, enabled: boolean) => void;
  autoRenewBusy?: boolean;
};

const isRecurringGymPlan = (plan: MembershipPlan) => {
  if (plan.isServiceTag || plan.isFreeTrial) return false;
  const cycle = String(plan.billingCycle || "").toUpperCase();
  return cycle === "MONTHLY" || cycle === "QUARTERLY" || cycle === "YEARLY";
};

const formatEndDate = (iso?: string) => {
  if (!iso) return "the current plan end date";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "the current plan end date";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const PlanSelectionCard: React.FC<Props> = memo(
  ({ plan, onCheckIn, onSelectPlan, onAutoRenewChange, autoRenewBusy }) => {
    const isStartTrial =
      plan.actionText === "Start Free Trial" ||
      (plan.isFreeTrial && !plan.isBought && !plan.isExpired);
    const isPayToContinue = plan.actionText === "Pay to continue";
    const isCheckIn =
      !isStartTrial &&
      !isPayToContinue &&
      (plan.actionText === "Check In" ||
        plan.actionText === "Check In to Activate" ||
        (plan.isBought && !plan.isExpired));
    const buttonLabel =
      plan.actionText === "Upgrade"
        ? "Upgrade"
        : isStartTrial
          ? "Start Free Trial"
          : isPayToContinue
            ? "Pay to continue"
            : isCheckIn
              ? plan.actionText === "Check In to Activate"
                ? "Check In to Activate"
                : "Check In"
              : "Buy Plan";

    const recurring = isRecurringGymPlan(plan);
    const showOwnedToggle = Boolean(isCheckIn && plan.membershipId && recurring);
    const showCheckoutOptIn = Boolean(!isCheckIn && recurring && !plan.isServiceTag);
    const [checkoutAutoRenew, setCheckoutAutoRenew] = useState(true);

    const autoRenewCopy = useMemo(() => {
      if (plan.autoRenew) return "Auto-renews 1 day before expiry";
      return `Access continues until ${formatEndDate(plan.endDate)}`;
    }, [plan.autoRenew, plan.endDate]);

    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.planInfo}>
            <CustomText style={styles.planName}>{plan.name}</CustomText>
            <CustomText style={styles.billingText}>
              {plan.billingText}
              {plan.isBought && !plan.isExpired && (
                <CustomText style={styles.alreadyBought}>{" • Already Bought"}</CustomText>
              )}
              {plan.isExpired && (
                <CustomText style={styles.expired}>{"  Expired"}</CustomText>
              )}
            </CustomText>
            {plan.statusText ? (
              <CustomText style={styles.statusText}>{plan.statusText}</CustomText>
            ) : null}
          </View>

          <View style={styles.priceBlock}>
            {plan.originalPrice ? (
              <CustomText style={styles.originalPrice}>
                {plan.originalPrice}
              </CustomText>
            ) : null}
            <CustomText style={styles.price}>{plan.price}</CustomText>
          </View>
        </View>

        {plan.tags && plan.tags.length > 0 ? (
          <View style={styles.tagsRow}>
            {plan.tags.map((tag) => (
              <View
                key={tag}
                style={styles.tag}
              >
                <CustomText style={styles.tagText}>{tag}</CustomText>
              </View>
            ))}
          </View>
        ) : null}

        {showOwnedToggle ? (
          <View style={styles.autoRenewRow}>
            <View style={styles.autoRenewInfo}>
              <CustomText style={styles.autoRenewTitle}>Auto-renew</CustomText>
              <CustomText style={styles.autoRenewSubtitle}>{autoRenewCopy}</CustomText>
            </View>
            <Switch
              value={Boolean(plan.autoRenew)}
              onValueChange={(next) => onAutoRenewChange?.(plan, next)}
              disabled={Boolean(autoRenewBusy)}
              trackColor={{ false: "rgba(255,255,255,0.18)", true: "#1E65FF" }}
              thumbColor="#FFFFFF"
            />
          </View>
        ) : null}

        {showCheckoutOptIn ? (
          <PressableScale
            onPress={() => setCheckoutAutoRenew((prev) => !prev)}
            style={styles.optInRow}
          >
            <Ionicons
              name={checkoutAutoRenew ? "checkbox" : "square-outline"}
              size={22}
              color={checkoutAutoRenew ? "#1E65FF" : "rgba(255,255,255,0.55)"}
            />
            <View style={styles.optInInfo}>
              <CustomText style={styles.autoRenewTitle}>
                Auto-renew this plan
              </CustomText>
              <CustomText style={styles.autoRenewSubtitle}>
                Renews 1 day before expiry. You can turn this off later.
              </CustomText>
            </View>
          </PressableScale>
        ) : null}

        <View style={styles.buttonContainer}>
          {isCheckIn ? (
            <PressableScale
              onPress={() => onCheckIn?.(plan)}
              style={styles.checkInButton}
            >
              <CustomText style={styles.buttonText}>{buttonLabel}</CustomText>
            </PressableScale>
          ) : plan.isFreeTrial && plan.isExpired ? (
            <View style={styles.disabledButton}>
              <CustomText style={styles.disabledButtonText}>Trial unavailable</CustomText>
            </View>
          ) : (
            <PressableScale
              onPress={() =>
                onSelectPlan?.({
                  ...plan,
                  autoRenew: showCheckoutOptIn ? checkoutAutoRenew : false,
                })
              }
              style={styles.selectPlanButton}
            >
              <CustomText style={styles.buttonText}>{buttonLabel}</CustomText>
            </PressableScale>
          )}
        </View>
      </View>
    );
  },
);

PlanSelectionCard.displayName = "PlanSelectionCard";

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    width: "100%",
    borderRadius: 22,
    backgroundColor: "#12141C",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 20,
    elevation: 8,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  planInfo: {
    flex: 1,
    paddingRight: 8,
  },
  planName: {
    ...headingTextStyles.h3,
    fontSize: 22,
    color: "#FFFFFF",
  },
  billingText: {
    marginTop: 4,
    ...fontTextStyles.regular,
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.6)",
  },
  alreadyBought: {
    ...fontTextStyles.semiBold,
    color: "#22C55E",
  },
  expired: {
    ...fontTextStyles.semiBold,
    color: "#EF4444",
  },
  statusText: {
    marginTop: 4,
    ...fontTextStyles.regular,
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
  },
  priceBlock: {
    alignItems: "flex-end",
  },
  originalPrice: {
    ...fontTextStyles.regular,
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.4)",
    textDecorationLine: "line-through",
  },
  price: {
    ...headingTextStyles.h3,
    fontSize: 22,
    color: "#FFFFFF",
  },
  tagsRow: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  tagText: {
    ...fontTextStyles.medium,
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
  },
  autoRenewRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  autoRenewInfo: {
    flex: 1,
    paddingRight: 12,
  },
  autoRenewTitle: {
    ...fontTextStyles.semiBold,
    fontSize: 14,
    color: "#FFFFFF",
  },
  autoRenewSubtitle: {
    marginTop: 2,
    ...fontTextStyles.regular,
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.55)",
  },
  optInRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  optInInfo: {
    marginLeft: 12,
    flex: 1,
  },
  buttonContainer: {
    marginTop: 20,
  },
  checkInButton: {
    height: 48,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#1E65FF",
    elevation: 6,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  disabledButton: {
    height: 48,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  selectPlanButton: {
    height: 48,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  buttonText: {
    ...fontTextStyles.bold,
    fontSize: 16,
    color: "#FFFFFF",
  },
  disabledButtonText: {
    ...fontTextStyles.bold,
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.5)",
  },
});

export default PlanSelectionCard;
