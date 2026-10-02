import { logger } from "../../utils/logger.util.js";
import {
  getWhatsappAccessToken,
  getWhatsappPhoneNumberId,
} from "../../constants/infra.constants.js";
import { MetaCloudWhatsappProvider } from "./metaCloudWhatsappProvider.js";
import { NoopWhatsappProvider, type WhatsappProvider } from "./whatsappProvider.js";

let loggedMissingCreds = false;

export const createWhatsappProvider = (): WhatsappProvider => {
  const token = getWhatsappAccessToken();
  const phoneNumberId = getWhatsappPhoneNumberId();
  if (token && phoneNumberId) {
    return new MetaCloudWhatsappProvider();
  }
  if (process.env.NODE_ENV === "production" && !loggedMissingCreds) {
    loggedMissingCreds = true;
    logger.error(
      "[whatsapp] Cloud API credentials missing in production — falling back to Noop provider.",
    );
  }
  return new NoopWhatsappProvider();
};
