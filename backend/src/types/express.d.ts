import type { Buffer } from "node:buffer";
import type { Types } from "mongoose";
import type { AdminUser, AuthUser } from "./auth.js";
import type { BusinessContext } from "./controller.util.js";

declare global {
  namespace Express {
    interface Request {
      /** Populated by body-parser verify hook for webhook signature checks. */
      rawBody?: Buffer;
      /** Short-lived JWT identity from requireAuth / optionalAuth. */
      user?: AuthUser;
      /** Alias of user for rate-limit key generation. */
      auth?: AuthUser;
      /** Admin identity from requireAdmin. */
      admin?: AdminUser;
      /** Gym business doc from requireBusiness / optionalBusiness. */
      business?: BusinessContext;
      /** Gym business ObjectId from requireBusiness / optionalBusiness. */
      businessId?: Types.ObjectId;
      /** Set by multer single()/array() middleware. */
      file?: Express.Multer.File;
      files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
    }
  }
}

export {};
