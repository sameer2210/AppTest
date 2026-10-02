import type { Express } from "express";
import type { MongoMemoryServer } from "mongodb-memory-server";
import type mongoose from "mongoose";
import type { Types } from "mongoose";

/** JWT bearer token string from signAccessToken. */
export type TestToken = string;

/** Mongoose document id used across gym/connect tests. */
export type TestObjectId = Types.ObjectId | string;

/** In-memory Mongo + mongoose connection for integration tests. */
export type TestMongo = {
  server: MongoMemoryServer;
  connect: () => Promise<typeof mongoose>;
  disconnect: () => Promise<void>;
};

export const createTestMongo = async (): Promise<TestMongo> => {
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  const server = await MongoMemoryServer.create();
  return {
    server,
    connect: async () => {
      const m = await import("mongoose");
      await m.default.connect(server.getUri());
      return m.default;
    },
    disconnect: async () => {
      const m = await import("mongoose");
      await m.default.disconnect();
      await server.stop();
    },
  };
};

export type TestApp = Express;

/** Minimal mock Response for sendError unit checks in tests. */
export type MockHttpResponse = {
  statusCode: number;
  body: unknown;
  status: (code: number) => MockHttpResponse;
  json: (payload: unknown) => MockHttpResponse;
};

export const createMockHttpResponse = (): MockHttpResponse => {
  const res: MockHttpResponse = {
    statusCode: 0,
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res;
};

export default { createTestMongo, createMockHttpResponse };

/** Pro subscription API snapshot (sync/get helpers return a wide union). */
export type ProSubscriptionView = Record<string, unknown> & {
  isPro?: boolean;
  status?: string;
  price?: number;
  billingCycle?: string;
  currentPeriodEnd?: Date;
  isPaused?: boolean;
  expiredTrialCount?: number;
};

/** Connect QR scan result shape for integration test assertions. */
export type ConnectScanResult = Record<string, unknown> & {
  kind?: string;
  targetUid?: string;
  hasMultiple?: boolean;
  isSelfListing?: boolean;
  isProviderScan?: boolean;
  viewMode?: string;
  counterpartViewMode?: string;
  openExploreForScanner?: boolean;
  openCatalogForScanner?: boolean;
  plans?: unknown[];
  events?: unknown[];
  checkedIn?: boolean;
  alreadyCheckedIn?: boolean;
  success?: boolean;
  member?: Record<string, unknown>;
};

export const asConnectScan = (result: unknown): ConnectScanResult => result as ConnectScanResult;

export const asProSubscription = (result: unknown): ProSubscriptionView => result as ProSubscriptionView;
