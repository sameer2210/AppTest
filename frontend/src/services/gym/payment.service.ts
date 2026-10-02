import { apiClient } from "@/services/core/apiClient.service";
import type {
  PaymentItem,
  MemberPaymentSummary,
  RecordManualPaymentInput,
  CreateOnlinePaymentOrderInput,
  CreateOnlinePaymentOrderResponse,
  VerifyOnlinePaymentInput,
  ListPaymentsQuery,
} from "@/types/gym/payment.types";

const normalizePurchaseResponse = (
  raw: Record<string, any> = {},
): CreateOnlinePaymentOrderResponse => {
  const order = raw.order && typeof raw.order === "object" ? raw.order : {};
  const membership = raw.membership && typeof raw.membership === "object" ? raw.membership : {};
  const payment = raw.payment && typeof raw.payment === "object" ? raw.payment : {};
  const orderId = String(raw.orderId || order.id || "");
  const key = String(raw.key || raw.keyId || "");
  // RazorpayCheckout needs paise. Ankush returns order.amount in paise and top-level amount in rupees.
  const amountPaise =
    order.amount != null
      ? Number(order.amount)
      : Number(raw.amount || 0) >= 100
        ? Number(raw.amount)
        : Math.round(Number(raw.amount || 0) * 100);
  return {
    orderId,
    amount: Number.isFinite(amountPaise) ? amountPaise : 0,
    currency: String(raw.currency || order.currency || "INR"),
    key,
    keyId: String(raw.keyId || key),
    paymentId: String(raw.paymentId || payment._id || ""),
    membershipId: raw.membershipId
      ? String(raw.membershipId)
      : membership._id
        ? String(membership._id)
        : undefined,
    isFree: Boolean(raw.isFree),
    alreadyPaid: Boolean(raw.alreadyPaid),
    message: raw.message ? String(raw.message) : undefined,
  };
};

export const paymentApiService = {
  /**
   * List all payment transactions
   * GET /api/v1/payments
   */
  async listPayments(query?: ListPaymentsQuery): Promise<{
    success: boolean;
    data: PaymentItem[];
    total: number;
  }> {
    try {
      const response = await apiClient.get<any>("/api/v1/payments", {
        params: query,
      });

      const payments: PaymentItem[] =
        response.data?.payments ||
        (Array.isArray(response.data?.data) ? response.data.data : []) ||
        (Array.isArray(response.data) ? response.data : []);

      const total = response.data?.pagination?.total ?? payments.length;

      return {
        success: true,
        data: payments,
        total,
      };
    } catch {
      return {
        success: false,
        data: [],
        total: 0,
      };
    }
  },

  /**
   * Fetch aggregate manual payment summary for gym members
   * GET /api/v1/payments/summaries
   */
  async getMemberPaymentSummaries(): Promise<{
    success: boolean;
    data: MemberPaymentSummary[];
    totalMembers: number;
    totalOverdueCount: number;
  }> {
    try {
      const response = await apiClient.get<any>("/api/v1/payments/summaries");
      return {
        success: true,
        data: response.data?.data || response.data?.summaries || [],
        totalMembers: response.data?.totalMembers ?? 0,
        totalOverdueCount: response.data?.totalOverdueCount ?? 0,
      };
    } catch {
      return {
        success: false,
        data: [],
        totalMembers: 0,
        totalOverdueCount: 0,
      };
    }
  },

  /**
   * Fetch payment history for a specific member
   * GET /api/v1/members/:memberId/payments
   */
  async getMemberPaymentHistory(memberId: string): Promise<{
    success: boolean;
    data: PaymentItem[];
  }> {
    try {
      const response = await apiClient.get<any>(`/api/v1/members/${memberId}/payments`);
      return {
        success: true,
        data: response.data?.data || response.data?.payments || [],
      };
    } catch {
      return {
        success: false,
        data: [],
      };
    }
  },

  /**
   * Record manual payment collected at gym frontdesk
   * POST /api/v1/payments/manual
   */
  async recordManualPayment(input: RecordManualPaymentInput): Promise<{
    success: boolean;
    data?: PaymentItem;
    message?: string;
  }> {
    try {
      const payload: Record<string, any> = {
        memberId: input.memberId,
        amount: Number(input.amount),
        method: input.method || "CASH",
        finalAmount: Number(input.amount),
      };

      if (input.membershipId) payload.membershipId = input.membershipId;
      if (input.couponId) payload.couponId = input.couponId;
      if (input.notes) payload.notes = input.notes.trim();
      if (input.transactionId) payload.transactionId = input.transactionId.trim();
      if (input.paidAt) payload.paidAt = input.paidAt;

      const response = await apiClient.post<any>("/api/v1/payments/manual", payload);
      return {
        success: true,
        data: response.data?.data || response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.response?.data?.message || "Failed to record manual payment",
      };
    }
  },

  /**
   * Customer gym plan purchase — creates PENDING membership + Razorpay order.
   * POST /api/v1/memberships/purchase
   */
  async purchasePlan(input: CreateOnlinePaymentOrderInput): Promise<{
    success: boolean;
    data?: CreateOnlinePaymentOrderResponse;
    message?: string;
    code?: string;
  }> {
    try {
      const payload: Record<string, unknown> = {
        businessId: input.businessId,
        planId: input.planId,
      };
      if (input.couponId) payload.couponId = input.couponId;
      if (input.autoRenew !== undefined) payload.autoRenew = Boolean(input.autoRenew);

      const response = await apiClient.post<any>("/api/v1/memberships/purchase", payload);
      return {
        success: true,
        data: normalizePurchaseResponse(response.data?.data || response.data),
      };
    } catch (error: any) {
      return {
        success: false,
        code: error?.response?.data?.code,
        message: error?.response?.data?.message || "Failed to create gym plan payment order",
      };
    }
  },

  /**
   * Alias for purchasePlan (ClickUp: fix path from /online/order to purchase).
   * POST /api/v1/memberships/purchase
   */
  async createOnlineOrder(input: CreateOnlinePaymentOrderInput): Promise<{
    success: boolean;
    data?: CreateOnlinePaymentOrderResponse;
    message?: string;
  }> {
    return paymentApiService.purchasePlan(input);
  },

  /**
   * Verify Razorpay payment signature
   * POST /api/v1/payments/online/verify
   */
  async verifyOnlinePayment(input: VerifyOnlinePaymentInput): Promise<{
    success: boolean;
    data?: PaymentItem;
    message?: string;
  }> {
    try {
      const response = await apiClient.post<any>("/api/v1/payments/online/verify", input);
      return {
        success: true,
        data: response.data?.data || response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.response?.data?.message || "Failed to verify online payment",
      };
    }
  },

  /**
   * Send WhatsApp / SMS payment reminder to member
   * POST /api/v1/members/:memberId/remind-payment
   */
  async sendPaymentReminder(memberId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const response = await apiClient.post<any>(`/api/v1/members/${memberId}/remind-payment`);
      return {
        success: true,
        message: response.data?.message || "Payment reminder sent successfully!",
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.response?.data?.message || "Failed to send payment reminder",
      };
    }
  },
};

export default paymentApiService;
