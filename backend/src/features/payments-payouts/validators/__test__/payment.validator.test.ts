import { describe, it, expect } from "vitest";
import {
  createPaymentOrderSchema,
  verifyPaymentSchema,
  refundRazorpayPaymentSchema,
  listPaymentHistoryQuerySchema,
} from "../payment.validator.js";

describe("payments-payouts: payment.validator", () => {
  it("validates createPaymentOrderSchema", () => {
    expect(
      createPaymentOrderSchema.body.safeParse({
        eventKey: "race-2026",
        planId: "plan-1",
        couponCode: "SAVE10",
      }).success,
    ).toBe(true);

    expect(
      createPaymentOrderSchema.body.safeParse({}).success,
    ).toBe(true);
  });

  it("validates verifyPaymentSchema", () => {
    expect(
      verifyPaymentSchema.body.safeParse({
        razorpay_order_id: "order_123",
        razorpay_payment_id: "pay_123",
        razorpay_signature: "sig_123",
      }).success,
    ).toBe(true);

    expect(
      verifyPaymentSchema.body.safeParse({
        razorpay_order_id: "",
        razorpay_payment_id: "pay_123",
        razorpay_signature: "sig_123",
      }).success,
    ).toBe(false);
  });

  it("validates refundRazorpayPaymentSchema and listPaymentHistoryQuerySchema", () => {
    expect(
      refundRazorpayPaymentSchema.body.safeParse({
        razorpayOrderId: "order_123",
        amount: 500,
      }).success,
    ).toBe(true);

    expect(
      refundRazorpayPaymentSchema.body.safeParse({
        razorpayOrderId: "",
      }).success,
    ).toBe(false);

    expect(
      listPaymentHistoryQuerySchema.query.safeParse({
        limit: "50",
      }).success,
    ).toBe(true);

    expect(
      listPaymentHistoryQuerySchema.query.safeParse({
        limit: "-5",
      }).success,
    ).toBe(false);
  });
});
