import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import type { MongoMemoryServer } from "mongodb-memory-server";
import attendanceService, { getISTDateString } from "@/features/gym-business/services/attendance.service.js";
import membershipPlanService from "@/features/gym-business/services/membershipPlan.service.js";
import memberService from "@/features/gym-business/services/member.service.js";
import membershipService from "@/features/gym-business/services/membership.service.js";
import { Membership } from "@/features/gym-business/index.js";
import { createTestMongo, type TestObjectId } from "@/test-helpers/helpers.js";
import { createGymTestContext, markMembershipPaid } from "@/features/gym-business/__test__/helpers.js";

describe("gym-business: attendance.service", () => {
  let mongoServer: MongoMemoryServer;
  let businessId: TestObjectId;
  let memberId: TestObjectId;
  const ownerUid = "owner-attendance-svc-001";

  beforeAll(async () => {
    const testMongo = await createTestMongo();
    mongoServer = testMongo.server;
    await testMongo.connect();

    const ctx = await createGymTestContext(ownerUid);
    businessId = ctx.businessId;

    const plan = await membershipPlanService.createPlan({
      businessId,
      planData: {
        name: "Quarterly Pro",
        price: 3000,
        billingCycle: "QUARTERLY",
        duration: 3,
        durationUnit: "MONTHS",
      },
    });

    const member = await memberService.createMember({
      businessId,
      memberData: {
        name: "Virat Kohli",
        phone: "+919999988888",
        gender: "MALE",
      },
    });
    memberId = member._id as TestObjectId;

    await membershipService.createMembershipForMember({
      businessId,
      memberId,
      membershipData: {
        planId: plan._id,
        finalAmount: 2400,
        status: "ACTIVE",
      },
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("should check in member and return accessGate status", async () => {
    const today = getISTDateString();
    const attendance = await attendanceService.recordAttendance({
      businessId,
      markedBy: ownerUid,
      attendanceData: {
        memberId,
        attendanceDate: today,
        source: "QR",
      },
    });

    expect(attendance.source).toBe("QR");
    expect(attendance.accessGate.status).toBe("ALLOWED");
    expect(attendance.accessGate.daysLeft).toBeGreaterThan(0);
  });

  it("should reject duplicate check-in on the same day with 409", async () => {
    const today = getISTDateString();
    await expect(
      attendanceService.recordAttendance({
        businessId,
        markedBy: ownerUid,
        attendanceData: {
          memberId,
          attendanceDate: today,
        },
      }),
    ).rejects.toMatchObject({ code: "attendance_already_marked" });
  });

  it("should auto-activate PENDING membership upon first check-in with newly activated messaging", async () => {
    const isoBizId = new mongoose.Types.ObjectId() as unknown as TestObjectId;
    const isoPlan = await membershipPlanService.createPlan({
      businessId: isoBizId,
      planData: {
        name: "Activation Plan",
        price: 3000,
        billingCycle: "MONTHLY",
        duration: 1,
        durationUnit: "MONTHS",
      },
    });

    const testMember = await memberService.createMember({
      businessId: isoBizId,
      memberData: {
        name: "First Timer",
        phone: "+919123456789",
      },
    });

    const pending = await membershipService.createMembershipForMember({
      businessId: isoBizId,
      memberId: testMember._id,
      membershipData: {
        planId: isoPlan._id,
        finalAmount: 3000,
        status: "PENDING",
      },
    });

    await markMembershipPaid({
      businessId: isoBizId,
      memberId: testMember._id,
      membershipId: pending._id,
      amount: 3000,
    });

    expect(pending.status).toBe("PENDING");
    expect(pending.startDate).toBeNull();
    expect(pending.endDate).toBeNull();

    const attendance = await attendanceService.recordAttendance({
      businessId: isoBizId,
      markedBy: ownerUid,
      requireActiveMembership: true,
      attendanceData: {
        memberId: testMember._id,
        attendanceDate: getISTDateString(),
        source: "QR",
      },
    });

    expect(attendance.accessGate.status).toBe("ALLOWED");
    expect(attendance.accessGate.isNewlyActivated).toBe(true);
    expect(attendance.accessGate.activationMessage).toContain("activated");
    expect(attendance.message).toContain("Welcome to First Timer");

    const activated = await membershipService.getMembershipById({
      businessId: isoBizId,
      membershipId: pending._id,
    });

    expect(activated.status).toBe("ACTIVE");
    expect(activated.activatedAt).toBeDefined();
    expect(activated.startDate).toBeDefined();
    expect(activated.endDate).toBeDefined();
  });

  it("should prefer oldest PENDING membership when member has multiple pending plans", async () => {
    const isoBizId = new mongoose.Types.ObjectId() as unknown as TestObjectId;
    const plan1 = await membershipPlanService.createPlan({
      businessId: isoBizId,
      planData: {
        name: "Old Plan 1M",
        price: 1000,
        billingCycle: "MONTHLY",
        duration: 1,
        durationUnit: "MONTHS",
      },
    });
    const plan2 = await membershipPlanService.createPlan({
      businessId: isoBizId,
      planData: {
        name: "New Plan 3M",
        price: 2500,
        billingCycle: "MONTHLY",
        duration: 3,
        durationUnit: "MONTHS",
      },
    });

    const multiMember = await memberService.createMember({
      businessId: isoBizId,
      memberData: {
        name: "Multi Pending Member",
        phone: "+919123456788",
      },
    });

    const olderPending = await membershipService.createMembershipForMember({
      businessId: isoBizId,
      memberId: multiMember._id,
      membershipData: {
        planId: plan1._id,
        finalAmount: 1000,
        status: "PENDING",
        purchasedAt: new Date(Date.now() - 3600000),
      },
    });

    const newerPending = await membershipService.createMembershipForMember({
      businessId: isoBizId,
      memberId: multiMember._id,
      membershipData: {
        planId: plan2._id,
        finalAmount: 2500,
        status: "PENDING",
        purchasedAt: new Date(),
      },
    });

    await markMembershipPaid({
      businessId: isoBizId,
      memberId: multiMember._id,
      membershipId: olderPending._id,
      amount: 1000,
    });

    const result = await membershipService.activateMembershipOnCheckIn(
      multiMember._id,
      isoBizId,
    );

    expect(result.activated).toBe(true);
    expect(result.isNewlyActivated).toBe(true);
    expect(String(result.membership!._id)).toBe(String(olderPending._id));

    const newerCheck = await membershipService.getMembershipById({
      businessId: isoBizId,
      membershipId: newerPending._id,
    });
    expect(newerCheck.status).toBe("PENDING");
    expect(newerCheck.activatedAt).toBeNull();
  });

  it("should trigger Razorpay subscription creation when autoRenew is true and not ONE_TIME", async () => {
    const isoBizId = new mongoose.Types.ObjectId() as unknown as TestObjectId;
    const recurringPlan = await membershipPlanService.createPlan({
      businessId: isoBizId,
      planData: {
        name: "Auto Renew Gold",
        price: 1999,
        billingCycle: "MONTHLY",
        duration: 1,
        durationUnit: "MONTHS",
        gatewayPlanId: "plan_rzp_test_monthly",
      },
    });

    const autoRenewMember = await memberService.createMember({
      businessId: isoBizId,
      memberData: {
        name: "Auto Renew Fan",
        phone: "+919123456787",
      },
    });

    const pendingAuto = await membershipService.createMembershipForMember({
      businessId: isoBizId,
      memberId: autoRenewMember._id,
      membershipData: {
        planId: recurringPlan._id,
        finalAmount: 1999,
        status: "PENDING",
        autoRenew: true,
        gatewayCustomerId: "cust_test_123",
      },
    });

    await markMembershipPaid({
      businessId: isoBizId,
      memberId: autoRenewMember._id,
      membershipId: pendingAuto._id,
      amount: 1999,
    });

    const result = await membershipService.activateMembershipOnCheckIn(
      autoRenewMember._id,
      isoBizId,
    );

    expect(result.activated).toBe(true);
    expect(result.isNewlyActivated).toBe(true);
    expect(result.subscription).toBeDefined();
    expect(result.subscription!.id).toMatch(/^sub_/);
    expect(result.subscription!.start_at).toBeDefined();
    expect(result.membership!.gatewaySubscriptionId).toMatch(/^sub_/);
    expect(result.membership!.renewalStatus).toBe("SCHEDULED");

    const endSec = Math.floor(new Date(result.membership!.endDate!).getTime() / 1000);
    expect(result.subscription!.start_at).toBeLessThanOrEqual(endSec);
    expect(result.subscription!.start_at).toBeGreaterThanOrEqual(endSec - 86400 - 5);
  });

  it("should NOT create Razorpay subscription for ONE_TIME plans even with autoRenew", async () => {
    const isoBizId = new mongoose.Types.ObjectId() as unknown as TestObjectId;
    const oneTimePlan = await membershipPlanService.createPlan({
      businessId: isoBizId,
      planData: {
        name: "One Time Pack",
        price: 999,
        billingCycle: "ONE_TIME",
        duration: 1,
        durationUnit: "MONTHS",
        gatewayPlanId: "plan_rzp_should_not_use",
      },
    });

    const memberDoc = await memberService.createMember({
      businessId: isoBizId,
      memberData: {
        name: "One Time Buyer",
        phone: "+919123456784",
      },
    });

    const pendingOneTime = await membershipService.createMembershipForMember({
      businessId: isoBizId,
      memberId: memberDoc._id,
      membershipData: {
        planId: oneTimePlan._id,
        finalAmount: 999,
        status: "PENDING",
        autoRenew: true,
      },
    });

    await markMembershipPaid({
      businessId: isoBizId,
      memberId: memberDoc._id,
      membershipId: pendingOneTime._id,
      amount: 999,
    });

    const result = await membershipService.activateMembershipOnCheckIn(
      memberDoc._id,
      isoBizId,
    );

    expect(result.isNewlyActivated).toBe(true);
    expect(result.subscription).toBeNull();
    expect(result.membership!.renewalStatus).toBe("NONE");
  });

  it("should not double-activate on subsequent check-in and return active status cleanly", async () => {
    const isoBizId = new mongoose.Types.ObjectId() as unknown as TestObjectId;
    const plan = await membershipPlanService.createPlan({
      businessId: isoBizId,
      planData: {
        name: "Once Active Plan",
        price: 1500,
        billingCycle: "MONTHLY",
        duration: 1,
        durationUnit: "MONTHS",
      },
    });

    const memberDoc = await memberService.createMember({
      businessId: isoBizId,
      memberData: {
        name: "Consistent User",
        phone: "+919123456786",
      },
    });

    const pending = await membershipService.createMembershipForMember({
      businessId: isoBizId,
      memberId: memberDoc._id,
      membershipData: {
        planId: plan._id,
        finalAmount: 1500,
        status: "PENDING",
      },
    });

    await markMembershipPaid({
      businessId: isoBizId,
      memberId: memberDoc._id,
      membershipId: pending._id,
      amount: 1500,
    });

    const firstAct = await membershipService.activateMembershipOnCheckIn(
      memberDoc._id,
      isoBizId,
    );
    expect(firstAct.isNewlyActivated).toBe(true);
    const initialStartDate = firstAct.membership!.startDate!;

    const secondAct = await membershipService.activateMembershipOnCheckIn(
      memberDoc._id,
      isoBizId,
    );
    expect(secondAct.activated).toBe(true);
    expect(secondAct.isNewlyActivated).toBe(false);
    expect(new Date(secondAct.membership!.startDate!).getTime()).toBe(
      new Date(initialStartDate).getTime(),
    );
  });

  it("should allow a member with past expired membership to check in and activate their new PENDING membership", async () => {
    const isoBizId = new mongoose.Types.ObjectId() as unknown as TestObjectId;
    const plan = await membershipPlanService.createPlan({
      businessId: isoBizId,
      planData: {
        name: "Renewal Plan",
        price: 2000,
        billingCycle: "MONTHLY",
        duration: 1,
        durationUnit: "MONTHS",
      },
    });

    const memberDoc = await memberService.createMember({
      businessId: isoBizId,
      memberData: {
        name: "Returning Member",
        phone: "+919123456785",
      },
    });

    const pastStart = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const pastEnd = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await membershipService.createMembershipForMember({
      businessId: isoBizId,
      memberId: memberDoc._id,
      membershipData: {
        planId: plan._id,
        finalAmount: 2000,
        status: "EXPIRED",
        startDate: pastStart,
        endDate: pastEnd,
        activateImmediately: false,
      },
    });

    const newPending = await membershipService.createMembershipForMember({
      businessId: isoBizId,
      memberId: memberDoc._id,
      membershipData: {
        planId: plan._id,
        finalAmount: 2000,
        status: "PENDING",
      },
    });

    await markMembershipPaid({
      businessId: isoBizId,
      memberId: memberDoc._id,
      membershipId: newPending._id,
      amount: 2000,
    });

    const attendance = await attendanceService.recordAttendance({
      businessId: isoBizId,
      markedBy: ownerUid,
      requireActiveMembership: true,
      attendanceData: {
        memberId: memberDoc._id,
        attendanceDate: getISTDateString(),
        source: "QR",
      },
    });

    expect(attendance.accessGate.status).toBe("ALLOWED");
    expect(attendance.accessGate.isNewlyActivated).toBe(true);

    const checkMem = await membershipService.getMembershipById({
      businessId: isoBizId,
      membershipId: newPending._id,
    });
    expect(checkMem.status).toBe("ACTIVE");
    expect(checkMem.activatedAt).toBeDefined();
  });

  it("should NOT activate unpaid PENDING membership on check-in", async () => {
    const isoBizId = new mongoose.Types.ObjectId() as unknown as TestObjectId;
    const plan = await membershipPlanService.createPlan({
      businessId: isoBizId,
      planData: {
        name: "Unpaid Gate Plan",
        price: 2500,
        billingCycle: "MONTHLY",
        duration: 1,
        durationUnit: "MONTHS",
      },
    });
    const memberDoc = await memberService.createMember({
      businessId: isoBizId,
      memberData: { name: "Unpaid Buyer", phone: "+919123456770" },
    });
    const unpaid = await membershipService.createMembershipForMember({
      businessId: isoBizId,
      memberId: memberDoc._id,
      membershipData: {
        planId: plan._id,
        finalAmount: 2500,
        status: "PENDING",
      },
    });

    const result = await membershipService.activateMembershipOnCheckIn(
      memberDoc._id,
      isoBizId,
    );
    expect(result.activated).toBe(false);
    expect(result.membership).toBeNull();

    const stillPending = await Membership.findById(unpaid._id);
    expect(stillPending?.status).toBe("PENDING");
  });

  it("should skip unpaid older PENDING and activate next paid PENDING", async () => {
    const isoBizId = new mongoose.Types.ObjectId() as unknown as TestObjectId;
    const plan = await membershipPlanService.createPlan({
      businessId: isoBizId,
      planData: {
        name: "Skip Unpaid Plan",
        price: 1200,
        billingCycle: "MONTHLY",
        duration: 1,
        durationUnit: "MONTHS",
      },
    });
    const memberDoc = await memberService.createMember({
      businessId: isoBizId,
      memberData: { name: "Skip Unpaid", phone: "+919123456769" },
    });

    await membershipService.createMembershipForMember({
      businessId: isoBizId,
      memberId: memberDoc._id,
      membershipData: {
        planId: plan._id,
        finalAmount: 1200,
        status: "PENDING",
        purchasedAt: new Date(Date.now() - 7200000),
      },
    });
    const paidPending = await membershipService.createMembershipForMember({
      businessId: isoBizId,
      memberId: memberDoc._id,
      membershipData: {
        planId: plan._id,
        finalAmount: 1200,
        status: "PENDING",
        purchasedAt: new Date(),
      },
    });
    await markMembershipPaid({
      businessId: isoBizId,
      memberId: memberDoc._id,
      membershipId: paidPending._id,
      amount: 1200,
    });

    const result = await membershipService.activateMembershipOnCheckIn(
      memberDoc._id,
      isoBizId,
    );
    expect(result.activated).toBe(true);
    expect(String(result.membership!._id)).toBe(String(paidPending._id));
  });
});
