import RazorpayCheckout, { type RazorpayOpenOptions } from "react-native-razorpay";
import { isAxiosError } from "axios";
import { apiClient } from "../core/apiClient.service";
import { parseEventEnrollment } from "@/models/event";
import type { EventEnrollment } from "@/models/event";
import {
  parseStronParticipation,
  type StronParticipation,
} from "@/models/stronManaged/participation";
import { StronManagedService } from "../stron/stronManaged.service";
import { BRAND } from "@/constants/stron";
import { formatPaymentError } from "@/utils/paymentErrors";
import { captureEvent } from "@/analytics/posthog/events";

export type RazorpayPurchaseParams = {
  eventKey: string;
  planId: string;
  currentStepCount?: number;
  couponCode?: string;
};

export type RazorpayPurchaseResult = {
  success: boolean;
  enrollment?: EventEnrollment | null;
  ticketNumber?: string | null;
};

export type StronTicketPurchaseParams = {
  eventKey: string;
  ticketTypeId: string;
  currentStepCount?: number;
  prefillName?: string;
  prefillEmail?: string;
  prefillContact?: string;
  /** Skip Razorpay when the ticket/event is free (including apidev ₹1 placeholders). */
  treatAsFree?: boolean;
  participantInfo?: { field: string; value: string }[];
  couponCode?: string | null;
};

export type StronTicketOrderBreakdown = {
  ticketPrice?: number;
  originalTicketPrice?: number;
  couponDiscount?: number;
  gatewayFee?: number;
  taxes?: number;
  tax?: number;
  totalCharged?: number;
  platformCommission?: number;
  organizerNet?: number;
};

export type StronTicketOrder = {
  free?: boolean;
  orderId: string | null;
  amount: number;
  currency: string;
  key: string;
  eventKey: string;
  ticketTypeId: string;
  breakdown?: StronTicketOrderBreakdown;
  participation?: Record<string, unknown> | null;
  ticketNumber?: string | null;
};

export type StronTicketCheckoutPrefill = {
  prefillName?: string;
  prefillEmail?: string;
  prefillContact?: string;
};

export type StronTicketPurchaseResult = {
  success: boolean;
  participation: StronParticipation | null;
  ticketNumber?: string | null;
  refunded?: boolean;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
};

const openCheckout = async (options: RazorpayOpenOptions) =>
  new Promise<Record<string, string>>((resolve, reject) => {
    RazorpayCheckout.open(options)
      .then((data) =>
        resolve({
          razorpay_payment_id: data.razorpay_payment_id,
          razorpay_order_id: data.razorpay_order_id,
          razorpay_signature: data.razorpay_signature,
        }),
      )
      .catch((error: any) => {
        if (error?.code === 2 || error?.code === "2") {
          reject(new Error("Payment cancelled by user."));
          return;
        }

        let errorMessage = "Razorpay checkout failed.";

        try {
          if (typeof error === "string") {
            const parsed = JSON.parse(error);
            errorMessage = parsed.error?.description || parsed.description || errorMessage;
          } else if (error?.description) {
            if (typeof error.description === "string" && error.description.startsWith("{")) {
              const parsed = JSON.parse(error.description);
              errorMessage = parsed.error?.description || parsed.description || errorMessage;
            } else {
              errorMessage = error.description;
            }
          } else if (error?.message) {
            errorMessage = error.message;
          }
        } catch {
          errorMessage = error?.description || error?.message || errorMessage;
        }

        if (errorMessage === "undefined" || !errorMessage) {
          errorMessage = "Payment failed or was cancelled.";
        }

        const friendly = formatPaymentError(errorMessage);
        reject(new Error(friendly.message));
      });
  });

export const RazorpayService = {
  createPaymentOrder: async (params: RazorpayPurchaseParams) => {
    const { data } = await apiClient.post<{
      success: boolean;
      orderId: string;
      amount: number;
      currency: string;
      key?: string;
      message?: string;
    }>("/api/payment/order", {
      eventKey: params.eventKey,
      planId: params.planId,
      currentStepCount: params.currentStepCount,
      couponCode: params.couponCode,
    });

    if (!data?.success || !data.orderId) {
      throw new Error(data?.message || "Failed to create order");
    }

    return data;
  },

  verifyPayment: async (paymentData: Record<string, string>) => {
    try {
      const { data } = await apiClient.post<{
        success: boolean;
        pending?: boolean;
        message?: string;
        enrollment?: Record<string, unknown>;
        participation?: Record<string, unknown> | null;
        ticketNumber?: string | null;
        refunded?: boolean;
      }>("/api/payment/verify", paymentData);

      if (data?.pending) {
        throw new Error(
          data.message ||
          "Payment is still processing. Complete it in your UPI or wallet app, then try again.",
        );
      }

      if (!data?.success) {
        throw new Error(data?.message || "Failed to verify payment");
      }

      return data;
    } catch (error) {
      if (isAxiosError(error)) {
        const payload = error.response?.data as { message?: string; pending?: boolean } | undefined;
        if (payload?.pending) {
          throw new Error(
            payload.message ||
            "Payment is still processing. Complete it in your UPI or wallet app, then try again.",
          );
        }
        if (payload?.message) {
          throw new Error(payload.message);
        }
      }
      throw error instanceof Error ? error : new Error("Failed to verify payment");
    }
  },

  purchaseEventWithRazorpay: async (
    params: RazorpayPurchaseParams,
  ): Promise<RazorpayPurchaseResult> => {
    const orderData = await RazorpayService.createPaymentOrder(params);

    const options = {
      description: "STRON Event Registration",
      image: "https://stron.in/favicon.ico",
      currency: orderData.currency,
      key: orderData.key || process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID?.trim() || "",
      amount: orderData.amount,
      name: "STRON",
      order_id: orderData.orderId,
      prefill: {
        email: "",
        contact: "",
        name: "STRON Athlete",
      },
      theme: { color: BRAND.primaryYellow, backdrop_color: "#FFFFFF" },
      modal: {
        backdropclose: false,
        handleback: true,
        confirm_close: true,
      },
    };

    const checkoutData = await openCheckout(options);
    const verifyResult = await RazorpayService.verifyPayment(checkoutData);
    const enrollment = verifyResult.enrollment
      ? parseEventEnrollment(verifyResult.enrollment)
      : null;

    return {
      success: true,
      enrollment,
      ticketNumber: verifyResult.ticketNumber ?? null,
    };
  },

  createStronTicketOrder: async (
    params: Pick<
      StronTicketPurchaseParams,
      "eventKey" | "ticketTypeId" | "currentStepCount" | "participantInfo" | "couponCode"
    >,
  ): Promise<StronTicketOrder> => {
    const orderData = await StronManagedService.createParticipationOrder(
      params.eventKey,
      params.ticketTypeId,
      params.currentStepCount,
      {
        participantInfo: params.participantInfo,
        couponCode: params.couponCode,
      },
    );
    return orderData;
  },

  checkoutStronTicketOrder: async (
    orderData: StronTicketOrder,
    prefill: StronTicketCheckoutPrefill = {},
    options?: { treatAsFree?: boolean },
  ): Promise<StronTicketPurchaseResult> => {
    const amountValue = Number(orderData.amount);
    const isZeroAmount = Number.isFinite(amountValue) && amountValue <= 0;
    const treatAsFree = orderData.free === true || options?.treatAsFree === true || isZeroAmount;

    if (treatAsFree) {
      let participation = parseStronParticipation(orderData.participation || null);
      if (!participation) {
        try {
          participation = await StronManagedService.getMyParticipation(orderData.eventKey);
        } catch {
          participation = null;
        }
      }
      if (!participation) {
        throw new Error(
          orderData.free || isZeroAmount
            ? "Free ticket could not be confirmed. Please go back and try again."
            : "Free ticket claim needs the updated API. Redeploy Stron-Backend, then try Get Free Ticket again.",
        );
      }
      return {
        success: true,
        participation,
        ticketNumber: orderData.ticketNumber ?? participation?.ticketNumber ?? null,
        refunded: false,
      };
    }

    if (!orderData.orderId) {
      throw new Error("Payment order is missing. Please go back and try again.");
    }

    const checkoutOptions = {
      description: "STRON Managed Event Ticket",
      image: "https://stron.in/favicon.ico",
      currency: orderData.currency || "INR",
      key: orderData.key || process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID?.trim() || "",
      amount: orderData.amount,
      name: "STRON",
      order_id: orderData.orderId,
      prefill: {
        email: prefill.prefillEmail || "",
        contact: prefill.prefillContact || "",
        name: prefill.prefillName || "STRON Athlete",
      },
      theme: { color: "#086CFF", backdrop_color: "#FFFFFF" },
      modal: {
        backdropclose: false,
        handleback: true,
        confirm_close: true,
      },
    };

    let checkoutData: Record<string, string>;
    try {
      checkoutData = await openCheckout(checkoutOptions);
    } catch (error) {
      captureEvent("payment_failed", {
        event_key: orderData.eventKey,
        amount: Number(orderData.amount) || undefined,
        stage: "checkout",
        reason: error instanceof Error ? error.message : "Checkout failed",
      });
      throw error;
    }

    let verifyResult: {
      success: boolean;
      pending?: boolean;
      message?: string;
      enrollment?: Record<string, unknown>;
      participation?: Record<string, unknown> | null;
      ticketNumber?: string | null;
      refunded?: boolean;
    };
    try {
      verifyResult = await RazorpayService.verifyPayment(checkoutData);
    } catch (error) {
      throw error;
    }

    if (verifyResult.refunded) {
      throw new Error(
        verifyResult.message ||
        "Ticket could not be confirmed (sold out). Your payment will be refunded.",
      );
    }

    let participation = parseStronParticipation(verifyResult.participation || null);
    if (!participation) {
      participation = await StronManagedService.getMyParticipation(orderData.eventKey);
    }

    return {
      success: true,
      participation,
      ticketNumber: verifyResult.ticketNumber ?? participation?.ticketNumber ?? null,
      refunded: false,
      razorpayOrderId: checkoutData.razorpay_order_id ?? orderData.orderId ?? null,
      razorpayPaymentId: checkoutData.razorpay_payment_id ?? null,
    };
  },

  /** STRON-managed ticket purchase → /api/stron/events/:key/order + shared verify. */
  purchaseStronTicket: async (
    params: StronTicketPurchaseParams,
  ): Promise<StronTicketPurchaseResult> => {
    const orderData = await RazorpayService.createStronTicketOrder(params);
    return RazorpayService.checkoutStronTicketOrder(orderData, params, {
      treatAsFree: params.treatAsFree,
    });
  },
};
