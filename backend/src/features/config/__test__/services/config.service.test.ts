import { describe, it, expect, vi } from "vitest";
import { triggerRemoteConfigRefresh } from "@/features/config/services/config.service.js";
import * as remoteConfigService from "@/config/remoteConfigService.js";

describe("config: config.service", () => {
  it("triggerRemoteConfigRefresh invokes refreshRemoteConfig", () => {
    const spy = vi.spyOn(remoteConfigService, "refreshRemoteConfig").mockImplementation(async () => {});
    triggerRemoteConfigRefresh();
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});
