import { useCallback, useState } from "react";
import RazorpayCheckout from "react-native-razorpay";
import { useRouter } from "expo-router";
import { purchaseGymPlan, verifyGymOnlinePayment } from "@/features/gymBusiness";
import { showToastMessage } from "@/utils/app-utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectAuthUser } from "@/features/auth";
import { href } from "@/navigation/href";
import {
  preparePaymentChrome,
  restorePaymentChrome,
  waitForPaymentUiPaint,
} from "@/utils/paymentChrome";

export type GymPlanPurchaseInput = {
  businessId: string;
  planId: string;
  planName: string;
  amountLabel?: string;
  couponId?: string | null;
  entityName?: string;
  scanId?: string;
  autoRenew?: boolean;
  isFreeTrial?: boolean;
};

const formatPaidAmount = (amountPaise: number, fallbackLabel?: string) => {
  if (amountPaise > 0) {
    return `₹${Math.round(amountPaise / 100).toLocaleString("en-IN")}`;
  }
  return fallbackLabel || "₹0";
};

export const useGymPlanPurchase = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectAuthUser);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const goToSuccess = useCallback(
    (
      input: GymPlanPurchaseInput,
      extra?: { totalPaid?: string; razorpayPaymentId?: string; razorpayOrderId?: string },
    ) => {
      const isTrial = Boolean(input.isFreeTrial);
      router.push({
        pathname: href.app.paymentSuccess,
        params: {
          source: "gym",
          planName: input.planName,
          title: isTrial ? "Trial started" : "Payment Successfully",
          subtitle: isTrial
            ? "Your free trial has started. Check in at the gym anytime during the trial."
            : "Payment successful. Your plan will activate on first check-in.",
          buttonLabel: isTrial ? "Check in during your trial" : "Check in to activate your plan",
          totalPaid: extra?.totalPaid || input.amountLabel || "₹0",
          razorpayPaymentId: extra?.razorpayPaymentId || "",
          razorpayOrderId: extra?.razorpayOrderId || "",
          paymentMethod: "Razorpay",
          businessId: input.businessId,
          scanId: input.scanId || "",
          entityName: input.entityName || "",
        },
      } as never);
    },
    [router],
  );

  const goToFailure = useCallback(
    (
      input: GymPlanPurchaseInput,
      errorMessage?: string,
      razorpayRef?: string,
      extra?: { title?: string },
    ) => {
      router.push({
        pathname: href.app.paymentFailed,
        params: {
          source: "gym",
          planName: input.planName,
          amount: input.amountLabel || "—",
          title: extra?.title || "",
          errorMessage:
            errorMessage ||
            "Payment failed. You can retry without creating a duplicate membership.",
          razorpayRef: razorpayRef || "",
          businessId: input.businessId,
          scanId: input.scanId || "",
          entityName: input.entityName || "",
        },
      } as never);
    },
    [router],
  );

  const purchasePlan = useCallback(
    async (input: GymPlanPurchaseInput): Promise<boolean> => {
      if (isPurchasing) return false;
      setIsPurchasing(true);
      try {
        const orderRes = await dispatch(purchaseGymPlan({
          businessId: input.businessId,
          planId: input.planId,
          couponId: input.couponId,
          autoRenew: input.autoRenew,
        })).unwrap();

        if (!orderRes.success || !orderRes.data) {
          const message = orderRes.message || "Failed to initialize payment.";
          const trialBlocked =
            orderRes.code === "trial_not_eligible" ||
            /already used a free trial|already paid at this gym/i.test(message);
          showToastMessage(message);
          goToFailure(input, message, "", {
            title: trialBlocked ? "Trial unavailable" : undefined,
          });
          return false;
        }

        const checkout = orderRes.data;

        if (checkout.isFree || checkout.alreadyPaid) {
          goToSuccess(input, { totalPaid: input.amountLabel || "₹0" });
          return true;
        }

        if (!checkout.orderId) {
          showToastMessage(checkout.message || "Failed to initialize payment.");
          goToFailure(input, checkout.message);
          return false;
        }

        await waitForPaymentUiPaint();
        await preparePaymentChrome();

        let paymentData: {
          razorpay_order_id?: string;
          razorpay_payment_id?: string;
          razorpay_signature?: string;
        } | null = null;

        try {
          paymentData = await RazorpayCheckout.open({
            key: checkout.key || checkout.keyId || process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || "",
            order_id: checkout.orderId,
            amount: Number(checkout.amount) || 0,
            currency: checkout.currency || "INR",
            name: input.entityName || "STRON Gym",
            description: `Pay securely with Razorpay — ${input.planName}`,
            image: "https://d170t0vdmgad6v.cloudfront.net/stron_logo.png",
            prefill: {
              name: user?.username || user?.receiverName || "STRON Member",
              email: user?.email || "",
              contact: user?.contactNo || "",
            },
            theme: { color: "#1877F2" },
          });
        } catch (checkoutErr: any) {
          if (checkoutErr?.code === 2 || checkoutErr?.code === "2") {
            return false;
          }
          goToFailure(
            input,
            "Payment failed. You can retry without creating a duplicate membership.",
          );
          return false;
        } finally {
          await restorePaymentChrome();
        }

        if (!paymentData?.razorpay_payment_id || !paymentData?.razorpay_signature) {
          goToFailure(input, "Payment verification incomplete.");
          return false;
        }

        const verifyRes = await dispatch(verifyGymOnlinePayment({
          gatewayOrderId: paymentData.razorpay_order_id || checkout.orderId,
          gatewayPaymentId: paymentData.razorpay_payment_id,
          gatewaySignature: paymentData.razorpay_signature,
        })).unwrap();

        if (verifyRes.success) {
          goToSuccess(input, {
            totalPaid: formatPaidAmount(Number(checkout.amount), input.amountLabel),
            razorpayPaymentId: paymentData.razorpay_payment_id,
            razorpayOrderId: paymentData.razorpay_order_id || checkout.orderId,
          });
          return true;
        }

        goToFailure(
          input,
          verifyRes.message ||
            "Payment failed. You can retry without creating a duplicate membership.",
          checkout.orderId,
        );
        return false;
      } catch (err: any) {
        const message =
          err?.message || "Payment failed. You can retry without creating a duplicate membership.";
        const trialBlocked =
          err?.code === "trial_not_eligible" ||
          /already used a free trial|already paid at this gym/i.test(message);
        if (trialBlocked) showToastMessage(message);
        goToFailure(input, message, "", {
          title: trialBlocked ? "Trial unavailable" : undefined,
        });
        return false;
      } finally {
        setIsPurchasing(false);
      }
    },
    [dispatch, goToFailure, goToSuccess, isPurchasing, user],
  );

  return {
    purchasePlan,
    isPurchasing,
  };
};

export default useGymPlanPurchase;
