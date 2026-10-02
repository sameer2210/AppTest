import Member from "../models/member.model.js";
import Business from "../models/business.model.js";
import { UserModel } from "../../identity-auth/index.js";
import { notifyUser } from "../../managed-events/index.js";
import { logger } from "../../../utils/logger.util.js";
import { getErrorMessage } from "../../../types/mongo.util.js";
import type { ServiceParams } from "../../../types/service.util.js";
import type { ResolveTargetsParams } from "../types/index.js";
import { GYM_NOTIFY_TAGS } from "../../../constants/index.js";

export { GYM_NOTIFY_TAGS };


const digits = (value: unknown) => String(value || "").replace(/\D/g, "");

const gymNotifyData = (membership: ServiceParams) => ({
  kind: "gym_plan",
  businessId: String(membership?.businessId || ""),
  membershipId: String(membership?._id || membership?.id || ""),
});

const phoneCandidates = (member: ServiceParams | null | undefined) => {
  const raw = String(member?.phone || "").trim();
  const phoneDigits = digits(raw);
  const set = new Set<string>();
  if (raw) set.add(raw);
  if (phoneDigits) {
    set.add(phoneDigits);
    set.add(`+${phoneDigits}`);
    const last10 = phoneDigits.slice(-10);
    if (last10.length === 10) {
      set.add(`+91${last10}`);
      set.add(`91${last10}`);
    }
  }
  return [...set];
};

export const resolveCustomerUidForMember = async (
  member: ServiceParams | null | undefined,
  customerUid?: string | null,
) => {
  if (customerUid) return String(customerUid);
  if (!member) return null;
  const candidates = phoneCandidates(member);
  if (!candidates.length) return null;
  const user = await UserModel.findOne({
    contactNo: { $in: candidates },
  })
    .select("uid")
    .lean();
  return user?.uid || null;
};


const resolveTargets = async ({ membership, member, customerUid }: ResolveTargetsParams) => {
  const [memberDoc, business] = await Promise.all([
    member
      ? Promise.resolve(member)
      : Member.findById(membership.memberId).select("name phone").lean(),
    Business.findById(membership.businessId).select("ownerId businessName").lean(),
  ]);
  const uid = await resolveCustomerUidForMember(memberDoc as ServiceParams | null, customerUid);
  return {
    customerUid: uid,
    ownerUid: business?.ownerId || null,
    memberName: (memberDoc as ServiceParams | null)?.name || "Member",
  };
};

const safeNotify = async (
  uid: string | null | undefined,
  title: string,
  body: string,
  tag: string,
  data: ServiceParams,
) => {
  if (!uid) return;
  try {
    await notifyUser(uid, title, body, { tag, data });
  } catch (error: unknown) {
    logger.warn("[gymNotify] push/inbox failed:", getErrorMessage(error));
  }
};

export const notifyGymPurchase = async ({
  membership,
  member = null,
  customerUid = null,
  planName = "a plan",
  isTrial = false,
  notifyOwner = false,
}: ServiceParams) => {
  try {
    const targets = await resolveTargets({
      membership: membership as ServiceParams,
      member: member as ServiceParams | null,
      customerUid: customerUid as string | null,
    });
    const data = gymNotifyData(membership as ServiceParams);
    const title = isTrial ? "Trial started" : "Payment Successful";
    const body = isTrial
      ? "Your free trial has started. Check in at the gym anytime during the trial."
      : "Payment successful. Your plan will activate on first check-in.";
    await safeNotify(targets.customerUid, title, body, GYM_NOTIFY_TAGS.PURCHASE, data);
    if (
      notifyOwner &&
      targets.ownerUid &&
      targets.ownerUid !== targets.customerUid
    ) {
      await safeNotify(
        targets.ownerUid,
        `${targets.memberName} bought ${planName}.`,
        `${targets.memberName} bought ${planName}.`,
        GYM_NOTIFY_TAGS.NEW_SALE,
        data,
      );
    }
  } catch (error: unknown) {
    logger.warn("[gymNotify] purchase notify skipped:", getErrorMessage(error));
  }
};

export const notifyGymActivated = async ({
  membership,
  customerUid = null,
  message,
}: ServiceParams) => {
  try {
    const targets = await resolveTargets({
      membership: membership as ServiceParams,
      customerUid: customerUid as string | null,
    });
    const data = gymNotifyData(membership as ServiceParams);
    const body =
      message ||
      `Plan activated successfully upon first check-in!`;
    await safeNotify(
      targets.customerUid,
      "Plan activated",
      String(body),
      GYM_NOTIFY_TAGS.ACTIVATED,
      data,
    );
  } catch (error: unknown) {
    logger.warn("[gymNotify] activate notify skipped:", getErrorMessage(error));
  }
};

export const notifyGymAutoRenewed = async ({ membership, customerUid = null }: ServiceParams) => {
  try {
    const targets = await resolveTargets({
      membership: membership as ServiceParams,
      customerUid: customerUid as string | null,
    });
    const data = gymNotifyData(membership as ServiceParams);
    await safeNotify(
      targets.customerUid,
      "Plan auto-renewed",
      "Your gym plan auto-renewed. Access continues.",
      GYM_NOTIFY_TAGS.RENEWED,
      data,
    );
  } catch (error: unknown) {
    logger.warn("[gymNotify] renew notify skipped:", getErrorMessage(error));
  }
};

export const notifyGymAutoRenewFailed = async ({ membership, customerUid = null }: ServiceParams) => {
  try {
    const targets = await resolveTargets({
      membership: membership as ServiceParams,
      customerUid: customerUid as string | null,
    });
    const data = gymNotifyData(membership as ServiceParams);
    await safeNotify(
      targets.customerUid,
      "Auto-renew failed",
      "Auto-renew failed. Your gym plan has expired.",
      GYM_NOTIFY_TAGS.RENEW_FAILED,
      data,
    );
    if (targets.ownerUid && targets.ownerUid !== targets.customerUid) {
      await safeNotify(
        targets.ownerUid,
        `${targets.memberName}'s auto-renew failed.`,
        `${targets.memberName}'s auto-renew failed.`,
        GYM_NOTIFY_TAGS.OWNER_RENEW_FAILED,
        data,
      );
    }
  } catch (error: unknown) {
    logger.warn("[gymNotify] renew-fail notify skipped:", getErrorMessage(error));
  }
};

export const notifyGymAutoRenewOff = async ({ membership, customerUid = null }: ServiceParams) => {
  try {
    const targets = await resolveTargets({
      membership: membership as ServiceParams,
      customerUid: customerUid as string | null,
    });
    const data = gymNotifyData(membership as ServiceParams);
    await safeNotify(
      targets.customerUid,
      "Auto-renew disabled",
      "Auto-renew disabled. Gym access continues until the current plan end date.",
      GYM_NOTIFY_TAGS.RENEW_OFF,
      data,
    );
  } catch (error: unknown) {
    logger.warn("[gymNotify] renew-off notify skipped:", getErrorMessage(error));
  }
};

export default {
  GYM_NOTIFY_TAGS,
  notifyGymPurchase,
  notifyGymActivated,
  notifyGymAutoRenewed,
  notifyGymAutoRenewFailed,
  notifyGymAutoRenewOff,
};
