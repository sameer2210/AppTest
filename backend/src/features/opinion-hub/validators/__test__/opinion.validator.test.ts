import { describe, it, expect } from "vitest";
import opinionValidators, {
  voteOpinionSchema,
  toggleLikeOpinionSchema,
} from "../opinion.validator.js";

describe("opinion-hub: opinion.validator", () => {
  it("validates voteOpinionSchema", () => {
    expect(
      voteOpinionSchema.body.safeParse({
        optionId: "opt-1",
        questionId: "q-100",
      }).success,
    ).toBe(true);

    expect(
      voteOpinionSchema.body.safeParse({
        optionId: "",
        questionId: "q-100",
      }).success,
    ).toBe(false);

    expect(
      opinionValidators.voteOpinionSchema.body.safeParse({
        optionId: "opt-1",
        questionId: "",
      }).success,
    ).toBe(false);
  });

  it("validates toggleLikeOpinionSchema", () => {
    expect(
      toggleLikeOpinionSchema.body.safeParse({
        questionId: "q-100",
      }).success,
    ).toBe(true);

    expect(
      opinionValidators.toggleLikeOpinionSchema.body.safeParse({
        questionId: "",
      }).success,
    ).toBe(false);
  });
});
