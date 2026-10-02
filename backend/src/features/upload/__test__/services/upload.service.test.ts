import { describe, it, expect, vi } from "vitest";
import { uploadImage, getUploadedObject } from "@/features/upload/services/upload.service.js";
import * as r2Service from "@/services/r2Upload.service.js";

describe("upload: upload.service", () => {
  it("rejects upload when R2 is not configured", async () => {
    vi.spyOn(r2Service, "isR2Configured").mockReturnValue(false);

    await expect(
      uploadImage({ buffer: Buffer.from("test") }),
    ).rejects.toMatchObject({ code: "service_unavailable" });
  });

  it("rejects upload when buffer is empty", async () => {
    vi.spyOn(r2Service, "isR2Configured").mockReturnValue(true);

    await expect(
      uploadImage({ buffer: Buffer.alloc(0) }),
    ).rejects.toMatchObject({ code: "validation_error" });
  });

  it("calls uploadImageToR2 when R2 is configured and buffer is valid", async () => {
    vi.spyOn(r2Service, "isR2Configured").mockReturnValue(true);
    vi.spyOn(r2Service, "uploadImageToR2").mockResolvedValue({
      url: "https://cdn.stron.in/uploads/test.jpg",
      key: "uploads/test.jpg",
    });

    const result = await uploadImage({ buffer: Buffer.from("image-bytes") });
    expect(result.url).toBe("https://cdn.stron.in/uploads/test.jpg");
    expect(result.key).toBe("uploads/test.jpg");
  });

  it("rejects getUploadedObject when R2 is not configured", async () => {
    vi.spyOn(r2Service, "isR2Configured").mockReturnValue(false);

    await expect(
      getUploadedObject("some-key"),
    ).rejects.toMatchObject({ code: "service_unavailable" });
  });
});
