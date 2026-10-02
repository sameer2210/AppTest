import mongoose from "mongoose";
import PayoutAccount from "../models/payoutAccount.model.js";
import {
  verifyWebhookSignature,
  validatePan,
  validateBankAccountWithPennyDrop,
} from "../../../services/razorpay.service.js";
import { codedError } from "../../../utils/stronHttpError.util.js";
import type { ServiceParams } from "../../../types/service.util.js";
import type { IPayoutAccount, VerificationStatus } from "../types/index.js";


const toVerificationStatus = (
  status: string | undefined,
  isVerified: boolean,
): VerificationStatus => {
  if (status === "VERIFIED" || status === "PENDING" || status === "FAILED") {
    return status;
  }
  return isVerified ? "VERIFIED" : "PENDING";
};

const maskAccountNumber = (accNumber = "") => {
  const clean = String(accNumber).trim();
  if (clean.length <= 4) return "****" + clean;
  return "****" + clean.slice(-4);
};

const sanitizePayoutAccount = (account: unknown) => {
  if (!account) return null;
  const acc = account as ServiceParams & { toObject?: () => ServiceParams };
  const doc = typeof acc.toObject === "function" ? acc.toObject() : { ...acc };
  delete doc.rawAccountNumber;
  delete doc.panNumber;
  return doc;
};

/**
 * Get payout account details for gym (returns masked account number, never raw PII)
 */
export const getPayoutAccount = async ({ businessId }: ServiceParams) => {
  const account = await PayoutAccount.findOne({ businessId }).lean();
  if (!account) {
    throw codedError("payout_account_not_found", "Payout account not found.");
  }
  return sanitizePayoutAccount(account);
};

/**
 * Create or replace payout bank account with automated Razorpay KYC penny-drop & PAN verification
 */
export const createPayoutAccount = async ({ businessId, accountData }: ServiceParams) => {
  const data = accountData as ServiceParams;
  const rawNumber = String(data.accountNumber || "").trim();
  const masked = maskAccountNumber(rawNumber);
  const ifsc = String(data.ifsc || "").trim().toUpperCase();
  const pan = data.panNumber ? String(data.panNumber).trim().toUpperCase() : null;

  // 1. Validate PAN format if provided
  if (pan) {
    const panResult = validatePan(pan);
    if (!panResult.valid) {
      throw codedError("validation_error", panResult.reason ?? "Invalid PAN.");
    }
  }

  // 2. Automated Penny-Drop Bank Account Verification via Razorpay
  const pennyDrop = await validateBankAccountWithPennyDrop({
    accountNumber: rawNumber,
    ifsc,
    accountHolderName: data.accountHolderName,
    businessId,
  });

  const isVerified = pennyDrop.status === "VERIFIED";
  const status = toVerificationStatus(pennyDrop.status, isVerified);

  const account = await PayoutAccount.findOneAndUpdate(
    { businessId },
    {
      $set: {
        businessId,
        provider: "RAZORPAYX",
        providerAccountId: pennyDrop.favId || null,
        panNumber: pan,
        accountHolderName: String(data.accountHolderName).trim(),
        maskedAccountNumber: masked,
        rawAccountNumber: rawNumber,
        ifsc,
        bankName: data.bankName ? String(data.bankName).trim() : null,
        branchName: data.branchName ? String(data.branchName).trim() : null,
        accountType: data.accountType || "CURRENT",
        verificationStatus: status,
        verificationMessage: pennyDrop.message || (isVerified ? "Bank account verified successfully." : "Pending bank verification."),
        verifiedAt: isVerified ? new Date() : null,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();

  return sanitizePayoutAccount(account);
};

/**
 * Update existing payout account with automated verification
 */
export const updatePayoutAccount = async ({ businessId, updateData }: ServiceParams) => {
  const updates = updateData as ServiceParams;
  const account = await PayoutAccount.findOne({ businessId }).select("+rawAccountNumber");
  if (!account) {
    throw codedError("payout_account_not_found", "Payout account not found.");
  }

  if (updates.panNumber !== undefined) {
    const pan = updates.panNumber ? String(updates.panNumber).trim().toUpperCase() : null;
    if (pan) {
      const panResult = validatePan(pan);
      if (!panResult.valid) {
        throw codedError("validation_error", panResult.reason ?? "Invalid PAN.");
      }
    }
    account.panNumber = pan;
  }
  if (updates.accountHolderName) {
    account.accountHolderName = String(updates.accountHolderName).trim();
  }
  if (updates.ifsc) {
    account.ifsc = String(updates.ifsc).trim().toUpperCase();
  }
  if (updates.bankName !== undefined) {
    account.bankName = updates.bankName ? String(updates.bankName).trim() : null;
  }
  if (updates.branchName !== undefined) {
    account.branchName = updates.branchName ? String(updates.branchName).trim() : null;
  }
  if (updates.accountType) {
    account.accountType = updates.accountType as "SAVINGS" | "CURRENT";
  }

  let bankDetailsChanged = false;
  if (updates.accountNumber) {
    const raw = String(updates.accountNumber).trim();
    if (raw !== account.rawAccountNumber) {
      account.rawAccountNumber = raw;
      account.maskedAccountNumber = maskAccountNumber(raw);
      bankDetailsChanged = true;
    }
  }
  if (updates.ifsc && String(updates.ifsc).trim().toUpperCase() !== account.ifsc) {
    bankDetailsChanged = true;
  }

  // If bank details changed, re-run penny-drop verification
  if (bankDetailsChanged) {
    const pennyDrop = await validateBankAccountWithPennyDrop({
      accountNumber: account.rawAccountNumber,
      ifsc: account.ifsc,
      accountHolderName: account.accountHolderName,
      businessId,
    });
    const isVerified = pennyDrop.status === "VERIFIED";
    account.verificationStatus = toVerificationStatus(pennyDrop.status, isVerified);
    account.verificationMessage = pennyDrop.message || (isVerified ? "Bank account verified successfully." : "Pending bank verification.");
    account.verifiedAt = isVerified ? new Date() : null;
    if (pennyDrop.favId) account.providerAccountId = pennyDrop.favId;
  }

  await account.save();
  return sanitizePayoutAccount(account);
};

/**
 * Verify payout account with automated Razorpay KYC / penny-drop check
 */
export const verifyPayoutAccount = async ({
  businessId,
  verificationPayload = {},
}: {
  businessId: unknown;
  verificationPayload?: ServiceParams;
}) => {
  const account = await PayoutAccount.findOne({ businessId }).select("+rawAccountNumber");
  if (!account) {
    throw codedError("payout_account_not_found", "Payout account not found to verify.");
  }

  // 1. Verify PAN if present
  if (account.panNumber) {
    const panResult = validatePan(account.panNumber);
    if (!panResult.valid) {
      account.verificationStatus = "FAILED";
      account.verificationMessage = panResult.reason ?? "Invalid PAN.";
      await account.save();
      return sanitizePayoutAccount(account);
    }
  }

  // 2. Perform automated penny drop
  const pennyDrop = await validateBankAccountWithPennyDrop({
    accountNumber: account.rawAccountNumber,
    ifsc: account.ifsc,
    accountHolderName: account.accountHolderName,
    businessId,
  });

  const isVerified = pennyDrop.status === "VERIFIED";
  account.verificationStatus = toVerificationStatus(pennyDrop.status, isVerified);
  account.verificationMessage = pennyDrop.message || (isVerified ? "Bank account verified successfully." : "Pending bank verification.");
  account.verifiedAt = isVerified ? new Date() : null;
  if (pennyDrop.favId) account.providerAccountId = pennyDrop.favId;

  await account.save();
  return sanitizePayoutAccount(account);
};

/**
 * Handle incoming Razorpay fund_account / penny-drop verification webhook
 * Fails closed if signature is missing or invalid
 */
export const handlePayoutWebhook = async ({
  rawBody,
  signature,
  eventPayload,
}: ServiceParams) => {
  const webhookPayload = eventPayload as ServiceParams;
  const innerPayload = webhookPayload.payload as ServiceParams | undefined;

  if (!signature) {
    throw codedError("forbidden", "Missing webhook signature header.");
  }

  const isValid = verifyWebhookSignature(rawBody as string, signature as string);
  if (!isValid) {
    throw codedError("forbidden", "Invalid webhook signature.");
  }

  const event = webhookPayload.event;
  const fav =
    ((innerPayload?.fund_account_validation as ServiceParams | undefined)?.entity ||
    (innerPayload?.fund_account as ServiceParams | undefined)?.entity ||
    (innerPayload?.payment as ServiceParams | undefined)?.entity) as ServiceParams | undefined;

  const favId = fav?.id;
  const status = fav?.status;
  const fundAccount = fav?.fund_account as ServiceParams | undefined;
  const bankAccount = fundAccount?.bank_account as ServiceParams | undefined;
  const accountNumber = bankAccount?.account_number;
  const ifsc = bankAccount?.ifsc;
  const results = fav?.results as ServiceParams | undefined;
  const notes = fav?.notes as ServiceParams | undefined;
  const rawBusinessId = notes?.businessId;

  let account = null;
  if (rawBusinessId) {
    const businessIdText = String(rawBusinessId);
    account = await PayoutAccount.findOne({
      $or: [
        { businessId: businessIdText },
        ...(mongoose.Types.ObjectId.isValid(businessIdText)
          ? [{ businessId: new mongoose.Types.ObjectId(businessIdText) }]
          : []),
      ],
    });
  }

  if (!account && favId) {
    account = await PayoutAccount.findOne({ providerAccountId: favId });
  }

  if (!account && accountNumber && ifsc) {
    account = await PayoutAccount.findOne({
      rawAccountNumber: String(accountNumber).trim(),
      ifsc: String(ifsc).trim().toUpperCase(),
    });
  }

  if (account) {
      if (
        event === "fund_account.validation.completed" ||
        status === "completed" ||
        status === "valid" ||
        results?.account_status === "active"
      ) {
        account.verificationStatus = "VERIFIED";
        account.verifiedAt = new Date();
        account.verificationMessage = "Bank account verified successfully via Razorpay KYC.";
        if (favId) account.providerAccountId = String(favId);
        await account.save();
      } else if (
        event === "fund_account.validation.failed" ||
        status === "failed" ||
        status === "invalid"
      ) {
        account.verificationStatus = "FAILED";
        account.verificationMessage =
          (fav?.failure_reason as string | undefined) ||
          (results?.registered_name
            ? `Name mismatch: Registered name is ${results.registered_name}`
            : "Bank account validation failed.");
        await account.save();
      }
  }

  return { received: true, event };
};

/**
 * Save bank details only — no KYC / penny-drop verification.
 * Creates the record if it doesn't exist, otherwise updates it.
 * Existing verificationStatus is preserved (won't downgrade a VERIFIED account).
 */
export const saveBankDetailsOnly = async ({ businessId, accountData }: ServiceParams) => {
  const data = accountData as ServiceParams;
  const rawNumber = String(data.accountNumber || "").trim();
  const masked = maskAccountNumber(rawNumber);
  const ifsc = String(data.ifsc || "").trim().toUpperCase();
  const pan = data.panNumber ? String(data.panNumber).trim().toUpperCase() : null;

  const existing = await PayoutAccount.findOne({ businessId });

  // Don't regress an already-verified or already-failed account's status
  const keepStatus = existing?.verificationStatus;
  const newStatus = keepStatus || "PENDING";

  const account = await PayoutAccount.findOneAndUpdate(
    { businessId },
    {
      $set: {
        businessId,
        ...(pan !== null && { panNumber: pan }),
        accountHolderName: String(data.accountHolderName).trim(),
        maskedAccountNumber: masked,
        rawAccountNumber: rawNumber,
        ifsc,
        ...(data.bankName && { bankName: String(data.bankName).trim() }),
        ...(data.branchName && { branchName: String(data.branchName).trim() }),
        accountType: data.accountType || "CURRENT",
        verificationStatus: newStatus,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();

  return sanitizePayoutAccount(account);
};

export default {
  getPayoutAccount,
  createPayoutAccount,
  updatePayoutAccount,
  verifyPayoutAccount,
  handlePayoutWebhook,
  saveBankDetailsOnly,
};
