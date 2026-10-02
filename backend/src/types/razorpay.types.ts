import type { ServiceParams } from "./service.util.js";

export type RazorpayApiError = {
  error?: { description?: string };
  description?: string;
  message?: string;
  statusCode?: number;
  status?: number;
};

export type RefundOptions = ServiceParams & {
  amount?: number;
  notes?: Record<string, unknown>;
};

export type CreateRazorpayPlanParams = {
  name: string;
  amount: number;
  currency?: string;
  period?: string;
  interval?: number;
  description?: string;
  notes?: Record<string, unknown>;
};

export type CreateSubscriptionParams = {
  planId?: string;
  totalCount?: number;
  startAt?: number;
  customerId?: string | null;
  customerNotify?: number;
  notes?: Record<string, unknown>;
};
