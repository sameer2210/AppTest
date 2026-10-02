import mongoose from "mongoose";
import WhatsappAccount from "../../features/gym-business/models/whatsappAccount.model.js";
import {
  getWhatsappApiVersion,
  getWhatsappBusinessAccountId,
  getWhatsappPhoneNumberId,
} from "../../constants/infra.constants.js";
import { getWhatsappTestDisplayPhone } from "../../constants/whatsapp.constants.js";

export const seedWhatsappAccountFromEnv = async () => {
  const phoneNumberId = getWhatsappPhoneNumberId();
  if (!phoneNumberId) return null;
  const environment = process.env.NODE_ENV === "production" ? "prod" : "test";
  return WhatsappAccount.findOneAndUpdate(
    { environment },
    {
      $set: {
        phoneNumberId,
        wabaId: getWhatsappBusinessAccountId(),
        displayPhoneNumber: getWhatsappTestDisplayPhone(),
        apiVersion: getWhatsappApiVersion(),
        isActive: true,
      },
    },
    { upsert: true, new: true },
  );
};

export const getActiveWhatsappAccount = async () => {
  const environment = process.env.NODE_ENV === "production" ? "prod" : "test";
  return (
    (await WhatsappAccount.findOne({ environment, isActive: true }).lean()) ||
    (await WhatsappAccount.findOne({ isActive: true }).lean())
  );
};

export const toObjectId = (id: string | mongoose.Types.ObjectId) => {
  if (id instanceof mongoose.Types.ObjectId) return id;
  return new mongoose.Types.ObjectId(id);
};
