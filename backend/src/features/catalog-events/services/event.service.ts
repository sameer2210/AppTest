import crypto from "crypto";
import moment from "moment-timezone";
import { UserModel } from "../../identity-auth/index.js";
import EventEnrollmentModel from "../models/eventEnrollment.model.js";
import { CouponCode } from "../../gym-business/index.js";
import { EVENT_KEYS, STEPS_PER_KM } from "../../../config/eventCatalog.js";
import { getEventDefinitionByKey } from "./eventCatalog.service.js";
import { EVENT_CATALOG } from "../../../config/eventCatalog.js";
import { isIndiaCountryCode } from "../../../utils/requestGeo.util.js";
import { sendNotificationToUser } from "../../notifications/index.js";
import type { MongoFilter, ServiceParams } from "../../../types/service.util.js";
import type { Moment } from "moment-timezone";

import {
  ANALYTICS_EVENTS,
  trackEvent,
} from "../../../services/analytics.service.js";
import { logger } from "../../../utils/logger.util.js";

import type {
  EventPlan,
  EventDefinition,
  EnrollmentRow,
  EnrollmentDoc,
  ComputeEnrollmentDefaultsParams,
  EnrollUserParams,
  RedeemCouponParams,
  DailyMaintenanceParams,
  IEventEnrollment,
  IEventPlan,
} from "../types/index.js";
import {
  TZ,
  DISTANCE_KM_PER_STEP,
  CALORIES_PER_STEP,
  COUPON_EVENT_TYPE_TO_EVENT_KEY,
  VALID_SUBTYPES_BY_EVENT,
  getMarathonEnvCouponCode,
} from "../../../constants/index.js";


const generateUniqueBibNumber = async () => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = String(crypto.randomInt(10000, 100000));
    const existing = await EventEnrollmentModel.exists({ bibNumber: candidate });
    if (!existing) {
      return candidate;
    }
  }

  throw new Error("Unable to generate a unique bib number.");
};

const attachUsernamesToEnrollments = async (enrollments: EnrollmentRow[] = []) => {
  if (!enrollments.length) {
    return enrollments;
  }

  const uids = [...new Set(enrollments.map((enrollment) => enrollment.uid).filter(Boolean))];
  if (!uids.length) {
    return enrollments;
  }

  const users = await UserModel.find({ uid: { $in: uids } })
    .select("uid username email")
    .lean();
  const usernameByUid = new Map(
    users.map((user) => [
      user.uid,
      user?.username?.trim()
        ? user.username.trim()
        : user?.email?.split("@")[0]?.trim() || null,
    ]),
  );

  return enrollments.map((enrollment) => ({
    ...enrollment,
    username: usernameByUid.get(enrollment.uid) || null,
  }));
};


const isMissingBibNumber = (bibNumber: unknown) => {
  const text = String(bibNumber || '').trim();
  if (!text) return true;
  const lower = text.toLowerCase();
  return lower === 'pending' || lower === '00000' || lower === 'null';
};

const ensureBibNumberOnEnrollmentDoc = async (enrollment: EnrollmentDoc | null) => {
  if (!enrollment) return enrollment;

  if (isMissingBibNumber(enrollment.bibNumber)) {
    const bibNumber = await generateUniqueBibNumber();
    await EventEnrollmentModel.updateOne(
      { _id: enrollment._id },
      { $set: { bibNumber } },
    );
    enrollment.bibNumber = bibNumber;
    logger.info(
      `[EVENT] Backfilled bibNumber for enrollment ${enrollment._id}: ${bibNumber}`,
    );
  }

  return enrollment;
};

export const getISTMoment = (date = new Date()) => moment(date).tz(TZ);

export const getDayKey = (date = new Date()) =>
  getISTMoment(date).format("YYYY-MM-DD");

export const getMonthKey = (date = new Date()) =>
  getISTMoment(date).format("YYYY-MM");

export const getMonthEndDate = (date = new Date()) =>
  getISTMoment(date).endOf("month").toDate();

export const getSurvivorCycleNumber = (date = new Date()) => {
  const dayOfMonth = getISTMoment(date).date();
  if (dayOfMonth < 1 || dayOfMonth > 28) {
    return null;
  }

  return Math.min(4, Math.ceil(dayOfMonth / 7));
};

export const getSurvivorEliminationRewardTier = (date = new Date()) => {
  const dayOfMonth = getISTMoment(date).date();

  if (dayOfMonth <= 10) return 1;
  if (dayOfMonth <= 14) return 2;
  if (dayOfMonth <= 17) return 3;
  return 4;
};

export const buildEventCatalogForUser = (
  enrollments: EnrollmentRow[] = [],
  user: ServiceParams | null = null,
  eventDefinitions: EventDefinition[] = EVENT_CATALOG as unknown as EventDefinition[],
) => {
  const activeByEvent = new Map();
  for (const enrollment of enrollments) {
    if (!activeByEvent.has(enrollment.eventKey)) {
      activeByEvent.set(enrollment.eventKey, enrollment);
    }
  }

  return eventDefinitions.map((event) => {
    const activeEnrollment = activeByEvent.get(event.key) || null;
    const plans = Array.isArray(event.plans)
      ? event.plans.map((plan) => ({ ...plan }))
      : [];
    const userCountryCode = String(user?.lastKnownCountryCode || '').trim().toUpperCase() || null;

    const plan =
      activeEnrollment && plans
        ? plans.find((item) => item.id === activeEnrollment.planId) ||
          null
        : null;

    return {
      ...event,
      plans,
      activeEnrollment,
      firstVirtualMarathonFree:
        event.key === EVENT_KEYS.MARATHON &&
        !enrollments.some((enrollment) => enrollment.eventKey === EVENT_KEYS.MARATHON),
      marathonPaidAllowed:
        event.key !== EVENT_KEYS.MARATHON ||
        !userCountryCode ||
        isIndiaCountryCode(userCountryCode),
      tryFreeEligible: false,
      userCanEnroll: true,
      selectedPlan: plan,
    };
  });
};

export const getEnrolledUsersForEvent = async (eventKey: string) => {
  const enrollments = await EventEnrollmentModel.find({ eventKey, status: "active" }).sort({
    leaderboardSteps: -1,
    currentCycleSteps: -1,
    enrolledAt: 1,
  });

  await Promise.all(enrollments.map((e) => ensureBibNumberOnEnrollmentDoc(e as unknown as EnrollmentDoc)));
  return enrollments;
};

export const getUserEnrollments = async (uid: string) => {
  const enrollments = await EventEnrollmentModel.find({ uid })
    .sort({ createdAt: -1 })
    ;
  await Promise.all(
    enrollments.map((e) => ensureBibNumberOnEnrollmentDoc(e as unknown as EnrollmentDoc)),
  );
  return attachUsernamesToEnrollments(
    enrollments.map((enrollment) => enrollment.toObject() as EnrollmentRow),
  );
};

export const getActiveEnrollment = async ({
  uid,
  eventKey,
  seasonKey = null,
}: {
  uid: string;
  eventKey: string;
  seasonKey?: string | null;
}) => {
  const query: MongoFilter = { uid, eventKey, status: "active" };
  if (seasonKey !== null) {
    query.seasonKey = seasonKey;
  }
  const enrollment = await EventEnrollmentModel.findOne(query);
  return ensureBibNumberOnEnrollmentDoc(enrollment as unknown as EnrollmentDoc | null);
};

const computeEnrollmentDefaults = ({
  event,
  plan,
  now,
  paymentAmountOverride = null,
  enrollmentStartTodaySteps = 0,
}: ComputeEnrollmentDefaultsParams) => {
  const mNow: Moment = now
    ? (moment.isMoment(now) ? now : moment(now))
    : getISTMoment();

  const payload: ServiceParams = {
    paymentAmount:
      paymentAmountOverride !== null
        ? paymentAmountOverride
        : plan?.price || event.price || 0,
    paymentStatus: "paid",
    enrolledAt: mNow.toDate(),
    status: "active",
    rewardEligible: false,
  };

  if (event.key === EVENT_KEYS.SURVIVOR) {
    payload.seasonKey = getMonthKey(mNow.toDate());
    payload.expiresAt = getMonthEndDate(mNow.toDate());
    payload.autoEnrolled = false;
  }

  if (event.key === EVENT_KEYS.STEP_CHALLENGE) {
    payload.expiresAt = mNow.clone().add(90, "days").toDate();
    payload.targetDays = plan?.durationDays || 0;
    payload.targetStepsPerDay = plan?.dailyStepTarget || 0;
    payload.planLabel = plan?.label || null;
    payload.planId = plan?.id || null;
  }

  if (event.key === EVENT_KEYS.MARATHON || event.eventType === "marathon-physical" || (event.key && event.key.startsWith("marathon_physical"))) {
    payload.expiresAt = mNow.clone().endOf("month").toDate();
    payload.distanceKm = plan?.distanceKm || event.distanceKm || 0;
    payload.planLabel = plan?.label || null;
    payload.planId = plan?.id || null;
    payload.enrollmentStartTodaySteps = Number(enrollmentStartTodaySteps) || 0;
  }

  return payload;
};

export const normalizePlanIdForEvent = ({
  eventKey,
  planId = null,
}: {
  eventKey: string;
  planId?: string | null;
}) => {
  if (!planId) return null;

  const raw = String(planId).trim();
  const rawLower = raw.toLowerCase();
  if (!raw) return null;

  if (eventKey !== EVENT_KEYS.MARATHON) {
    if (eventKey !== EVENT_KEYS.STEP_CHALLENGE) {
      return raw;
    }

    const stepChallengePlanMap: Record<string, string> = {
      step_5k_7d: "step_5k_7d",
      step_10k_7d: "step_10k_7d",
      step_5k_30d: "step_5k_30d",
      step_10k_30d: "step_10k_30d",
      "5k_7d": "step_5k_7d",
      "10k_7d": "step_10k_7d",
      "5k_30d": "step_5k_30d",
      "10k_30d": "step_10k_30d",
      walk_5k_7d: "step_5k_7d",
      walk_10k_7d: "step_10k_7d",
      walk_5k_30d: "step_5k_30d",
      walk_10k_30d: "step_10k_30d",
    };

    return stepChallengePlanMap[rawLower] || stepChallengePlanMap[raw] || raw;
  }

  const marathonPlanMap: Record<string, string> = {
    "40_m_marathon": "marathon_40m",
    "40m_marathon": "marathon_40m",
    marathon_40m: "marathon_40m",
    marathon_5km: "marathon_5km",
    marathon_10kms: "marathon_10kms",
    marathon_21kms: "marathon_21kms",
    marathon_42kms: "marathon_42kms",
    km_0_04: "marathon_40m",
    "0.04km": "marathon_40m",
    "40m": "marathon_40m",
    km_5: "marathon_5km",
    km_10: "marathon_10kms",
    km_21: "marathon_21kms",
    km_42: "marathon_42kms",
    "5km": "marathon_5km",
    "10km": "marathon_10kms",
    "21km": "marathon_21kms",
    "42km": "marathon_42kms",
  };

  return marathonPlanMap[rawLower] || marathonPlanMap[raw] || raw;
};

const normalizeCouponCode = (couponCode: unknown) =>
  String(couponCode || "")
    .trim()
    .toUpperCase();

const normalizeCouponEventType = (eventType: unknown) =>
  String(eventType || "")
    .trim()
    .toLowerCase();

const resolveCouponEventKey = (eventType: unknown) =>
  COUPON_EVENT_TYPE_TO_EVENT_KEY[normalizeCouponEventType(eventType)] || null;

const MARATHON_ENV_COUPON_CODE = getMarathonEnvCouponCode();


const isValidSubtype = (eventKey: string | null | undefined, subType: unknown) => {
  if (eventKey && (eventKey.startsWith("marathon_physical") || eventKey === "marathon_physical")) {
    return true;
  }
  const validSubtypes = eventKey ? VALID_SUBTYPES_BY_EVENT[eventKey] : undefined;
  if (!validSubtypes) return false;
  return validSubtypes.includes(subType as string | null);
};

export const redeemCouponAndEnrollUser = async ({
  uid,
  eventKey,
  couponCode,
  planId = null,
  requestCountryCode = null,
  currentStepCount = null,
}: RedeemCouponParams) => {
  const now = getISTMoment();
  const normalizedCouponCode = normalizeCouponCode(couponCode);

  if (!normalizedCouponCode) {
    throw new Error("Coupon code is required.");
  }

  const requestedPlanId = normalizePlanIdForEvent({
    eventKey,
    planId,
  });

  if (
    eventKey === EVENT_KEYS.MARATHON &&
    MARATHON_ENV_COUPON_CODE &&
    normalizedCouponCode === MARATHON_ENV_COUPON_CODE
  ) {
    const existing = await getActiveEnrollment({
      uid,
      eventKey,
      seasonKey: null,
    });

    if (existing) {
      throw new Error("You are already enrolled in this event.");
    }

    // Default to 40m if no planId provided
    const effectiveMarathonPlanId = requestedPlanId || "marathon_40m";

    const enrollment = await enrollUserInEvent({
      uid,
      eventKey,
      planId: effectiveMarathonPlanId,
      paymentAmountOverride: 0,
      couponCode: normalizedCouponCode,
      couponEventType: "marathon",
      couponSubType: effectiveMarathonPlanId,
      isCouponBased: true,
      requestCountryCode,
      currentStepCount,
    });

    return {
      enrollment,
      coupon: {
        couponCode: normalizedCouponCode,
        eventType: "marathon",
        subType: requestedPlanId,
        price: 0,
        used: true,
        envCoupon: true,
      },
      eventKey,
    };
  }

  const event = (await getEventDefinitionByKey(eventKey)) as EventDefinition | null;
  if (!event) {
    throw new Error("Event not found.");
  }

  // If it's a physical marathon event, we search the custom coupons list in its catalog metadata
  if (event.eventType === "marathon-physical" || eventKey.startsWith("marathon_physical")) {
    const customMeta = event.customMeta as ServiceParams | undefined;
    const customCoupons = (Array.isArray(customMeta?.coupons)
      ? customMeta.coupons
      : []) as ServiceParams[];
    const matchedCoupon = customCoupons.find(
      (c) =>
        String(c.codename || "")
          .toUpperCase() === normalizedCouponCode.toUpperCase(),
    );

    if (!matchedCoupon) {
      throw new Error("Invalid coupon code.");
    }

    const eventPlans = Array.isArray(event.plans) ? (event.plans as EventPlan[]) : [];
    const effectivePlanId = requestedPlanId || eventPlans[0]?.id || null;
    const basePrice = Number(event.price) || 0;
    const discountPercent = Number(matchedCoupon.discount) || 0;
    const finalPrice = Math.max(0, Math.round(basePrice * (1 - discountPercent / 100)));

    const existing = await getActiveEnrollment({
      uid,
      eventKey,
      seasonKey: null,
    });

    if (existing) {
      throw new Error("You are already enrolled in this event.");
    }

    const enrollment = await enrollUserInEvent({
      uid,
      eventKey,
      planId: effectivePlanId,
      paymentAmountOverride: finalPrice,
      couponCode: normalizedCouponCode,
      couponEventType: "marathon-physical",
      couponSubType: effectivePlanId,
      isCouponBased: true,
      requestCountryCode,
      currentStepCount,
    });

    return {
      enrollment,
      coupon: {
        couponCode: normalizedCouponCode,
        eventType: "marathon-physical",
        subType: effectivePlanId,
        price: finalPrice,
        discount: discountPercent,
        used: true,
      },
      eventKey,
    };
  }

  const coupon = await CouponCode.findOne({
    couponCode: normalizedCouponCode,
  });

  if (!coupon) {
    throw new Error("Invalid coupon code.");
  }

  const resolvedEventKey = resolveCouponEventKey(coupon.eventType);
  if (!resolvedEventKey || resolvedEventKey !== eventKey) {
    throw new Error("Coupon code does not match this event.");
  }

  // Validate that the coupon's subType is valid for the event
  if (!isValidSubtype(resolvedEventKey, coupon.subType)) {
    throw new Error(
      `Invalid subtype '${coupon.subType}' for event type '${coupon.eventType}'.`,
    );
  }

  const existing = await getActiveEnrollment({
    uid,
    eventKey: resolvedEventKey,
    seasonKey:
      resolvedEventKey === EVENT_KEYS.SURVIVOR
        ? getMonthKey(now.toDate())
        : null,
  });

  if (existing) {
    throw new Error("You are already enrolled in this event.");
  }

  const updatedCoupon = await CouponCode.findOneAndUpdate(
    {
      couponCode: normalizedCouponCode,
      used: false,
    },
    {
      $set: {
        used: true,
        userId: uid,
        usedAt: now.toDate(),
      },
    },
    { new: true },
  );

  if (!updatedCoupon) {
    throw new Error("Coupon code has already been used.");
  }

  try {
    const effectivePlanId =
      requestedPlanId ||
      (resolvedEventKey === EVENT_KEYS.MARATHON
        ? normalizePlanIdForEvent({
            eventKey: resolvedEventKey,
            planId: updatedCoupon.subType || "marathon_40m", // Default to 40m if no subType
          })
        : resolvedEventKey === EVENT_KEYS.STEP_CHALLENGE
          ? normalizePlanIdForEvent({
              eventKey: resolvedEventKey,
              planId: updatedCoupon.subType,
            })
          : null); // SURVIVOR has no planId

    const enrollment = await enrollUserInEvent({
      uid,
      eventKey: resolvedEventKey,
      planId: effectivePlanId,
      paymentAmountOverride: updatedCoupon.price,
      couponCode: updatedCoupon.couponCode,
      couponEventType: updatedCoupon.eventType,
      couponSubType: updatedCoupon.subType,
      isCouponBased: true, // Signal to skip warrior pass check
      requestCountryCode,
      currentStepCount,
    });

    return { enrollment, coupon: updatedCoupon, eventKey: resolvedEventKey };
  } catch (error) {
    await CouponCode.updateOne(
      { _id: updatedCoupon._id },
      {
        $set: {
          used: false,
          userId: null,
          usedAt: null,
        },
      },
    );
    throw error;
  }
};

export const enrollUserInEvent = async ({
  uid,
  eventKey,
  planId = null,
  autoEnrolled = false,
  paymentAmountOverride = null,
  couponCode = null,
  couponEventType = null,
  couponSubType = null,
  isCouponBased = false,
  forceFree = false,
  requestCountryCode = null,
  currentStepCount = null,
}: EnrollUserParams) => {
  const now = getISTMoment();
  const event = (await getEventDefinitionByKey(eventKey)) as EventDefinition | null;
  const user = await UserModel.findOne({ uid });
  const userCountryCode = String(user?.lastKnownCountryCode || '').trim().toUpperCase() || null;
  
  // Use freshly resolved country code if provided (from request), otherwise use stored
  const effectiveCountryCode = requestCountryCode || userCountryCode;
  
  logger.debug('[DEBUG] enrollUserInEvent:', {
    uid,
    eventKey,
    planId,
    forceFree,
    storedCountryCode: userCountryCode,
    requestCountryCode,
    effectiveCountryCode,
  });
  // Use frontend's currentStepCount if provided (more accurate), otherwise fall back to database
  const enrollmentStartTodaySteps = Number(currentStepCount ?? user?.todaysStepCount ?? 0) || 0;

  if (!event) {
    throw new Error("Unknown event selected.");
  }

  // Validate planId/subType if provided
  if (planId && !isValidSubtype(String(event.key), planId)) {
    throw new Error(`Invalid plan '${planId}' for event type '${event.key}'.`);
  }

  const normalizedPlanId = normalizePlanIdForEvent({
    eventKey: String(event.key),
    planId,
  });

  let plan = null;
  if (event.plans?.length) {
    plan = (event.plans as EventPlan[]).find((item) => item.id === normalizedPlanId) || null;
    // if (!plan && event.key !== EVENT_KEYS.SURVIVOR) {
    //   throw new Error("A valid plan is required for this event.");
    // }
  }

  if (event.requiresWarriorPass && !isCouponBased) {
    // Warrior Pass removed — Survivor enrollment is open without subscription.
  }

  const isForceFreeEligible =
    forceFree === true && event.key === EVENT_KEYS.MARATHON;

  const requestedPaymentAmount =
    paymentAmountOverride !== null
      ? paymentAmountOverride
      : plan?.price || event.price || 0;
  const normalizedPaymentAmount = Number(requestedPaymentAmount) || 0;

  if (
    event.key === EVENT_KEYS.MARATHON &&
    normalizedPaymentAmount > 0 &&
    effectiveCountryCode &&
    !isIndiaCountryCode(effectiveCountryCode)
  ) {
    logger.debug('[DEBUG] Paid marathon blocked:', {
      uid,
      eventKey,
      effectiveCountryCode,
    });
    throw new Error(
      "Paid marathon enrollment is available only for users in India.",
    );
  }

  const existing = await getActiveEnrollment({
    uid,
    eventKey,
    seasonKey:
      event.key === EVENT_KEYS.SURVIVOR ? getMonthKey(now.toDate()) : null,
  });
  if (existing) {
    logger.debug("[EVENT][MARATHON] existing enrollment found", {
      uid,
      eventKey: event.key,
      enrollmentId: existing._id?.toString?.() || String(existing._id || ""),
      planId: existing.planId || null,
      bibNumber: existing.bibNumber || null,
    });

    if (!existing.bibNumber) {
      existing.bibNumber = await generateUniqueBibNumber();
      await existing.save?.();
      logger.info(`[EVENT] Backfilled bibNumber for enrollment ${existing._id}: ${existing.bibNumber}`);
    }

    const existingRow: EnrollmentRow =
      typeof existing.toObject === "function"
        ? (existing.toObject() as EnrollmentRow)
        : existing;
    const [enrichedExisting] = await attachUsernamesToEnrollments([existingRow]);
    return enrichedExisting;
  }

  const enrollment = new EventEnrollmentModel({
    uid,
    eventKey,
    autoEnrolled,
    bibNumber: await generateUniqueBibNumber(),
    ...(couponCode
      ? {
          couponCode,
          couponEventType,
          couponSubType,
        }
      : {}),
    ...computeEnrollmentDefaults({
      event,
      plan,
      now,
      enrollmentStartTodaySteps,
      paymentAmountOverride: isForceFreeEligible ? 0 : paymentAmountOverride,
    }),
  });

  const savedEnrollment = await enrollment.save();
  logger.info(`[EVENT] Created enrollment ${savedEnrollment._id} with bibNumber: ${savedEnrollment.bibNumber}`);
  const savedRow: EnrollmentRow =
    typeof savedEnrollment.toObject === "function"
      ? (savedEnrollment.toObject() as EnrollmentRow)
      : (savedEnrollment as unknown as EnrollmentRow);
  const [enrichedEnrollment] = await attachUsernamesToEnrollments([savedRow]);

  if (event.key === EVENT_KEYS.MARATHON) {
    await UserModel.updateOne(
      { uid },
      {
        $setOnInsert: { uid },
      },
      { upsert: true },
    );
  }

  trackEvent(ANALYTICS_EVENTS.EVENT_JOINED, {
    user_id: uid,
    event_id: savedEnrollment._id,
    event_key: event.key,
    ...(normalizedPlanId ? { plan_id: normalizedPlanId } : {}),
    ...(plan?.label ? { plan_label: plan.label } : {}),
    ...(autoEnrolled ? { auto_enrolled: true } : {}),
  });

  return enrichedEnrollment;
};

const sortAndEliminateSurvivorParticipants = async (
  seasonKey: string,
  archiveDate: Moment,
) => {
  const rewardTier = getSurvivorEliminationRewardTier(archiveDate.toDate());
  const participants = await EventEnrollmentModel.find({
    eventKey: EVENT_KEYS.SURVIVOR,
    seasonKey,
    status: "active",
  }).sort({ currentCycleSteps: -1, enrolledAt: 1 });

  if (participants.length === 0) {
    return { eliminated: 0, survivors: 0 };
  }

  const survivorCount = Math.max(1, Math.ceil(participants.length / 2));
  const survivors = participants.slice(0, survivorCount);
  const eliminated = participants.slice(survivorCount);

  await Promise.all([
    ...survivors.map((enrollment) =>
      EventEnrollmentModel.updateOne(
        { _id: enrollment._id },
        {
          $set: {
            currentCycleSteps: 0,
            lastAppliedDayKey: null,
          },
        },
      ),
    ),
    ...eliminated.map(async (enrollment) => {
      await EventEnrollmentModel.updateOne(
        { _id: enrollment._id },
        {
          $set: {
            status: "eliminated",
            eliminatedAt: archiveDate.toDate(),
            rewardEligible: true,
            currentCycleSteps: 0,
            lastAppliedDayKey: null,
            survivorRewardTier: rewardTier,
          },
        },
      );
      trackEvent(ANALYTICS_EVENTS.EVENT_ABANDONED, {
        user_id: enrollment.uid,
        event_id: enrollment._id,
        event_key: enrollment.eventKey,
        reason: "eliminated",
      });
    }),
  ]);

  return { eliminated: eliminated.length, survivors: survivors.length };
};

const getSurvivorMinParticipantsForEliminationDay = (dayOfMonth: number) => {
  switch (dayOfMonth) {
    case 7:
      return 16;
    case 14:
      return 8;
    case 21:
      return 4;
    case 28:
      return 2;
    default:
      return null;
  }
};

const autoEnrollWarriorPassUsers = async (_currentMonthKey: string) => {
  // Warrior Pass removed — no auto-enroll.
  return 0;
};

export const processDailyEventMaintenance = async ({
  users = [],
  archiveDate = new Date(),
  currentDate = new Date(),
}: DailyMaintenanceParams = {}) => {
  const archiveMoment = getISTMoment(archiveDate);
  const currentMoment = getISTMoment(currentDate);
  const archiveDayKey = archiveMoment.format("YYYY-MM-DD");
  const archiveMonthKey = archiveMoment.format("YYYY-MM");
  const currentMonthKey = currentMoment.format("YYYY-MM");
  const todayStepsByUser = new Map(
    users.map((user) => [user.uid, user.todaysStepCount || 0]),
  );

  const activeEnrollments = await EventEnrollmentModel.find({
    status: "active",
  });

  for (const enrollment of activeEnrollments) {
    const rawSteps = todayStepsByUser.get(enrollment.uid);
    const userSteps = Number.isFinite(Number(rawSteps)) ? Number(rawSteps) : 0;
    const normalizedEventKey = String(enrollment.eventKey || "")
      .trim()
      .toLowerCase();

    if (enrollment.lastAppliedDayKey === archiveDayKey) {
      continue;
    }

    if (normalizedEventKey === EVENT_KEYS.SURVIVOR) {
      if (
        enrollment.seasonKey !== archiveMonthKey ||
        archiveMoment.date() > 28
      ) {
        continue;
      }

      await EventEnrollmentModel.updateOne(
        { _id: enrollment._id },
        {
          $inc: {
            currentCycleSteps: userSteps,
            leaderboardSteps: userSteps,
          },
          $set: {
            lastAppliedDayKey: archiveDayKey,
          },
        },
      );
      continue;
    }

    if (normalizedEventKey === EVENT_KEYS.STEP_CHALLENGE) {
      if (
        enrollment.expiresAt &&
        archiveMoment.isAfter(moment(enrollment.expiresAt).tz(TZ), "day")
      ) {
        await EventEnrollmentModel.updateOne(
          { _id: enrollment._id },
          {
            $set: {
              status: "expired",
              completedAt: enrollment.completedAt || archiveMoment.toDate(),
            },
          },
        );
        trackEvent(ANALYTICS_EVENTS.EVENT_ABANDONED, {
          user_id: enrollment.uid,
          event_id: enrollment._id,
          event_key: enrollment.eventKey,
          reason: "expired",
        });
        continue;
      }

      const shouldCountDay = userSteps >= (enrollment.targetStepsPerDay || 0);
      const inc: Record<string, number> = {
        leaderboardSteps: userSteps,
      };
      const updatePayload: ServiceParams = {
        $inc: inc,
        $set: {
          lastAppliedDayKey: archiveDayKey,
        },
      };

      if (shouldCountDay) {
        inc.qualifiedDays = 1;
      }

      const updated = await EventEnrollmentModel.findOneAndUpdate(
        { _id: enrollment._id },
        updatePayload,
        { new: true },
      );
      if (
        updated &&
        updated.qualifiedDays >= (updated.targetDays || 0) &&
        updated.targetDays > 0
      ) {
        await EventEnrollmentModel.updateOne(
          { _id: updated._id },
          {
            $set: {
              status: "completed",
              completedAt: archiveMoment.toDate(),
              rewardEligible: true,
            },
          },
        );
      }
      continue;
    }

    if (normalizedEventKey === EVENT_KEYS.MARATHON) {
      const baselineSteps = Number(enrollment.enrollmentStartTodaySteps || 0);
      const enrollmentDay = enrollment.enrolledAt
        ? getISTMoment(enrollment.enrolledAt).format("YYYY-MM-DD")
        : null;
      const isEnrollmentDay = enrollmentDay === archiveDayKey;
      const deltaSteps = isEnrollmentDay
        ? Math.max(0, userSteps - baselineSteps)
        : userSteps;

      const setFields: Record<string, unknown> = {
        lastAppliedDayKey: archiveDayKey,
      };
      const updateData: ServiceParams = {
        $inc: {
          leaderboardSteps: Math.max(0, Math.floor(deltaSteps)),
        },
        $set: setFields,
      };
      // Clear enrollment baseline after first sync (only on enrollment day)
      if (isEnrollmentDay) {
        setFields.enrollmentStartTodaySteps = 0;
      }
      const updated = await EventEnrollmentModel.findOneAndUpdate(
        { _id: enrollment._id },
        updateData,
        { new: true },
      );

      if (updated) {
        const totalSteps = Number(updated.leaderboardSteps || 0);
        const distanceKm = Number(
          (totalSteps * DISTANCE_KM_PER_STEP).toFixed(2),
        );
        const calories = Number((totalSteps * CALORIES_PER_STEP).toFixed(2));

        if (userSteps > 0) {
          await sendNotificationToUser(
            enrollment.uid,
            "Marathon Progress Updated",
            `Distance: ${distanceKm} km | Calories: ${calories} kcal`,
          );
        }

        const completedDistance =
          (updated.leaderboardSteps || 0) / STEPS_PER_KM;
        if (completedDistance >= (updated.distanceKm || 0)) {
          await EventEnrollmentModel.updateOne(
            { _id: updated._id },
            {
              $set: {
                status: "completed",
                completedAt: archiveMoment.toDate(),
                rewardEligible: true,
              },
            },
          );
          trackEvent(ANALYTICS_EVENTS.EVENT_COMPLETED, {
            user_id: enrollment.uid,
            event_id: updated._id,
            event_key: enrollment.eventKey,
          });
        }
      }
    }
  }

  let survivorSummary = { eliminated: 0, survivors: 0 };
  const cycleBoundary = archiveMoment.date();
  const minimumParticipants =
    getSurvivorMinParticipantsForEliminationDay(cycleBoundary);

  if (minimumParticipants !== null) {
    const nonEliminatedParticipants = await EventEnrollmentModel.countDocuments(
      {
        eventKey: EVENT_KEYS.SURVIVOR,
        seasonKey: archiveMonthKey,
        status: { $in: ["active", "completed"] },
      },
    );

    if (nonEliminatedParticipants >= minimumParticipants) {
      survivorSummary = await sortAndEliminateSurvivorParticipants(
        archiveMonthKey,
        archiveMoment,
      );
    } else {
      survivorSummary = {
        eliminated: 0,
        survivors: nonEliminatedParticipants,
      };
    }
  }

  if (cycleBoundary === 28) {
    await EventEnrollmentModel.updateMany(
      {
        eventKey: EVENT_KEYS.SURVIVOR,
        seasonKey: archiveMonthKey,
        status: "active",
      },
      {
        $set: {
          status: "completed",
          completedAt: archiveMoment.toDate(),
          rewardEligible: true,
          survivorRewardTier: 5,
        },
      },
    );
  }

  let autoEnrolled = 0;
  if (currentMoment.date() === 1) {
    autoEnrolled = await autoEnrollWarriorPassUsers(currentMonthKey);
  }

  return {
    processedUsers: users.length,
    survivorSummary,
    autoEnrolled,
  };
};

export const getEventLeaderboard = async (
  eventKey: string,
  { planId = null, uid = null }: { planId?: string | null; uid?: string | null } = {},
) => {
  const event = await getEventDefinitionByKey(eventKey);
  if (!event) {
    throw new Error("Unknown event selected.");
  }

  const attachUsernames = async (rows: EnrollmentRow[]) => {
    if (!rows.length) {
      return rows;
    }

    const uids = [...new Set(rows.map((row) => row.uid).filter(Boolean))];
    if (!uids.length) {
      return rows;
    }

    const users = await UserModel.find({ uid: { $in: uids } })
      .select("uid username email")
      .lean();
    const usernameByUid = new Map(
      users.map((user) => [
        user.uid,
        user?.username?.trim()
          ? user.username.trim()
          : user?.email?.split("@")[0]?.trim() || null,
      ]),
    );

    return rows.map((row) => ({
      ...row,
      username: usernameByUid.get(row.uid) || null,
    }));
  };

  if (eventKey === EVENT_KEYS.SURVIVOR) {
    const seasonKey = getMonthKey();
    const rows = await EventEnrollmentModel.find({
      eventKey,
      seasonKey,
      status: { $in: ["active", "eliminated", "completed"] },
    })
      .sort({ currentCycleSteps: -1, enrolledAt: 1 })
      .limit(300)
      .lean();

    const statusPriority: Record<string, number> = {
      completed: 3,
      active: 2,
      eliminated: 1,
    };

    const uniqueByUid = new Map();
    for (const row of rows) {
      const uid = row.uid?.toString();
      if (!uid) continue;

      const existing = uniqueByUid.get(uid);
      if (!existing) {
        uniqueByUid.set(uid, row);
        continue;
      }

      const currentPriority = statusPriority[row.status] || 0;
      const existingPriority = statusPriority[existing.status] || 0;
      if (currentPriority > existingPriority) {
        uniqueByUid.set(uid, row);
        continue;
      }

      if (currentPriority === existingPriority) {
        const currentUpdated = new Date(row.updatedAt || 0).getTime();
        const existingUpdated = new Date(existing.updatedAt || 0).getTime();
        if (currentUpdated > existingUpdated) {
          uniqueByUid.set(uid, row);
          continue;
        }

        if (
          currentUpdated === existingUpdated &&
          (row.leaderboardSteps || 0) > (existing.leaderboardSteps || 0)
        ) {
          uniqueByUid.set(uid, row);
        }
      }
    }

    const uniqueRows = [...uniqueByUid.values()];

    let viewerRow = null;
    if (uid) {
      viewerRow = uniqueRows.find((row) => row.uid?.toString() === uid) || null;
      if (!viewerRow) {
        viewerRow = await EventEnrollmentModel.findOne({
          eventKey,
          seasonKey,
          uid,
          status: { $in: ["active", "eliminated", "completed"] },
        }).lean();
      }
    }

    const rankedRows = [
      ...uniqueRows
        .filter((row) => row.status === "active" || row.status === "completed")
        .sort((a, b) => {
          if ((b.currentCycleSteps || 0) !== (a.currentCycleSteps || 0)) {
            return (b.currentCycleSteps || 0) - (a.currentCycleSteps || 0);
          }
          return new Date(a.enrolledAt || 0).getTime() - new Date(b.enrolledAt || 0).getTime();
        }),
      ...uniqueRows
        .filter((row) => row.status === "eliminated")
        .sort((a, b) => {
          if ((b.leaderboardSteps || 0) !== (a.leaderboardSteps || 0)) {
            return (b.leaderboardSteps || 0) - (a.leaderboardSteps || 0);
          }
          return (
            new Date(b.eliminatedAt || b.completedAt || 0).getTime() -
            new Date(a.eliminatedAt || a.completedAt || 0).getTime()
          );
        }),
    ];

    if (viewerRow) {
      const viewerUid = viewerRow.uid?.toString();
      const alreadyIncluded = rankedRows.some(
        (row) => row.uid?.toString() === viewerUid,
      );
      if (!alreadyIncluded) {
        rankedRows.push(viewerRow);
      }
    }

    return attachUsernames(rankedRows);
  }

  if (eventKey === EVENT_KEYS.MARATHON) {
    const query: MongoFilter = {
      eventKey,
      status: { $in: ["active", "completed"] },
    };
    if (planId) {
      query.planId = planId;
    }

    const rows = await EventEnrollmentModel.find(query)
      .sort({ leaderboardSteps: -1, enrolledAt: 1 })
      .limit(100)
      .lean();

    const uniqueByUid = new Map();
    for (const row of rows) {
      const rowUid = row.uid?.toString();
      if (!rowUid) {
        continue;
      }

      const existing = uniqueByUid.get(rowUid);
      if (!existing) {
        uniqueByUid.set(rowUid, row);
        continue;
      }

      const currentUpdated = new Date(
        row.updatedAt || row.completedAt || row.enrolledAt || 0,
      ).getTime();
      const existingUpdated = new Date(
        existing.updatedAt || existing.completedAt || existing.enrolledAt || 0,
      ).getTime();
      if (currentUpdated > existingUpdated) {
        uniqueByUid.set(rowUid, row);
        continue;
      }

      if (currentUpdated === existingUpdated) {
        const currentSteps = Number(row.leaderboardSteps || 0);
        const existingSteps = Number(existing.leaderboardSteps || 0);
        if (currentSteps > existingSteps) {
          uniqueByUid.set(rowUid, row);
        }
      }
    }

    const rankedRows = [...uniqueByUid.values()].sort((a, b) => {
      if ((b.leaderboardSteps || 0) !== (a.leaderboardSteps || 0)) {
        return (b.leaderboardSteps || 0) - (a.leaderboardSteps || 0);
      }
      return new Date(a.enrolledAt || 0).getTime() - new Date(b.enrolledAt || 0).getTime();
    });

    return attachUsernames(rankedRows);
  }

  return [];
};
