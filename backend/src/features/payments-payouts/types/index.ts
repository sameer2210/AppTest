import type { Types, WithMongoId } from "../../../types/mongoose.util.js";
import type { Transaction } from "../models/transaction.model.js";

// Canonical Domain Entity Types (Single Source of Truth, derived from Schema)
export type ITransaction = WithMongoId<Transaction>;

// Re-export Schema Types directly for model consumers
export type { Transaction };

// Domain Status and Enum Unions (Derived directly from Schema fields)
export type TransactionStatus = Transaction["status"];
export type TransactionRefundStatus = Transaction["refundStatus"];
export type TransactionListingType = Transaction["listingType"];

export interface CreateEventPaymentOrderParams {
  uid: string;
  eventKey?: string;
  eventId?: string;
  planId?: string | null;
  currentStepCount?: number | null;
  couponCode?: string | null;
  countryCode?: string | null;
}

export interface VerifyEventPaymentParams {
  uid: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface RefundEventPaymentParams {
  uid: string;
  razorpayOrderId: string;
  amount?: number;
}

export type PaymentFlowError = Error & { code: string };

export interface ComputeOrderAmountParams {
  eventKey: string;
  planId?: string | null;
  couponCode?: string | null;
}

export interface GetPaymentHistoryParams {
  uid: string;
}

import type { BaseRegistrationDoc } from "../../../types/domain.base.js";
import type { ServiceParams } from "../../../types/service.util.js";

export type RegistrationDoc = BaseRegistrationDoc;

export type PaymentRecord = ServiceParams & {
  uid?: string;
  eventKey?: string;
  status?: string;
  amount?: number;
  planId?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  _id?: unknown;
  ticketNumber?: string;
  qrCode?: string;
  paymentStatus?: string;
  registrationStatus?: string;
  paymentId?: unknown;
  currentStepCount?: number | null;
  webhookLogs?: ServiceParams[];
  save?: () => Promise<unknown>;
};

