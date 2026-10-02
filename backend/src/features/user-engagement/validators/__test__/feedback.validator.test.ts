import { describe, it, expect } from "vitest";
import { submitFeedbackSchema } from "../feedback.validator.js";

describe("user-engagement: feedback.validator", () => {
  it("validates submitFeedbackSchema", () => {
    expect(
      submitFeedbackSchema.body.safeParse({
        userId: "usr-1",
        isLiked: true,
        rating: 5,
        feedback: "Great app!",
      }).success,
    ).toBe(true);

    expect(
      submitFeedbackSchema.body.safeParse({
        rating: 6,
      }).success,
    ).toBe(false);

    expect(
      submitFeedbackSchema.body.safeParse({
        rating: 0,
      }).success,
    ).toBe(false);

    expect(
      submitFeedbackSchema.body.safeParse({}).success,
    ).toBe(true);
  });
});
