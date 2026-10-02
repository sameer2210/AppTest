import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { MongoMemoryServer } from "mongodb-memory-server";
import { UserModel } from "@/features/identity-auth/index.js";
import {
  opinionService,
  StronOpinionVoteModel,
} from "@/features/opinion-hub/index.js";
import { createTestMongo } from "@/test-helpers/helpers.js";

describe("opinion-hub: opinion.service", () => {
  let mongoServer: MongoMemoryServer;
  const user1Uid = "opinion-svc-user-1";
  const user2Uid = "opinion-svc-user-2";

  beforeAll(async () => {
    const testMongo = await createTestMongo();
    mongoServer = testMongo.server;
    await testMongo.connect();

    await UserModel.create([
      { uid: user1Uid, email: "u1@stron.in", name: "User 1", todaysStepCount: 6000 },
      { uid: user2Uid, email: "u2@stron.in", name: "User 2", todaysStepCount: 4000 },
    ]);
  });

  afterAll(async () => {
    await mongoServer.stop();
  });

  it("getOpinionPollDetails returns seeded opinions with 2 options each", async () => {
    const poll = await opinionService.getOpinionPollDetails(user1Uid);
    expect(poll.opinions).toBeInstanceOf(Array);
    expect(poll.opinions.length).toBe(3);
    for (const op of poll.opinions) {
      expect(op.options).toHaveLength(2);
      expect(op.userVotedOptionId).toBeNull();
    }
  });

  it("submitOpinionVote casts vote with user step count weight", async () => {
    const poll = await opinionService.getOpinionPollDetails(user1Uid);
    const q1 = poll.opinions[0];
    const opt1 = q1.options[0].optionId;

    const result = await opinionService.submitOpinionVote(user1Uid, opt1, q1.questionId);
    const updatedQ1 = result.opinions.find((o) => o.questionId === q1.questionId);
    expect(updatedQ1?.userVotedOptionId).toBe(opt1);
    expect(updatedQ1?.totalVotesWeight).toBe(6000);

    const voteDoc = await StronOpinionVoteModel.findOne({ uid: user1Uid, questionId: q1.questionId });
    expect(voteDoc?.optionId).toBe(opt1);
  });

  it("submitOpinionVote shifts vote when user selects another option", async () => {
    const poll = await opinionService.getOpinionPollDetails(user1Uid);
    const q1 = poll.opinions[0];
    const opt2 = q1.options[1].optionId;

    const result = await opinionService.submitOpinionVote(user1Uid, opt2, q1.questionId);
    const updatedQ1 = result.opinions.find((o) => o.questionId === q1.questionId);
    expect(updatedQ1?.userVotedOptionId).toBe(opt2);
    expect(updatedQ1?.totalVotesWeight).toBe(6000);

    const voteDoc = await StronOpinionVoteModel.findOne({ uid: user1Uid, questionId: q1.questionId });
    expect(voteDoc?.optionId).toBe(opt2);
  });

  it("toggleOpinionLike toggles like status on and off", async () => {
    const poll = await opinionService.getOpinionPollDetails(user1Uid);
    const q1 = poll.opinions[0];

    const like1 = await opinionService.toggleOpinionLike(user1Uid, q1.questionId);
    expect(like1.isLiked).toBe(true);
    expect(like1.likesCount).toBe(1);

    const like2 = await opinionService.toggleOpinionLike(user1Uid, q1.questionId);
    expect(like2.isLiked).toBe(false);
    expect(like2.likesCount).toBe(0);
  });

  it("rejects invalid questionId or optionId", async () => {
    await expect(
      opinionService.submitOpinionVote(user1Uid, "invalid-opt", "invalid-question-id"),
    ).rejects.toThrow();
  });
});
