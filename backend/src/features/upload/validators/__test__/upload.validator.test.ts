import { describe, it, expect } from "vitest";
import { uploadImageSchema, publicUploadKeySchema } from "../upload.validator.js";

describe("upload: upload.validator", () => {
  it("validates uploadImageSchema and publicUploadKeySchema", () => {
    expect(
      uploadImageSchema.body.safeParse({
        folder: "profiles",
        publicId: "usr_pic_1",
      }).success,
    ).toBe(true);

    expect(
      uploadImageSchema.body.safeParse({}).success,
    ).toBe(true);

    expect(
      publicUploadKeySchema.params.safeParse({
        key: "images/profile-123.jpg",
      }).success,
    ).toBe(true);

    expect(
      publicUploadKeySchema.params.safeParse({
        key: "",
      }).success,
    ).toBe(false);
  });
});
