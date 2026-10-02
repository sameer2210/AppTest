import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { UserModel } from "@/features/identity-auth/index.js";
import { StronConnectScan, stronConnectService } from "@/features/stron-connect/index.js";
import { MembershipPlan, Membership, businessService, memberService } from "@/features/gym-business/index.js";
import { classifyCatalogView } from "@/features/stron-connect/services/stronConnectCatalog.service.js";
import { asConnectScan, createTestMongo, type TestObjectId } from "@/test-helpers/helpers.js";

const { getMyConnectQr, checkInDirect, scanConnectQr } = stronConnectService;

describe("stron-connect: connect.service", () => {
  let mongoServer: MongoMemoryServer;
  const ownerUid = "connect-owner-svc";
  const scannerUid = "connect-scanner-svc";
  let businessId: TestObjectId;
  let selfMemberId: TestObjectId;
  let proofScanId: string;

  beforeAll(async () => {
    const testMongo = await createTestMongo();
    mongoServer = testMongo.server;
    await testMongo.connect();

    await UserModel.create({
      uid: ownerUid,
      email: "owner@connectsvc.com",
      username: "GymOwnerSvc",
      connectCode: "OWNSVC",
      connectCodeCreatedAt: new Date(),
    });

    await UserModel.create({
      uid: scannerUid,
      email: "scanner@connectsvc.com",
      username: "ScannerUserSvc",
      contactNo: "+919100099999",
      phoneVerified: true,
      connectCode: "SCNSVC",
      connectCodeCreatedAt: new Date(),
    });

    const bus = await businessService.createBusinessProfile({
      ownerId: ownerUid,
      businessData: {
        businessName: "Connect Svc Gym",
        location: "Pune",
        phone: "9876599999",
      },
    });
    businessId = bus._id as TestObjectId;

    const plan = await MembershipPlan.create({
      businessId,
      name: "Connect Plan",
      price: 999,
      duration: 1,
      durationUnit: "MONTHS",
      billingCycle: "ONE_TIME",
      status: "ACTIVE",
    });

    const member = await memberService.createMember({
      businessId,
      memberData: { name: "Scanner Member", phone: "+919100099999" },
    });
    selfMemberId = member._id as TestObjectId;

    await Membership.create({
      businessId,
      memberId: selfMemberId,
      planId: plan._id,
      status: "ACTIVE",
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 86400000),
      priceAtPurchase: 999,
      finalAmount: 999,
    });

    const scan = await StronConnectScan.create({
      scannerUid,
      targetUid: ownerUid,
      kind: "user_connect",
      rawPayload: '{"t":"user"}',
    });
    proofScanId = String(scan._id);
  });

  afterAll(async () => {
    await mongoServer.stop();
  });

  it("getMyConnectQr generates stable QR payload and display code", async () => {
    const qr1 = await getMyConnectQr(scannerUid);
    const qr2 = await getMyConnectQr(scannerUid);
    expect(qr1.displayCode).toBe(qr2.displayCode);
    expect(JSON.parse(qr1.qrPayload)).toEqual({ t: "user", uid: scannerUid });
  });

  it("scanConnectQr processes user connect QR and lists offerings", async () => {
    const result = asConnectScan(
      await scanConnectQr({
        scannerUid,
        payload: JSON.stringify({ t: "user", uid: ownerUid }),
      }),
    );
    expect(result.kind).toBe("user_connect");
    expect(result.hasMultiple).toBe(true);
    expect(result.plans?.length).toBeGreaterThan(0);
  });

  it("checkInDirect records attendance with valid scan proof", async () => {
    const result = await checkInDirect({
      scannerUid,
      type: "gym",
      businessId: String(businessId),
      memberId: String(selfMemberId),
      scanId: proofScanId,
    });
    expect(result.kind).toBe("gym_check_in");
    expect(result.alreadyCheckedIn).toBe(false);
  });

  it("checkInDirect rejects gym check-in with invalid scanId", async () => {
    await expect(
      checkInDirect({
        scannerUid,
        type: "gym",
        businessId: String(businessId),
        memberId: String(selfMemberId),
        scanId: new mongoose.Types.ObjectId().toString(),
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("classifyCatalogView returns explore when no offerings exist", () => {
    expect(classifyCatalogView({ formattedPlans: [], formattedEvents: [] })).toBe("explore");
  });
});
