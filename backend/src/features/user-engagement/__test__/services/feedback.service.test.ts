import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { MongoMemoryServer } from "mongodb-memory-server";
import { submitFeedbackService } from "@/features/user-engagement/services/feedback.service.js";
import FeedbackModel from "@/features/user-engagement/models/feedback.model.js";
import { createTestMongo } from "@/test-helpers/helpers.js";

describe("user-engagement: feedback.service", () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    const testMongo = await createTestMongo();
    mongoServer = testMongo.server;
    await testMongo.connect();
  });

  afterAll(async () => {
    await mongoServer.stop();
  });

  it("submits feedback and persists in MongoDB", async () => {
    const result = await submitFeedbackService({
      userId: "user-fb-1",
      rating: 5,
      isLiked: true,
      feedback: "Great app experience!",
    });

    expect(result).toBeDefined();
    expect(result.userId).toBe("user-fb-1");
    expect(result.rating).toBe(5);
    expect(result.feedback).toBe("Great app experience!");

    const stored = await FeedbackModel.findById(result._id);
    expect(stored).toBeDefined();
    expect(stored?.userId).toBe("user-fb-1");
  });

  it("submits anonymous feedback when no userId is supplied", async () => {
    const result = await submitFeedbackService({
      rating: 4,
      feedback: "Anonymous message",
    });

    expect(result.userId).toBe("anonymous");
  });
});
