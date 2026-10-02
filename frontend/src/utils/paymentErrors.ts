const CANCELLED_PATTERNS = [/cancel/i, /user closed/i, /payment was cancelled/i];

const NETWORK_PATTERNS = [/network/i, /timeout/i, /connection/i, /internet/i];

const INSUFFICIENT_FUNDS_PATTERNS = [/insufficient/i, /balance/i, /low funds/i];

const AUTH_FAILED_PATTERNS = [/authentication failed/i, /otp/i, /incorrect pin/i, /wrong pin/i];

export type PaymentErrorKind = "cancelled" | "network" | "failed";

export type FriendlyPaymentError = {
  kind: PaymentErrorKind;
  title: string;
  message: string;
};

export const formatPaymentError = (raw: unknown): FriendlyPaymentError => {
  const text =
    raw instanceof Error
      ? raw.message
      : typeof raw === "string"
        ? raw
        : "Payment could not be completed.";

  const normalized = text.trim() || "Payment could not be completed.";

  if (CANCELLED_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return {
      kind: "cancelled",
      title: "Payment cancelled",
      message:
        "You closed the payment window. No amount was charged and no ticket was created. You can try again when ready.",
    };
  }

  if (NETWORK_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return {
      kind: "network",
      title: "Connection issue",
      message:
        "We could not reach the payment service. Check your internet connection and try again.",
    };
  }

  if (INSUFFICIENT_FUNDS_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return {
      kind: "failed",
      title: "Payment declined",
      message:
        "Your bank or UPI app declined this payment due to insufficient balance. Try another payment method.",
    };
  }

  if (AUTH_FAILED_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return {
      kind: "failed",
      title: "Payment not completed",
      message:
        "Authentication failed or was not completed. No ticket was created. Please try again.",
    };
  }

  if (/sold out|refund/i.test(normalized)) {
    return {
      kind: "failed",
      title: "Ticket unavailable",
      message: normalized,
    };
  }

  if (/processing|pending/i.test(normalized)) {
    return {
      kind: "failed",
      title: "Payment processing",
      message: normalized,
    };
  }

  return {
    kind: "failed",
    title: "Payment failed",
    message:
      "Something went wrong while processing your payment. No ticket was created. Please try again or use a different payment method.",
  };
};
