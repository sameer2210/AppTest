import { describe, it, expect } from "vitest";
import {
  STRON_PRO_IOS_PRODUCT_ID,
  STRON_PRO_NO_TRIAL_IOS_PRODUCT_ID,
  STRON_PRO_NO_TRIAL_PRODUCT_STORE_ID,
  STRON_PRO_OFFERING_ID,
  STRON_PRO_OFFERING_NO_TRIAL_ID,
  STRON_PRO_OFFERING_NO_TRIAL_REST_ID,
  STRON_PRO_OFFERING_REST_ID,
  STRON_PRO_OFFERING_TRIAL_ID,
  STRON_PRO_OFFERING_TRIAL_REST_ID,
  STRON_PRO_PRODUCT_STORE_ID,
  getStronProCatalog,
} from "@/utils/stronPro.constants.js";

describe("getStronProCatalog", () => {
  it("keeps trial and no-trial identifiers distinct", () => {
    expect(STRON_PRO_OFFERING_TRIAL_ID).not.toBe(STRON_PRO_OFFERING_NO_TRIAL_ID);
    expect(STRON_PRO_OFFERING_TRIAL_REST_ID).not.toBe(STRON_PRO_OFFERING_NO_TRIAL_REST_ID);
    expect(STRON_PRO_PRODUCT_STORE_ID).not.toBe(STRON_PRO_NO_TRIAL_PRODUCT_STORE_ID);
    expect(STRON_PRO_IOS_PRODUCT_ID).not.toBe(STRON_PRO_NO_TRIAL_IOS_PRODUCT_ID);
  });

  it("aliases deprecated offering ids to the no-trial pair", () => {
    expect(STRON_PRO_OFFERING_ID).toBe(STRON_PRO_OFFERING_NO_TRIAL_ID);
    expect(STRON_PRO_OFFERING_REST_ID).toBe(STRON_PRO_OFFERING_NO_TRIAL_REST_ID);
  });

  it("pairs trial SKUs with the trial offering", () => {
    expect(getStronProCatalog(true)).toEqual({
      offeringId: STRON_PRO_OFFERING_TRIAL_ID,
      offeringRestId: STRON_PRO_OFFERING_TRIAL_REST_ID,
      playStoreId: STRON_PRO_PRODUCT_STORE_ID,
      iosProductId: STRON_PRO_IOS_PRODUCT_ID,
    });
  });

  it("pairs no-trial SKUs with the no-trial offering", () => {
    expect(getStronProCatalog(false)).toEqual({
      offeringId: STRON_PRO_OFFERING_NO_TRIAL_ID,
      offeringRestId: STRON_PRO_OFFERING_NO_TRIAL_REST_ID,
      playStoreId: STRON_PRO_NO_TRIAL_PRODUCT_STORE_ID,
      iosProductId: STRON_PRO_NO_TRIAL_IOS_PRODUCT_ID,
    });
  });
});
