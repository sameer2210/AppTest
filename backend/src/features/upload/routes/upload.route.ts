import express from "express";
import type { NextFunction, Request, Response } from "express";
import multer, { type FileFilterCallback } from "multer";
import { requireAuth } from "../../../middleware/requireAuth.js";
import { validateRequest } from "../../../middleware/validate.middleware.js";
import {
  getPublicUploadHandler,
  getUploadStatus,
  uploadImageHandler,
} from "../controllers/upload.controller.js";
import { uploadImageSchema } from "../validators/upload.validator.js";

const router = express.Router();

router.get("/status", getUploadStatus);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (!file.mimetype?.startsWith("image/")) {
      cb(new Error("Only image uploads are allowed."));
      return;
    }
    cb(null, true);
  },
});

router.get("/public/*key", getPublicUploadHandler);

router.post(
  "/image",
  requireAuth,
  (req: Request, res: Response, next: NextFunction) => {
    upload.single("file")(req, res, (err: unknown) => {
      if (err) {
        const message = err instanceof Error ? err.message : "Invalid upload.";
        return res.status(400).json({
          success: false,
          code: "validation_error",
          message,
        });
      }
      return next();
    });
  },
  validateRequest(uploadImageSchema),
  uploadImageHandler,
);

export default router;
