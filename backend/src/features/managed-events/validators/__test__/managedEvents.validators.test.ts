import { describe, it, expect } from "vitest";
import {
  eventKeyParamSchema,
  catalogQuerySchema,
  createEventBodySchema,
  patchEventSchema,
  cancelEventSchema,
  createOrderSchema,
  validateCouponSchema,
  onboardOrganizerSchema,
  updateKycSchema,
  settlementEventKeySchema,
  rewardIdParamSchema,
} from "../stronEvent.validator.js";

describe("managed-events: stronEvent.validator", () => {
  it("validates eventKeyParamSchema and catalogQuerySchema", () => {
    expect(eventKeyParamSchema.params.safeParse({ key: "monsoon-marathon" }).success).toBe(true);
    expect(eventKeyParamSchema.params.safeParse({ key: "" }).success).toBe(false);

    expect(catalogQuerySchema.query.safeParse({ format: "marathon" }).success).toBe(true);
    expect(catalogQuerySchema.query.safeParse({}).success).toBe(true);
  });

  it("validates createEventBodySchema, patchEventSchema, and cancelEventSchema", () => {
    expect(createEventBodySchema.body.safeParse({ title: "Summer Race" }).success).toBe(true);

    expect(
      patchEventSchema.params.safeParse({ key: "summer-race" }).success,
    ).toBe(true);
    expect(
      patchEventSchema.body.safeParse({ title: "Updated Summer Race" }).success,
    ).toBe(true);

    expect(
      cancelEventSchema.params.safeParse({ key: "summer-race" }).success,
    ).toBe(true);
    expect(
      cancelEventSchema.body.safeParse({ reason: "Inclement weather" }).success,
    ).toBe(true);
  });

  it("validates createOrderSchema and validateCouponSchema", () => {
    expect(
      createOrderSchema.params.safeParse({ key: "monsoon-marathon" }).success,
    ).toBe(true);
    expect(
      createOrderSchema.body.safeParse({
        ticketTypeId: "ticket-1",
        currentStepCount: 1500,
        couponCode: "EARLYBIRD",
      }).success,
    ).toBe(true);

    expect(
      validateCouponSchema.params.safeParse({ key: "monsoon-marathon" }).success,
    ).toBe(true);
    expect(
      validateCouponSchema.body.safeParse({
        couponCode: "DISCOUNT50",
      }).success,
    ).toBe(true);
  });

  it("validates organizer, kyc, settlement, and reward schemas", () => {
    expect(onboardOrganizerSchema.body.safeParse({ name: "Organizer Co" }).success).toBe(true);
    expect(updateKycSchema.body.safeParse({ docType: "PAN" }).success).toBe(true);
    expect(settlementEventKeySchema.params.safeParse({ eventKey: "event-123" }).success).toBe(true);
    expect(settlementEventKeySchema.params.safeParse({ eventKey: "" }).success).toBe(false);
    expect(rewardIdParamSchema.params.safeParse({ rewardId: "rw-1" }).success).toBe(true);
    expect(rewardIdParamSchema.params.safeParse({ rewardId: "" }).success).toBe(false);
  });
});
