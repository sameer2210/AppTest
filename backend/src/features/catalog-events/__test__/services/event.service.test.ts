import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { MongoMemoryServer } from "mongodb-memory-server";
import {
  normalizePlanIdForEvent,
  getEventDefinitionByKey,
  listCatalogEvents,
} from "@/features/catalog-events/index.js";
import { EVENT_KEYS } from "@/config/eventCatalog.js";
import { createTestMongo } from "@/test-helpers/helpers.js";

describe("catalog-events: services", () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    const testMongo = await createTestMongo();
    mongoServer = testMongo.server;
    await testMongo.connect();
  });

  afterAll(async () => {
    await mongoServer.stop();
  });

  describe("normalizePlanIdForEvent", () => {
    it("normalizes shorthand step challenge plan IDs", () => {
      expect(
        normalizePlanIdForEvent({
          eventKey: EVENT_KEYS.STEP_CHALLENGE,
          planId: "5k_7d",
        }),
      ).toBe("step_5k_7d");

      expect(
        normalizePlanIdForEvent({
          eventKey: EVENT_KEYS.STEP_CHALLENGE,
          planId: "10k_30d",
        }),
      ).toBe("step_10k_30d");
    });

    it("returns null when planId is missing", () => {
      expect(
        normalizePlanIdForEvent({
          eventKey: EVENT_KEYS.STEP_CHALLENGE,
          planId: null,
        }),
      ).toBeNull();
    });
  });

  describe("eventCatalog.service", () => {
    it("getEventDefinitionByKey returns builtin event definition", async () => {
      const marathon = await getEventDefinitionByKey(EVENT_KEYS.MARATHON);
      expect(marathon).toBeDefined();
      expect(marathon?.key).toBe(EVENT_KEYS.MARATHON);
    });

    it("listCatalogEvents returns all active catalog events", async () => {
      const events = await listCatalogEvents();
      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBeGreaterThan(0);
    });
  });
});
