import mongoose from "mongoose";
import { getErrorCode } from "../../../types/errors.js";
import type { MongoFilter, ProPeriodEndParams, ServiceParams } from "../../../types/service.util.js";
import type { IProSubscription, ProSubDoc } from "../types/index.js";
import { LIVE_PRO_STATUSES } from "../../../constants/index.js";
import ProSubscription from "../models/proSubscription.model.js";

import { UserModel } from "../../identity-auth/index.js";
import Business from "../models/business.model.js";
import { verifyWebhookSignature } from "../../../services/razorpay.service.js";
import { codedError } from "../../../utils/stronHttpError.util.js";
import { computePeriodEnd, computeRenewalDisplay } from "../../../utils/proRenewal.util.js";
import {
  STRON_PRO_PLAN_CODE,
  STRON_PRO_BILLING_CYCLE,
  STRON_PRO_PRICE_RUPEES,
  STRON_PRO_CURRENCY,
  STRON_PRO_GATEWAY,
  STRON_PRO_TRIAL_WAIT_DAYS,
  getRevenueCatWebhookAuthKey,
  getRevenueCatSecretKey,
  pickActiveProEntitlement,
  isDevProSyncBypassAllowed,
  revenueCatWebhookTokenMatches,
} from "../../../utils/stronPro.constants.js";

const freeSnapshot = (businessId: unknown) => ({
  businessId,
  planCode: "FREE",
  status: "ACTIVE",
  price: 0,
  currency: STRON_PRO_CURRENCY,
  isPro: false,
  daysRemaining: 0,
  renewalText: null as string | null,
});

const parseEntitlementExpiry = (entitlement: ServiceParams, fallback: Date) => {
  const raw = entitlement?.expires_date || entitlement?.expiresDate;
  if (!raw) return fallback;
  const parsed = new Date(raw as string | number | Date);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
};

const isInAppPauseActive = (subscription: unknown, now = new Date()) => {
  const sub = subscription as ServiceParams;
  return Boolean(
    sub &&
      sub.status === "PAUSED" &&
      sub.resumeAt &&
      now < new Date(sub.resumeAt as string | Date),
  );
};

export const applyDuePauseResume = async (subscription: unknown, now = new Date()) => {
  if (!subscription) return null;
  const sub = subscription as ProSubDoc;
  if (sub.status === "PAUSED" && sub.resumeAt && now >= new Date(sub.resumeAt as string | Date)) {
    sub.status = "ACTIVE";
    sub.isPaused = false;
    sub.pausedAt = null;
    sub.resumeAt = null;
    await sub.save?.();
  }
  return subscription;
};

export const expireLapsedProDocument = async (subscription: unknown, now = new Date()) => {
  if (!subscription) return null;
  const sub = (await applyDuePauseResume(subscription, now)) as ProSubDoc;
  if (!LIVE_PRO_STATUSES.includes(String(sub.status))) return sub;

  const currentPeriodEnd = computePeriodEnd({
    currentPeriodEnd: sub.currentPeriodEnd,
    currentPeriodStart: sub.currentPeriodStart,
    startedAt: sub.startedAt,
    createdAt: sub.createdAt,
    status: sub.status,
    billingCycle: sub.billingCycle,
    now,
  } as ProPeriodEndParams);

  if (currentPeriodEnd && now >= currentPeriodEnd) {
    sub.status = "EXPIRED";
    sub.autoRenew = false;
    sub.isPaused = false;
    sub.pausedAt = null;
    sub.resumeAt = null;
    await sub.save?.();
    return null;
  }
  return sub;
};

const buildProQuery = async ({ businessId, userId }: ServiceParams) => {
  let resolvedBusinessId = businessId;
  let resolvedUserId = userId;

  if (resolvedBusinessId && !resolvedUserId) {
    const biz = await Business.findById(resolvedBusinessId).select("ownerId").lean();
    if (biz?.ownerId) resolvedUserId = biz.ownerId;
  } else if (!resolvedBusinessId && resolvedUserId) {
    const biz = await Business.findOne({ ownerId: resolvedUserId }).select("_id").lean();
    if (biz) resolvedBusinessId = biz._id;
  }

  const orConditions: MongoFilter[] = [];
  if (resolvedBusinessId) {
    orConditions.push({ businessId: resolvedBusinessId });
  }
  if (resolvedUserId) {
    orConditions.push({ userId: resolvedUserId });
  }

  return {
    query: orConditions.length > 1 ? { $or: orConditions } : orConditions[0] || {},
    businessId: resolvedBusinessId,
    userId: resolvedUserId,
  };
};

export const expireLapsedProForBusiness = async ({ businessId, userId, now = new Date() }: ServiceParams) => {
  const { query } = await buildProQuery({ businessId, userId });
  if (Object.keys(query).length === 0) return null;

  const subscription = await ProSubscription.findOne({
    ...query,
    planCode: STRON_PRO_PLAN_CODE,
    status: { $in: LIVE_PRO_STATUSES },
  });
  if (!subscription) return null;
  return expireLapsedProDocument(subscription, now);
};

export const resumeDuePausedProSubscriptions = async ({ now = new Date() }: ServiceParams = {}) => {
  const result = await ProSubscription.updateMany(
    {
      status: "PAUSED",
      resumeAt: { $lte: now },
    },
    {
      $set: {
        status: "ACTIVE",
        isPaused: false,
        pausedAt: null,
        resumeAt: null,
      },
    },
  );
  return { resumedCount: result.modifiedCount };
};

const monthlyPeriodEnd = (from = new Date()) => {
  const periodEnd = new Date(from);
  periodEnd.setMonth(periodEnd.getMonth() + 1);
  return periodEnd;
};

const isStoreTrialPeriod = (value: unknown) => {
  const period = String(value || "").toUpperCase();
  return period === "TRIAL" || period === "INTRO";
};

const MONGO_OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;

const isMongoObjectIdString = (value: unknown) =>
  MONGO_OBJECT_ID_RE.test(String(value || "").trim());

type RevenueCatUser = {
  _id: { toString(): string };
  uid?: string | null;
  email?: string | null;
  username?: string | null;
  contactNo?: string | null;
  isGuest?: boolean | null;
};

const asRevenueCatUser = (user: unknown): RevenueCatUser | null => {
  if (!user || typeof user !== "object" || !("_id" in user)) return null;
  return user as RevenueCatUser;
};

const toE164Phone = (contactNo: unknown) => {
  const raw = String(contactNo || "").trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (raw.startsWith("+") && digits.length >= 10) return `+${digits}`;
  return null;
};

const readSubscriberAttr = (attrs: ServiceParams | null | undefined, key: string) => {
  if (!attrs || typeof attrs !== "object") return null;
  const entry = attrs[key] ?? attrs[`$${String(key).replace(/^\$/, "")}`];
  if (entry == null) return null;
  const value = typeof entry === "object" ? (entry as ServiceParams).value : entry;
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
};

export const resolveUserFromRcAppUserId = async (appUserId: unknown) => {
  const id = String(appUserId || "").trim();
  if (!id) return null;
  if (isMongoObjectIdString(id)) {
    const byId = asRevenueCatUser(await UserModel.findById(id));
    if (byId) return byId;
  }
  return asRevenueCatUser(await UserModel.findOne({ uid: id }));
};

const firebaseUidForUser = (user: RevenueCatUser | null) =>
  user?.uid ? String(user.uid) : null;

const buildReservedAttributePayload = (user: RevenueCatUser | null) => {
  const attributes: Record<string, { value: string; updated_at_ms: number }> = {};
  const email = String(user?.email || "").trim();
  const displayName = String(user?.username || "").trim();
  const phone = toE164Phone(user?.contactNo);
  const now = Date.now();
  if (email) attributes.$email = { value: email, updated_at_ms: now };
  if (displayName) attributes.$displayName = { value: displayName, updated_at_ms: now };
  if (phone) attributes.$phoneNumber = { value: phone, updated_at_ms: now };
  return attributes;
};

const fetchRevenueCatSubscriber = async (subscriberId: string, rcSecretKey: string) => {
  const rcRes = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(subscriberId)}`,
    {
      headers: {
        Authorization: `Bearer ${rcSecretKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(8000),
    },
  );
  if (!rcRes.ok) {
    throw codedError("bad_request", "RevenueCat subscriber verification failed.");
  }
  return rcRes.json() as Promise<ServiceParams>;
};

export const postRevenueCatSubscriberAttributes = async (
  subscriberId: string,
  user: RevenueCatUser | null,
  rcSecretKey: string,
) => {
  const attributes = buildReservedAttributePayload(user);
  if (!subscriberId || !rcSecretKey || Object.keys(attributes).length === 0) {
    return { posted: false, attributes };
  }
  const rcRes = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(subscriberId)}/attributes`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${rcSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ attributes }),
      signal: AbortSignal.timeout(8000),
    },
  );
  if (!rcRes.ok) {
    throw codedError("bad_request", "RevenueCat subscriber attribute update failed.");
  }
  return { posted: true, attributes };
};

const snapshotFromSubscriber = (
  subscriber: ServiceParams | null,
  user: RevenueCatUser | null,
  requestIp: unknown,
) => {
  const attrs = (subscriber?.subscriber_attributes || {}) as ServiceParams;
  return {
    originalAppUserId: subscriber?.original_app_user_id || null,
    subscriberName: readSubscriberAttr(attrs, "$displayName") || user?.username || null,
    subscriberEmail: readSubscriberAttr(attrs, "$email") || user?.email || null,
    subscriberPhone: readSubscriberAttr(attrs, "$phoneNumber") || toE164Phone(user?.contactNo),
    subscriberIp: readSubscriberAttr(attrs, "$ip") || requestIp || null,
    idfv: readSubscriberAttr(attrs, "$idfv"),
    idfa: readSubscriberAttr(attrs, "$idfa"),
    gpsAdId: readSubscriberAttr(attrs, "$gpsAdId"),
    deviceVendorId: readSubscriberAttr(attrs, "device_vendor_id"),
  };
};

const snapshotFromWebhookAttributes = (event: ServiceParams, user: RevenueCatUser | null) => {
  const attrs = (event?.subscriber_attributes || {}) as ServiceParams;
  return {
    originalAppUserId: event?.original_app_user_id || null,
    subscriberName: readSubscriberAttr(attrs, "$displayName") || user?.username || null,
    subscriberEmail: readSubscriberAttr(attrs, "$email") || user?.email || null,
    subscriberPhone: readSubscriberAttr(attrs, "$phoneNumber") || toE164Phone(user?.contactNo),
    subscriberIp: readSubscriberAttr(attrs, "$ip"),
    idfv: readSubscriberAttr(attrs, "$idfv"),
    idfa: readSubscriberAttr(attrs, "$idfa"),
    gpsAdId: readSubscriberAttr(attrs, "$gpsAdId"),
    deviceVendorId: readSubscriberAttr(attrs, "device_vendor_id"),
  };
};

const persistUserRevenueCatIdentity = async (
  user: RevenueCatUser | null,
  {
    rcAppUserId,
    originalAppUserId,
    attributesSynced = false,
  }: { rcAppUserId?: string | null; originalAppUserId?: unknown; attributesSynced?: boolean },
) => {
  if (!user?._id) return;
  const $set: ServiceParams = {};
  if (rcAppUserId) $set.revenueCatAppUserId = rcAppUserId;
  if (originalAppUserId) $set.revenueCatOriginalAppUserId = originalAppUserId;
  if (attributesSynced) $set.revenueCatAttributesSyncedAt = new Date();
  if (Object.keys($set).length === 0) return;
  await UserModel.updateOne({ _id: user._id }, { $set });
};

const expireLiveProForUser = async (firebaseUid: string | null) => {
  if (!firebaseUid) return;
  const { query } = await buildProQuery({ userId: firebaseUid });
  if (Object.keys(query).length === 0) return;
  await ProSubscription.findOneAndUpdate(query, {
    $set: {
      status: "EXPIRED",
      autoRenew: false,
      isPaused: false,
      pausedAt: null,
      resumeAt: null,
    },
  });
};

const activateMonthlyPro = async ({
  businessId,
  userId,
  periodEnd,
  autoRenew = true,
  gateway = STRON_PRO_GATEWAY,
  gatewaySubscriptionId = null,
  extra = {} as ServiceParams,
  preserveInAppPause = true,
}: ServiceParams) => {
  const now = new Date();
  const { query, businessId: resolvedBizId, userId: resolvedUserId } = await buildProQuery({
    businessId,
    userId,
  });
  const existing = Object.keys(query).length > 0 ? await ProSubscription.findOne(query).lean() : null;
  const keepPause = preserveInAppPause && isInAppPauseActive(existing, now);

  const $set: MongoFilter = {
    planCode: STRON_PRO_PLAN_CODE,
    billingCycle: STRON_PRO_BILLING_CYCLE,
    price: STRON_PRO_PRICE_RUPEES,
    currency: STRON_PRO_CURRENCY,
    currentPeriodEnd: periodEnd,
    autoRenew,
    gateway,
    gatewaySubscriptionId,
    cancelledAt: null,
    cancelReason: null,
    ...extra,
  };

  if (resolvedBizId) {
    $set.businessId = resolvedBizId;
  }
  if (resolvedUserId) {
    $set.userId = resolvedUserId;
  }

  if (keepPause) {
    $set.status = "PAUSED";
    $set.isPaused = true;
    $set.pausedAt = existing?.pausedAt;
    $set.resumeAt = existing?.resumeAt;
    $set.autoRenew = existing?.autoRenew;
  } else {
    const trial = String(extra.status || "").toUpperCase() === "TRIAL";
    $set.status = trial ? "TRIAL" : "ACTIVE";
    $set.price = trial ? 0 : STRON_PRO_PRICE_RUPEES;
    $set.isPaused = false;
    $set.pausedAt = null;
    $set.resumeAt = null;
    $set.startedAt = existing?.startedAt || now;
    $set.currentPeriodStart = now;
  }

  const upsertQuery =
    Object.keys(query).length > 0
      ? query
      : resolvedBizId
        ? { businessId: resolvedBizId }
        : { userId: resolvedUserId };

  return ProSubscription.findOneAndUpdate(upsertQuery, { $set }, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true,
  }).lean();
};

const resolveProBusinessId = async ({ businessIdAttr, firebaseUid }: ServiceParams) => {
  const ownerId = String(firebaseUid || "").trim();
  const attr = String(businessIdAttr || "").trim();

  if (attr && ownerId && mongoose.Types.ObjectId.isValid(attr)) {
    const owned = await Business.findOne({ _id: attr, ownerId }).select("_id").lean();
    if (owned) return owned._id;
  }

  if (!ownerId) return null;
  const byOwner = await Business.findOne({ ownerId }).select("_id").lean();
  return byOwner?._id || null;
};

export const getSubscription = async ({ businessId, userId }: ServiceParams = {}) => {
  const { query, businessId: resolvedBizId } = await buildProQuery({ businessId, userId });
  if (Object.keys(query).length === 0) {
    return freeSnapshot(null);
  }

  let subscription = await ProSubscription.findOne({
    ...query,
    status: { $in: LIVE_PRO_STATUSES },
  });

  if (!subscription) {
    return freeSnapshot(resolvedBizId || businessId || null);
  }

  const now = new Date();
  const live = await expireLapsedProDocument(subscription, now);
  if (!live) {
    return freeSnapshot(resolvedBizId || businessId || null);
  }
  const activeSub = live as ProSubDoc;

  const currentPeriodEnd = computePeriodEnd({
    currentPeriodEnd: activeSub.currentPeriodEnd,
    currentPeriodStart: activeSub.currentPeriodStart,
    startedAt: activeSub.startedAt,
    createdAt: activeSub.createdAt,
    status: activeSub.status,
    billingCycle: activeSub.billingCycle,
    now,
  } as ProPeriodEndParams);
  const { daysRemaining, renewalText } = computeRenewalDisplay(currentPeriodEnd, now);

  return {
    ...(activeSub.toObject?.() ?? activeSub),
    currentPeriodEnd,
    daysRemaining,
    renewalText,
    isPro: true,
  };
};

export const subscribe = async ({ businessId, userId, subscriptionData = {} as ServiceParams }: ServiceParams = {}) => {
  const now = new Date();
  const { query, businessId: resolvedBizId, userId: resolvedUserId } = await buildProQuery({
    businessId,
    userId,
  });

  const existing =
    Object.keys(query).length > 0
      ? await ProSubscription.findOne({
          ...query,
          status: { $in: LIVE_PRO_STATUSES },
        }).lean()
      : null;

  if (existing) {
    return {
      ...existing,
      isPro: true,
    };
  }

  const $set: MongoFilter = {
    planCode: STRON_PRO_PLAN_CODE,
    status: "PENDING",
    price: STRON_PRO_PRICE_RUPEES,
    currency: STRON_PRO_CURRENCY,
    billingCycle: STRON_PRO_BILLING_CYCLE,
    startedAt: now,
    currentPeriodStart: now,
    currentPeriodEnd: monthlyPeriodEnd(now),
    autoRenew: subscriptionData.autoRenew !== false,
    gateway: STRON_PRO_GATEWAY,
  };
  if (resolvedBizId) $set.businessId = resolvedBizId;
  if (resolvedUserId) $set.userId = resolvedUserId;

  const upsertQuery =
    Object.keys(query).length > 0
      ? query
      : resolvedBizId
        ? { businessId: resolvedBizId }
        : { userId: resolvedUserId };

  const subscription = await ProSubscription.findOneAndUpdate(upsertQuery, { $set }, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true,
  }).lean();

  return {
    ...subscription,
    isPro: false,
    message: "Subscription initiated. Complete payment via in-app purchase to activate PRO.",
  };
};

export const pauseSubscription = async ({ businessId, userId, pauseDays }: ServiceParams = {}) => {
  const { query } = await buildProQuery({ businessId, userId });
  if (Object.keys(query).length === 0) {
    throw codedError("invalid_state", "No active STRON PRO subscription found to pause.");
  }

  const existingPaused = await ProSubscription.findOne({
    ...query,
    status: "PAUSED",
  });
  if (existingPaused) {
    throw codedError("conflict", "Subscription is already paused.");
  }

  const subscription = await ProSubscription.findOne({
    ...query,
    status: { $in: ["ACTIVE", "TRIAL"] },
  });

  if (!subscription) {
    throw codedError("invalid_state", "No active STRON PRO subscription found to pause.");
  }

  const effectivePauseDays = Number(pauseDays) > 0 ? Number(pauseDays) : 14;
  const now = new Date();
  const pauseDurationMs = effectivePauseDays * 24 * 60 * 60 * 1000;
  const resumeAt = new Date(now.getTime() + pauseDurationMs);

  subscription.isPaused = true;
  subscription.pausedAt = now;
  subscription.resumeAt = resumeAt;
  subscription.status = "PAUSED";

  await subscription.save();

  return {
    message: `STRON PRO stays active for ${effectivePauseDays} days in the app. Store billing is unchanged until you cancel in Play Store or App Store. The in-app pause label clears on ${resumeAt.toDateString()}.`,
    subscription: {
      ...subscription.toObject(),
      isPro: true,
    },
  };
};

export const resumeSubscription = async ({ businessId, userId }: ServiceParams = {}) => {
  const { query } = await buildProQuery({ businessId, userId });
  if (Object.keys(query).length === 0) {
    throw codedError("invalid_state", "No paused STRON PRO subscription found to resume.");
  }

  const subscription = await ProSubscription.findOne({
    ...query,
    status: "PAUSED",
  });

  if (!subscription) {
    throw codedError("invalid_state", "No paused STRON PRO subscription found to resume.");
  }

  subscription.isPaused = false;
  subscription.pausedAt = null;
  subscription.resumeAt = null;
  subscription.status = "ACTIVE";

  await subscription.save();

  return {
    message: "STRON PRO subscription resumed successfully.",
    subscription: {
      ...subscription.toObject(),
      isPro: true,
    },
  };
};

export const cancelSubscription = async ({ businessId, userId, cancelData = {} as ServiceParams }: ServiceParams = {}) => {
  const { query } = await buildProQuery({ businessId, userId });
  if (Object.keys(query).length === 0) {
    throw codedError("invalid_state", "No active STRON PRO subscription found to cancel.");
  }

  const subscription = await ProSubscription.findOne({
    ...query,
    status: { $in: LIVE_PRO_STATUSES },
  });

  if (!subscription) {
    throw codedError("invalid_state", "No active STRON PRO subscription found to cancel.");
  }

  if (subscription.gateway === "free_trial") {
    subscription.status = "CANCELLED";
    subscription.autoRenew = false;
    subscription.isPaused = false;
    subscription.cancelledAt = new Date();
    subscription.cancelReason = String((cancelData as ServiceParams).cancelReason || "User requested cancellation");
    await subscription.save();
    return {
      message: "STRON PRO trial cancelled.",
      subscription: {
        ...subscription.toObject(),
        isPro: false,
      },
    };
  }

  subscription.autoRenew = false;
  subscription.cancelReason = String((cancelData as ServiceParams).cancelReason || "User requested cancellation");
  await subscription.save();

  return {
    message:
      "Auto-renew turned off. STRON PRO stays active until the current period ends. Cancel in Play Store or App Store to stop store billing.",
    subscription: {
      ...subscription.toObject(),
      isPro: true,
    },
  };
};

export const handleSubscriptionWebhook = async ({ rawBody, signature, eventPayload }: ServiceParams) => {
  if (!signature) {
    throw codedError("forbidden", "Missing webhook signature header.");
  }

  const isValid = verifyWebhookSignature(String(rawBody), String(signature));
  if (!isValid) {
    throw codedError("forbidden", "Invalid webhook signature.");
  }

  const event = eventPayload?.event;
  const subEntity = eventPayload?.payload?.subscription?.entity;
  const subId = subEntity?.id;

  if (subId) {
    const sub = await ProSubscription.findOne({ gatewaySubscriptionId: subId });
    if (sub) {
      if (event === "subscription.charged" || event === "subscription.activated") {
        sub.status = "ACTIVE";
        if (subEntity.current_end) {
          sub.currentPeriodEnd = new Date(subEntity.current_end * 1000);
        }
        await sub.save();
      } else if (event === "subscription.cancelled") {
        sub.autoRenew = false;
        sub.cancelReason = "Cancelled via payment gateway";
        await sub.save();
      }
    }
  }

  return { received: true, event };
};

export const handleRevenueCatWebhook = async ({
  authHeader,
  eventPayload,
}: ServiceParams): Promise<ServiceParams> => {
  const webhookAuthKey = getRevenueCatWebhookAuthKey();
  if (!webhookAuthKey) {
    throw codedError("forbidden", "RevenueCat webhook authentication is not configured on the server.");
  }

  if (!revenueCatWebhookTokenMatches(String(authHeader || ""), webhookAuthKey)) {
    throw codedError("forbidden", "Invalid or missing RevenueCat webhook authorization key.");
  }

  const event = eventPayload?.event;
  if (!event) {
    return { received: true, ignored: true };
  }

  const eventType = event.type;
  const appUserId = event.app_user_id;
  const resolvedUser = await resolveUserFromRcAppUserId(appUserId);
  const firebaseUid =
    firebaseUidForUser(resolvedUser) ||
    (!isMongoObjectIdString(appUserId) ? String(appUserId || "").trim() : null);
  const businessIdAttr = event.subscriber_attributes?.business_id?.value;
  const businessId = await resolveProBusinessId({
    businessIdAttr,
    firebaseUid,
  });

  if (!businessId && !firebaseUid && !appUserId) {
    return { received: true, warning: "Could not resolve gym businessId or appUserId from RevenueCat event" };
  }

  const expirationMs = event.expiration_at_ms;
  const periodEnd = expirationMs ? new Date(expirationMs) : monthlyPeriodEnd();
  const snapshot = snapshotFromWebhookAttributes(event, resolvedUser);
  const rcAppUserId = resolvedUser?._id ? String(resolvedUser._id) : String(appUserId || "").trim();

  const { query: matchQuery } = await buildProQuery({ businessId, userId: firebaseUid });

  if (["INITIAL_PURCHASE", "RENEWAL", "PRODUCT_CHANGE", "UNCANCELLATION"].includes(eventType)) {
    const trial = isStoreTrialPeriod(event.period_type);
    await activateMonthlyPro({
      businessId,
      userId: firebaseUid,
      periodEnd,
      autoRenew: true,
      gatewaySubscriptionId: event.original_transaction_id || event.transaction_id || null,
      preserveInAppPause: eventType !== "INITIAL_PURCHASE",
      extra: {
        ...(trial ? { status: "TRIAL" } : {}),
        rcAppUserId,
        productIdentifier: event.product_id || event.new_product_id || null,
        store: event.store || null,
        periodType: event.period_type || null,
        ...snapshot,
      },
    });
    if (resolvedUser?._id) {
      const userUpdate: ServiceParams = {
        hasPurchasedPro: true,
        revenueCatAppUserId: rcAppUserId,
      };
      if (trial) userUpdate.hasAvailedProTrial = true;
      if (snapshot.originalAppUserId) {
        userUpdate.revenueCatOriginalAppUserId = snapshot.originalAppUserId;
      }
      await UserModel.updateOne({ _id: resolvedUser._id }, { $set: userUpdate });
    } else if (firebaseUid) {
      const userUpdate: ServiceParams = { hasPurchasedPro: true };
      if (trial) userUpdate.hasAvailedProTrial = true;
      await UserModel.updateOne({ uid: firebaseUid }, { $set: userUpdate });
    }
  } else if (eventType === "TRANSFER") {
    const fromIds = Array.isArray(event.transferred_from) ? event.transferred_from : [];
    const toIds =
      Array.isArray(event.transferred_to) && event.transferred_to.length > 0
        ? event.transferred_to
        : [appUserId];
    const toUser = (await resolveUserFromRcAppUserId(toIds[0] || appUserId)) || resolvedUser;
    const toUid = firebaseUidForUser(toUser);

    for (const fromId of fromIds) {
      const fromUser = await resolveUserFromRcAppUserId(fromId);
      const fromUid =
        firebaseUidForUser(fromUser) || (!isMongoObjectIdString(fromId) ? String(fromId) : null);
      if (fromUid && fromUid !== toUid) {
        await expireLiveProForUser(fromUid);
      }
    }

    if (toUid) {
      const toBusinessId = await resolveProBusinessId({
        businessIdAttr,
        firebaseUid: toUid,
      });
      const toRcAppUserId = toUser?._id ? String(toUser._id) : String(toIds[0] || "");
      await activateMonthlyPro({
        businessId: toBusinessId,
        userId: toUid,
        periodEnd,
        autoRenew: true,
        gatewaySubscriptionId: event.original_transaction_id || event.transaction_id || null,
        extra: {
          rcAppUserId: toRcAppUserId,
          ...snapshotFromWebhookAttributes(event, toUser),
        },
      });
      await persistUserRevenueCatIdentity(toUser, {
        rcAppUserId: toRcAppUserId,
        originalAppUserId: event.original_app_user_id,
      });
      await UserModel.updateOne(toUser?._id ? { _id: toUser._id } : { uid: toUid }, {
        $set: { hasPurchasedPro: true },
      });
    }
  } else if (eventType === "CANCELLATION") {
    if (Object.keys(matchQuery).length > 0) {
      await ProSubscription.findOneAndUpdate(matchQuery, {
        $set: {
          autoRenew: false,
          cancelReason: "Cancelled via App Store / Play Store",
        },
      });
    }
  } else if (eventType === "EXPIRATION") {
    if (Object.keys(matchQuery).length > 0) {
      await ProSubscription.findOneAndUpdate(matchQuery, {
        $set: {
          status: "EXPIRED",
          autoRenew: false,
          isPaused: false,
          pausedAt: null,
          resumeAt: null,
        },
      });
    }
  }

  return {
    received: true,
    eventType,
    ...(businessId ? { businessId } : { warning: "Could not resolve gym businessId from RevenueCat event" }),
    ...(appUserId ? { appUserId } : {}),
    ...(firebaseUid ? { userId: firebaseUid } : {}),
  };
};

export const syncRevenueCatPurchase = async ({
  businessId,
  appUserId,
  userUid,
  requestIp,
}: ServiceParams) => {
  const rcSecretKey = getRevenueCatSecretKey();
  const lookupUid = userUid || appUserId;
  const mongoUser = asRevenueCatUser(lookupUid ? await UserModel.findOne({ uid: lookupUid }) : null);

  if (mongoUser?.isGuest) {
    throw codedError("forbidden", "Sign in to subscribe to STRON PRO.");
  }

  const firebaseUid = firebaseUidForUser(mongoUser) || (lookupUid ? String(lookupUid) : null);
  const rcAppUserId = mongoUser?._id ? String(mongoUser._id) : null;

  if (!rcSecretKey) {
    if (isDevProSyncBypassAllowed()) {
      const subscription = await activateMonthlyPro({
        businessId,
        userId: firebaseUid,
        periodEnd: monthlyPeriodEnd(),
        autoRenew: true,
        extra: rcAppUserId ? { rcAppUserId } : {},
      });
      return {
        ...subscription,
        isPro: true,
      };
    }
    throw codedError("bad_request", "RevenueCat integration is not configured on the server.");
  }

  if (!firebaseUid) {
    throw codedError("bad_request", "Subscriber ID is required for RevenueCat verification.");
  }

  const subscriberIdsToTry: string[] = [];
  if (rcAppUserId) subscriberIdsToTry.push(rcAppUserId);
  if (firebaseUid && !subscriberIdsToTry.includes(firebaseUid)) subscriberIdsToTry.push(firebaseUid);

  let hasValidEntitlement = false;
  let expiresDate = monthlyPeriodEnd();
  let isStoreTrial = false;
  let subscriberPayload: ServiceParams | null = null;
  let entitledSubscriberId = rcAppUserId || firebaseUid;
  let productIdentifier: string | null = null;
  let store: string | null = null;
  let periodType: string | null = null;
  let lastFetchError: unknown = null;
  let confirmedEmptyLookups = 0;
  let fetchFailures = 0;

  try {
    for (const subscriberId of subscriberIdsToTry) {
      try {
        const rcData = await fetchRevenueCatSubscriber(subscriberId, rcSecretKey);
        const picked = pickActiveProEntitlement(rcData.subscriber?.entitlements);
        subscriberPayload = (rcData.subscriber as ServiceParams) || subscriberPayload;
        if (picked) {
          hasValidEntitlement = true;
          expiresDate = parseEntitlementExpiry(picked.entitlement, expiresDate);
          isStoreTrial = isStoreTrialPeriod(picked.entitlement.period_type);
          entitledSubscriberId = subscriberId;
          productIdentifier =
            picked.entitlement.product_identifier || picked.entitlement.productIdentifier || null;
          store = picked.entitlement.store || null;
          periodType = picked.entitlement.period_type || picked.entitlement.periodType || null;
          break;
        }
        confirmedEmptyLookups += 1;
      } catch (err: unknown) {
        lastFetchError = err;
        fetchFailures += 1;
      }
    }
  } catch (err: unknown) {
    if (getErrorCode(err) === "bad_request") throw err;
    throw codedError("bad_request", "Could not reach RevenueCat server for purchase verification.");
  }

  if (!hasValidEntitlement) {
    // Keep Mongo PRO unless every attempted RevenueCat GET returned 200 with no entitlement.
    if (fetchFailures > 0) {
      if (confirmedEmptyLookups === 0) {
        if (getErrorCode(lastFetchError) === "bad_request") throw lastFetchError;
        throw codedError("bad_request", "Could not reach RevenueCat server for purchase verification.");
      }
      return getSubscription({ businessId, userId: firebaseUid });
    }

    const { query } = await buildProQuery({ businessId, userId: firebaseUid });
    const existing =
      Object.keys(query).length > 0
        ? await ProSubscription.findOne({
            ...query,
            status: { $in: LIVE_PRO_STATUSES },
          })
        : null;

    if (existing && existing.status !== "TRIAL" && existing.gateway !== "free_trial") {
      existing.status = "EXPIRED";
      existing.autoRenew = false;
      existing.isPaused = false;
      existing.pausedAt = null;
      existing.resumeAt = null;
      await existing.save();
    }
    return getSubscription({ businessId, userId: firebaseUid });
  }

  const snapshot = snapshotFromSubscriber(subscriberPayload, mongoUser, requestIp);
  const subscription = await activateMonthlyPro({
    businessId,
    userId: firebaseUid,
    periodEnd: expiresDate,
    autoRenew: true,
    extra: {
      ...(isStoreTrial ? { status: "TRIAL" } : {}),
      rcAppUserId: rcAppUserId || entitledSubscriberId,
      productIdentifier,
      store,
      periodType,
      ...snapshot,
    },
  });

  if (mongoUser?._id) {
    const userUpdate: ServiceParams = {
      hasPurchasedPro: true,
      revenueCatAppUserId: rcAppUserId || entitledSubscriberId,
    };
    if (isStoreTrial) userUpdate.hasAvailedProTrial = true;
    if (snapshot.originalAppUserId) {
      userUpdate.revenueCatOriginalAppUserId = snapshot.originalAppUserId;
    }
    await UserModel.updateOne({ _id: mongoUser._id }, { $set: userUpdate });
    try {
      await postRevenueCatSubscriberAttributes(
        rcAppUserId || entitledSubscriberId,
        mongoUser,
        rcSecretKey,
      );
      await persistUserRevenueCatIdentity(mongoUser, {
        rcAppUserId: rcAppUserId || entitledSubscriberId,
        originalAppUserId: snapshot.originalAppUserId,
        attributesSynced: true,
      });
    } catch {
      // Entitlement sync already succeeded; attributes are best-effort from the server.
    }
  } else if (firebaseUid) {
    const userUpdate: ServiceParams = { hasPurchasedPro: true };
    if (isStoreTrial) userUpdate.hasAvailedProTrial = true;
    await UserModel.updateOne({ uid: firebaseUid }, { $set: userUpdate });
  }

  return {
    ...subscription,
    isPro: true,
  };
};

export const checkTrialEligibility = async ({ uid, businessId, installedAt }: ServiceParams) => {
  const user = await UserModel.findOne({ uid }).lean();

  let elapsedMs: number | undefined;
  let isInstallBased = false;

  if (installedAt) {
    const num = Number(installedAt);
    const parsedTime = !Number.isNaN(num) && num > 0 ? num : new Date(String(installedAt)).getTime();
    if (!Number.isNaN(parsedTime) && parsedTime > 0) {
      elapsedMs = Math.max(0, Date.now() - parsedTime);
      isInstallBased = true;
    }
  }

  if (elapsedMs === undefined) {
    const createdAt = user?.createdAt || (user?._id ? user._id.getTimestamp() : new Date());
    elapsedMs = Math.max(0, Date.now() - new Date(createdAt).getTime());
  }

  const daysOnPlatform = Math.floor(elapsedMs / (24 * 60 * 60 * 1000));
  const hasSpentMoreThan7Days = daysOnPlatform >= STRON_PRO_TRIAL_WAIT_DAYS;

  const { query } = await buildProQuery({ businessId, userId: uid });
  const existingSub = Object.keys(query).length > 0 ? await ProSubscription.findOne(query).lean() : null;
  const hasUsedTrialOrPro =
    Boolean(user?.hasAvailedProTrial) ||
    Boolean(user?.hasPurchasedPro) ||
    Boolean(
      existingSub &&
        (existingSub.planCode === STRON_PRO_PLAN_CODE ||
          ["ACTIVE", "TRIAL", "PAUSED", "CANCELLED", "EXPIRED", "PAST_DUE"].includes(existingSub.status)),
    );

  const isEligible = hasSpentMoreThan7Days && !hasUsedTrialOrPro;

  return {
    isEligible,
    daysOnPlatform,
    ...(isInstallBased ? { daysSinceInstall: daysOnPlatform } : {}),
    hasSpentMoreThan7Days,
    hasUsedTrialOrPro,
    daysUntilTrial: Math.max(0, STRON_PRO_TRIAL_WAIT_DAYS - daysOnPlatform),
    trialDays: 14,
    monthlyPrice: STRON_PRO_PRICE_RUPEES,
    claimViaStore: true,
  };
};

export const activateFreeTrial = async (_params?: ServiceParams) => {
  throw codedError(
    "trial_via_store_only",
    "Claim STRON PRO in Play Store or App Store. A payment method is required. Eligible accounts get 14 days free, then ₹999/month auto-renew.",
  );
};

export const createProRazorpayOrder = async (_params?: ServiceParams) => {
  throw codedError("forbidden", "STRON PRO is billed via in-app purchase only.");
};

export const verifyProRazorpayPayment = async (_params?: ServiceParams) => {
  throw codedError("forbidden", "STRON PRO is billed via in-app purchase only.");
};

export default {
  getSubscription,
  subscribe,
  cancelSubscription,
  pauseSubscription,
  resumeSubscription,
  handleSubscriptionWebhook,
  handleRevenueCatWebhook,
  syncRevenueCatPurchase,
  checkTrialEligibility,
  activateFreeTrial,
  createProRazorpayOrder,
  verifyProRazorpayPayment,
  expireLapsedProForBusiness,
  resumeDuePausedProSubscriptions,
};
