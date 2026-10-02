export type PaymentMethod = "CASH" | "UPI" | "CARD" | "BANK_TRANSFER" | "ONLINE";
export type PaymentStatus = "SUCCESS" | "PENDING" | "FAILED" | "REFUNDED" | "CANCELLED";
export type PaymentSource = "MANUAL" | "GATEWAY" | "ONLINE" | "SYSTEM";

export interface PaymentItem {
  _id: string;
  id?: string;
  businessId: string;
  memberId:
    | {
        _id: string;
        name: string;
        phone?: string;
        email?: string;
        profileImage?: string;
      }
    | string;
  membershipId?:
    | {
        _id: string;
        planId?:
          | {
              _id: string;
              name: string;
              price: number;
            }
          | string;
        startDate?: string;
        endDate?: string;
        finalAmount?: number;
      }
    | string
    | null;
  couponId?: string | null;
  amount: number;
  discountAmount?: number;
  finalAmount: number;
  currency: string;
  method: PaymentMethod;
  source: PaymentSource;
  status: PaymentStatus;
  transactionId?: string;
  gatewayOrderId?: string | null;
  gatewayPaymentId?: string | null;
  notes?: string | null;
  paidAt: string;
  recordedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentReceiptItem {
  id?: string;
  transactionId?: string;
  date?: string;
  amount?: number;
  paymentMethod?: string;
  status?: string;
  memberName?: string;
  planName?: string;
  customerName?: string;
  eventName?: string;
  gymName?: string;
  notes?: string;
  amountPaid?: number;
  paymentMode?: string;
  paidAt?: string;
  method?: string;
}

export interface MemberPaymentSummary {
  memberId: string;
  memberName: string;
  phone?: string;
  profileImage?: string;
  planName: string;
  billingCycleText: string;
  totalPrice: number;
  totalPaid: number;
  totalDue: number;
  paidPercentage: number;
  daysLeftText: string;
  isOverdue: boolean;
  overdueDays?: number;
  activeMembershipId?: string;
  latestPaymentDate?: string;
}

export interface PlanListingOption {
  id: string;
  name: string;
  type: "plan" | "listing";
  badge?: string;
  price?: number;
  billingCycle?: string;
}

export interface RecordManualPaymentInput {
  memberId: string;
  membershipId?: string | null;
  planId?: string | null;
  planName?: string | null;
  eventName?: string | null;
  planOrListingName?: string | null;
  couponId?: string | null;
  amount: number;
  discountAmount?: number;
  finalAmount: number;
  method: "CASH" | "UPI" | "CARD" | "BANK_TRANSFER";
  transactionId?: string | null;
  notes?: string | null;
  paidAt?: string;
}

/** Customer gym plan checkout. Server resolves the member from the auth user. */
export interface CreateOnlinePaymentOrderInput {
  businessId: string;
  planId: string;
  couponId?: string | null;
  autoRenew?: boolean;
}

export interface CreateOnlinePaymentOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  key: string;
  keyId: string;
  paymentId: string;
  membershipId?: string;
  isFree?: boolean;
  alreadyPaid?: boolean;
  message?: string;
}

export interface VerifyOnlinePaymentInput {
  gatewayOrderId: string;
  gatewayPaymentId: string;
  gatewaySignature: string;
}

export interface ListPaymentsQuery {
  page?: number;
  limit?: number;
  memberId?: string;
  status?: PaymentStatus | "ALL";
  method?: PaymentMethod | "ALL";
  from?: string;
  to?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc" | "1" | "-1";
}
