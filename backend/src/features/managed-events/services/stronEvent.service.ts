// Event lifecycle service: create (draft), edit (status-aware rules), publish, cancel,
// delete draft, plus organizer/participant listing and catalog reads.

import crypto from "crypto";
import StronEvent, { ACTIVE_LISTING_STATUSES } from "../models/stronEvent.model.js";
import { UserModel } from "../../identity-auth/index.js";
import { Business, ProSubscription } from "../../gym-business/index.js";
import { getStronConfig } from "../../../config/stronConfig.js";
import { assertOrganizerVerified } from "../../../utils/stronOrganizerVerification.util.js";
import {
  STRON_FORMATS,
  MARATHON_MODES,
  buildFormatFields,
} from "./stronFormats.service.js";
import { STRON_STEPS_PER_KM } from "../../../config/stronConfig.js";
import {
  parseIstDayStart,
  parseIstEventStart,
  parseIstEventEnd,
  startOfEventDay,
  endOfEventDay,
  addIstDays,
  startOfIstDay,
  istMoment,
  dayKey,
} from "../../../utils/stronTime.util.js";
import type { ServiceParams, MongoFilter } from "../../../types/service.util.js";
import { codedError } from "../../../utils/stronHttpError.util.js";
import { notifyUser } from "./stronNotification.service.js";
import { refundAndNotifyCancellation } from "./stronLifecycle.service.js";
import type { EventDoc, IStronEvent } from "../types/index.js";
import {
  FORMAT_SHORT,
  DRAFT_EDITABLE,
  PUBLISHED_EDITABLE,
  LIVE_EDITABLE,
  OFFICIAL_HOME_FEED_EMAIL,
  COMPLETED_FEED_WINDOW_MS,
} from "../../../constants/index.js";

export { OFFICIAL_HOME_FEED_EMAIL };



/** Attach organizer profile photo (+ fallback name) so clients do not show placeholder avatars. */
export const enrichEventsWithOrganizerAvatar = async (
  events: ServiceParams | ServiceParams[],
) => {
  const list = (Array.isArray(events) ? events : [events])
    .filter(Boolean)
    .map((event: ServiceParams) => {
      const doc = event as ServiceParams & { toObject?: () => ServiceParams };
      return typeof doc.toObject === "function" ? doc.toObject() : { ...event };
    });
  if (!list.length) return Array.isArray(events) ? [] : null;

  const uids = [
    ...new Set(list.map((event) => event.organizerUid).filter(Boolean)),
  ];
  const users = uids.length
    ? await UserModel.find({ uid: { $in: uids } })
        .select("uid profileImageUrl username receiverName")
        .lean()
    : [];
  const byUid = Object.fromEntries(users.map((user) => [user.uid, user]));

  const enriched = list.map((event) => {
    const user = byUid[event.organizerUid] || null;
    return {
      ...event,
      organizerAvatar:
        event.organizerAvatar || user?.profileImageUrl || null,
      organizerName:
        event.organizerName ||
        user?.receiverName ||
        user?.username ||
        null,
    };
  });

  return Array.isArray(events) ? enriched : enriched[0];
};


const generateEventKey = (format: string) => {
  const short = FORMAT_SHORT[format] || "evt";
  return `sm_${short}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
};

const asPositiveInt = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null;
};

// Resolve the event window from duration + optional client dates, with standard timing rules:
// - Start date: Can be today or any date; start time defaults to 00:00:01 AM IST.
// - Duration: Natural number of days.
// - End date & time: Default 11:59:59 PM IST on (start date + duration days).
// - Registration start date: Default the moment of publishing (now).
// - Registration end date & time: Default event end date and time (11:59:59 PM IST).
const resolveDates = ({
  startDate,
  durationDays,
  registrationEndDate,
  registrationStartDate,
}: ServiceParams) => {
  const duration = asPositiveInt(durationDays);
  if (duration == null) {
    throw codedError("invalid_dates", "durationDays must be a positive integer.");
  }
  const { maxDurationDays } = getStronConfig();
  if (duration > maxDurationDays) {
    throw codedError(
      "invalid_dates",
      `durationDays cannot exceed ${maxDurationDays}.`,
    );
  }

  // Event Start Date (can be today) & Start Time (default 00:00:01 AM IST)
  const start = parseIstEventStart(startDate) || startOfEventDay(new Date());
  
  // Event End Date & End Time (default 11:59:59 PM IST on start + duration days)
  const end = endOfEventDay(start, duration);

  // Registration End Date & Time (default = Event end date and time)
  let regEnd = parseIstEventEnd(registrationEndDate) || end;

  // Registration Start Date & Time (default = current publish moment)
  let regStart = parseIstDayStart(registrationStartDate) || new Date();

  // Auto-clamp registration end date to event end date so client payload slight mismatches don't break creation
  if (regEnd.getTime() > end.getTime()) {
    regEnd = end;
  }
  if (regStart.getTime() > regEnd.getTime()) {
    regStart = new Date(Math.min(regStart.getTime(), regEnd.getTime()));
  }

  return {
    durationDays: duration,
    startDate: start,
    endDate: end,
    registrationEndDate: regEnd,
    registrationStartDate: regStart,
  };
};

const normalizeStringList = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v || "").trim()).filter(Boolean);
};

// Create a draft event for a given format. The organizer must be verified.
export const createEvent = async ({
  uid,
  format,
  body = {},
}: {
  uid: string;
  format: string;
  body?: ServiceParams;
}) => {
  await assertOrganizerVerified(uid);

  const { ticketTypes, formatFields } = buildFormatFields({ format, body });
  const dates = resolveDates({
    startDate: body.startDate,
    durationDays: body.durationDays,
    registrationEndDate: body.registrationEndDate,
    registrationStartDate: body.registrationStartDate,
  });

  const title = String(body.title || "").trim();
  if (!title) {
    throw codedError("validation_error", "title is required.");
  }

  const capacity = asPositiveInt(body.capacity);
  const rules = Array.isArray(body.rules)
    ? body.rules.map((r) => String(r).trim()).filter(Boolean)
    : String(body.rules || "")
        .split("\n")
        .map((r) => r.trim())
        .filter(Boolean);

  const listingTypeRaw = String(body.listingType || "");
  const listingType = ["stron_managed", "self_managed", "external"].includes(listingTypeRaw)
    ? listingTypeRaw
    : "stron_managed";

  const rewardLabels = normalizeStringList(body.rewardLabels);
  const participantInfoFields = normalizeStringList(body.participantInfoFields);

  const event = await StronEvent.create({
    key: generateEventKey(format),
    organizerUid: uid,
    organizerName: body.organizerName ? String(body.organizerName).trim() : null,
    format,
    title,
    description: String(body.description || "").trim(),
    rules,
    bannerName: body.bannerName ? String(body.bannerName).trim() : null,
    marathonMode: formatFields.marathonMode,
    destination: formatFields.destination,
    virtualLink: body.virtualLink ? String(body.virtualLink).trim() : null,
    successfulDaysRequired: formatFields.successfulDaysRequired,
    ticketTypes,
    capacity,
    listingType,
    rewardLabels,
    participantInfoFields,
    ...dates,
    status: "draft",
  });

  return event;
};

const loadOwnedEvent = async (uid: string, key: string) => {
  const event = await StronEvent.findOne({ key });
  if (!event) {
    throw codedError("event_not_found", "Event not found.");
  }
  if (event.organizerUid !== uid) {
    throw codedError("not_owner", "You do not manage this event.");
  }
  return event;
};

// Apply a patch respecting status-aware edit rules; ticket prices handled separately.
export const updateEvent = async ({
  uid,
  key,
  patch = {},
}: {
  uid: string;
  key: string;
  patch?: ServiceParams;
}) => {
  const event = await loadOwnedEvent(uid, key);

  if (["completed", "settled", "cancelled"].includes(event.status)) {
    throw codedError("invalid_state", `A ${event.status} event can no longer be edited.`);
  }

  let allowed;
  if (event.status === "draft") {
    allowed = DRAFT_EDITABLE;
  } else if (event.status === "live") {
    allowed = LIVE_EDITABLE;
  } else {
    allowed = PUBLISHED_EDITABLE;
  }

  // Title / description / rules / banner.
  if (patch.title !== undefined && allowed.has("title")) {
    const title = String(patch.title).trim();
    if (!title) throw codedError("validation_error", "title cannot be empty.");
    event.title = title;
  }
  if (patch.description !== undefined && allowed.has("description")) {
    event.description = String(patch.description).trim();
  }
  if (patch.rules !== undefined && allowed.has("rules")) {
    event.rules = Array.isArray(patch.rules)
      ? patch.rules.map((r) => String(r).trim()).filter(Boolean)
      : String(patch.rules).split("\n").map((r) => r.trim()).filter(Boolean);
  }
  if (patch.bannerName !== undefined && allowed.has("bannerName")) {
    event.bannerName = patch.bannerName ? String(patch.bannerName).trim() : null;
  }

  // Capacity: cannot drop below what is already sold.
  if (patch.capacity !== undefined && allowed.has("capacity")) {
    const capacity = asPositiveInt(patch.capacity);
    if (capacity == null) {
      throw codedError("invalid_capacity", "capacity must be a positive integer.");
    }
    if (capacity < event.registrationCount) {
      throw codedError(
        "invalid_capacity",
        `capacity cannot be lower than current registrations (${event.registrationCount}).`,
      );
    }
    event.capacity = capacity;
    if (event.soldOut && capacity > event.registrationCount) {
      event.soldOut = false;
    }
  }

  // Registration end date: must stay within the event window.
  if (patch.registrationEndDate !== undefined && allowed.has("registrationEndDate")) {
    const regEnd = parseIstEventEnd(patch.registrationEndDate);
    if (!regEnd) {
      throw codedError("invalid_dates", "registrationEndDate is invalid.");
    }
    const finalRegEnd = event.endDate && regEnd > event.endDate ? event.endDate : regEnd;
    event.registrationEndDate = finalRegEnd;
  }

  if (patch.registrationStartDate !== undefined && allowed.has("registrationStartDate")) {
    const regStart = parseIstDayStart(patch.registrationStartDate);
    if (!regStart) {
      throw codedError("invalid_dates", "registrationStartDate is invalid.");
    }
    const regEnd = event.registrationEndDate;
    if (regEnd && regStart > regEnd) {
      event.registrationStartDate = regEnd;
    } else {
      event.registrationStartDate = regStart;
    }
  }

  if (patch.rewardLabels !== undefined && allowed.has("rewardLabels")) {
    event.rewardLabels = normalizeStringList(patch.rewardLabels);
  }

  if (patch.participantInfoFields !== undefined && allowed.has("participantInfoFields")) {
    event.participantInfoFields = normalizeStringList(patch.participantInfoFields);
  }

  // Start date / duration are only mutable in draft; recompute the window together.
  if (event.status === "draft") {
    const wantsDateChange =
      patch.startDate !== undefined || patch.durationDays !== undefined;
    if (wantsDateChange) {
      const dates = resolveDates({
        startDate: patch.startDate ?? event.startDate,
        durationDays: patch.durationDays ?? event.durationDays,
        registrationEndDate: patch.registrationEndDate ?? event.registrationEndDate,
        registrationStartDate:
          patch.registrationStartDate ?? event.registrationStartDate,
      });
      event.startDate = dates.startDate;
      event.endDate = dates.endDate;
      event.durationDays = dates.durationDays;
      event.registrationEndDate = dates.registrationEndDate;
      event.registrationStartDate = dates.registrationStartDate;
    }
    if (
      patch.successfulDaysRequired !== undefined &&
      event.format === STRON_FORMATS.STEP_CHALLENGE
    ) {
      const y = asPositiveInt(patch.successfulDaysRequired);
      if (y == null) {
        throw codedError("validation_error", "successfulDaysRequired must be positive.");
      }
      event.successfulDaysRequired = Math.min(y, event.durationDays || 90);
    }
  }

  if (
    patch.destination !== undefined &&
    allowed.has("destination") &&
    (event.format === STRON_FORMATS.MARATHON ||
      event.format === STRON_FORMATS.STEP_CHALLENGE)
  ) {
    event.destination = patch.destination ? String(patch.destination).trim() : null;
  }
  if (patch.virtualLink !== undefined && allowed.has("virtualLink")) {
    event.virtualLink = patch.virtualLink ? String(patch.virtualLink).trim() : null;
  }

  // Ticket edits: update existing by id; draft/published may also append new tiers.
  if (Array.isArray(patch.tickets)) {
    applyTicketEdits(event as unknown as EventDoc, patch.tickets as ServiceParams[]);
  }

  await event.save();
  return event;
};

const buildNewTicketFromPatch = (
  event: EventDoc,
  patch: ServiceParams,
  index: number,
): ServiceParams => {
  const price = Number(patch.price);
  if (!Number.isFinite(price) || price < 0) {
    throw codedError("invalid_price", "New ticket price must be zero or more.");
  }
  const label = String(patch.label || `Ticket ${index + 1}`).trim();
  if (!label) {
    throw codedError("validation_error", "New ticket title is required.");
  }

  const id = String(patch.id || `t${Date.now()}${index}`).trim();
  const ticketTypes = event.ticketTypes || [];
  if (ticketTypes.some((t: ServiceParams) => t.id === id)) {
    throw codedError("validation_error", `Ticket id "${id}" already exists.`);
  }

  // Face Off / KotH stay single-ticket formats.
  if (
    (event.format === STRON_FORMATS.FACE_OFF ||
      event.format === STRON_FORMATS.KING_OF_THE_HILL) &&
    (event.ticketTypes?.length ?? 0) >= 1
  ) {
    throw codedError(
      "invalid_tickets",
      `${event.format} supports exactly one ticket type.`,
    );
  }

  const ticket: ServiceParams = {
    id,
    label,
    price,
    distanceKm: null as null,
    targetSteps: null as null,
    days: null as null,
    dailyStepTarget: null as null,
    soldCount: 0,
    benefits: String(patch.benefits || "").trim(),
  };

  if (event.format === STRON_FORMATS.MARATHON) {
    const distanceKm = Number(patch.distanceKm);
    const targetSteps = Number(patch.targetSteps);
    const days = Math.floor(Number(patch.days));
    const hasDistance = Number.isFinite(distanceKm) && distanceKm > 0;
    const hasSteps = Number.isFinite(targetSteps) && targetSteps > 0;
    if (!hasDistance && !hasSteps) {
      throw codedError(
        "invalid_ticket",
        "New marathon ticket needs distanceKm or targetSteps.",
      );
    }
    if (!Number.isFinite(days) || days <= 0) {
      throw codedError("invalid_ticket", "New marathon ticket needs days > 0.");
    }
    ticket.distanceKm = hasDistance
      ? distanceKm
      : Number((targetSteps / STRON_STEPS_PER_KM).toFixed(3));
    ticket.targetSteps = hasSteps
      ? Math.floor(targetSteps)
      : Math.ceil(distanceKm * STRON_STEPS_PER_KM);
    ticket.days = days;
  } else if (event.format === STRON_FORMATS.STEP_CHALLENGE) {
    const dailyStepTarget = Math.floor(Number(patch.dailyStepTarget));
    if (!Number.isFinite(dailyStepTarget) || dailyStepTarget <= 0) {
      throw codedError(
        "invalid_ticket",
        "New step-challenge ticket needs dailyStepTarget > 0.",
      );
    }
    ticket.dailyStepTarget = dailyStepTarget;
  }

  return ticket;
};

// Update ticket fields by id, or append new tiers (draft + published, not live).
// Draft: full field edits. Published: price + benefits on existing; full fields on new.
const applyTicketEdits = (event: EventDoc, ticketPatches: ServiceParams[]) => {
  const ticketTypes = event.ticketTypes || [];
  const byId = new Map(ticketTypes.map((t: ServiceParams) => [t.id, t]));
  const isDraft = event.status === "draft";
  const canAdd = isDraft || event.status === "published";

  for (const [index, patch] of ticketPatches.entries()) {
    const id = String(patch.id || "");
    let ticket: ServiceParams | null = id
      ? ((byId.get(id) as ServiceParams | undefined) ?? null)
      : null;

    if (!ticket) {
      if (!canAdd) {
        throw codedError(
          "invalid_state",
          "New ticket types can only be added before the event goes live.",
        );
      }
      ticket = buildNewTicketFromPatch(event, patch, ticketTypes.length + index);
      if (!event.ticketTypes) event.ticketTypes = [];
      event.ticketTypes.push(ticket);
      byId.set(String(ticket.id), ticket);
      continue;
    }

    if (patch.price !== undefined) {
      const price = Number(patch.price);
      if (!Number.isFinite(price) || price < 0) {
        throw codedError("invalid_price", "Ticket price must be zero or more.");
      }
      ticket.price = price;
    }

    // Features / inclusions — editable while registration is still open (draft + published).
    if (patch.benefits !== undefined && canAdd) {
      ticket.benefits = String(patch.benefits || "").trim();
    }

    if (!isDraft) continue;

    if (patch.label !== undefined) {
      ticket.label = String(patch.label).trim() || ticket.label;
    }
    if (patch.distanceKm !== undefined) {
      const distanceKm = Number(patch.distanceKm);
      if (!Number.isFinite(distanceKm) || distanceKm <= 0) {
        throw codedError("validation_error", "distanceKm must be greater than 0.");
      }
      ticket.distanceKm = distanceKm;
      ticket.targetSteps = Math.ceil(distanceKm * STRON_STEPS_PER_KM);
    }
    if (patch.days !== undefined) {
      const days = Math.floor(Number(patch.days));
      if (!Number.isFinite(days) || days <= 0) {
        throw codedError("validation_error", "days must be greater than 0.");
      }
      ticket.days = days;
    }
    if (patch.targetSteps !== undefined) {
      const targetSteps = Math.floor(Number(patch.targetSteps));
      if (!Number.isFinite(targetSteps) || targetSteps <= 0) {
        throw codedError("validation_error", "targetSteps must be greater than 0.");
      }
      ticket.targetSteps = targetSteps;
    }
    if (patch.dailyStepTarget !== undefined) {
      const dailyStepTarget = Math.floor(Number(patch.dailyStepTarget));
      if (!Number.isFinite(dailyStepTarget) || dailyStepTarget <= 0) {
        throw codedError("validation_error", "dailyStepTarget must be greater than 0.");
      }
      ticket.dailyStepTarget = dailyStepTarget;
    }
  }
  event.markModified?.("ticketTypes");
};

// Validate everything a draft needs, enforce listing limits, and publish.
export const publishEvent = async ({
  uid,
  key,
}: ServiceParams & { uid: string; key: string }) => {
  const organizer = await assertOrganizerVerified(uid);
  const event = await loadOwnedEvent(uid, key);

  if (event.status !== "draft") {
    throw codedError("invalid_state", "Only a draft event can be published.");
  }
  if (!event.ticketTypes.length) {
    throw codedError("invalid_tickets", "At least one ticket type is required.");
  }
  const allowFreeTickets = true;
  if ((event.ticketTypes || []).some((t: ServiceParams) => !(Number(t.price) >= 0))) {
    throw codedError(
      "invalid_price",
      "Every ticket must have a price of zero or more.",
    );
  }
  if (event.capacity != null && !(event.capacity > 0)) {
    throw codedError("invalid_capacity", "Capacity must be a positive integer.");
  }
  if (!event.startDate || !event.endDate || !event.registrationEndDate) {
    throw codedError("invalid_dates", "Event dates are incomplete.");
  }
  if (event.startDate > event.endDate) {
    throw codedError("invalid_dates", "startDate must be on or before endDate.");
  }
  if (
    event.format === STRON_FORMATS.MARATHON &&
    event.marathonMode === MARATHON_MODES.IN_PERSON &&
    !event.destination
  ) {
    throw codedError("destination_required", "An in-person marathon requires a destination.");
  }
  if (
    event.format === STRON_FORMATS.STEP_CHALLENGE &&
    Number(event.successfulDaysRequired ?? 0) > Number(event.durationDays ?? 0)
  ) {
    event.successfulDaysRequired = Math.max(1, event.durationDays || 1);
  }

  await enforceListingLimit(organizer as ServiceParams, uid);

  event.status = "published";
  event.publishedAt = new Date();
  // Default registration start is publish time. Never leave a post-publish gap when
  // reg start was auto-aligned to a future event start day.
  if (
    !event.registrationStartDate ||
    (event.startDate &&
      dayKey(event.registrationStartDate) === dayKey(event.startDate) &&
      event.registrationStartDate > event.publishedAt)
  ) {
    event.registrationStartDate = event.publishedAt;
  }
  // If the start day has already arrived, the lifecycle cron will promote it to live.
  await event.save();
  await notifyUser(
    uid,
    "Event published",
    `${event.title} is live for registrations.`,
    { eventKey: event.key, tag: "New Event is Live Now" },
  );
  return event;
};

// STRON-managed listing cap: 1 active for free tier, unlimited for PRO / teams.
const enforceListingLimit = async (organizer: ServiceParams, uid: string) => {
  if (organizer.accountType === "team") {
    return;
  }

  // Check if organizer has an active or trial STRON PRO subscription
  const business = await Business.findOne({ ownerId: uid }).select("_id").lean();
  const proSub = await ProSubscription.findOne({
    $or: [
      { userId: uid },
      ...(business ? [{ businessId: business._id }] : []),
    ],
    status: { $in: ["ACTIVE", "TRIAL"] },
  })
    .select("_id")
    .lean();
  if (proSub) {
    // PRO subscribers have unlimited listings
    return;
  }

  const { activeListingLimit } = getStronConfig();
  const limit = activeListingLimit || 1;
  const activeCount = await StronEvent.countDocuments({
    organizerUid: uid,
    listingType: "stron_managed",
    status: { $in: ACTIVE_LISTING_STATUSES },
  });
  if (activeCount >= limit) {
    throw codedError(
      "listing_limit_reached",
      `You can have at most ${limit} active listing(s). Upgrade to STRON PRO for unlimited listings.`,
    );
  }
};

// Cancel a published event before it goes live, and trigger refund/notifications.
export const cancelEvent = async ({
  uid,
  key,
  reason = null,
}: ServiceParams & { uid: string; key: string; reason?: string | null }) => {
  const event = await loadOwnedEvent(uid, key);
  if (event.status !== "published") {
    throw codedError(
      "invalid_state",
      "Only a published event that has not gone live can be cancelled.",
    );
  }
  event.status = "cancelled";
  event.cancelledAt = new Date();
  event.cancelReason = reason ? String(reason).trim() : null;
  await event.save();

  const { refundedCount } = await refundAndNotifyCancellation(event);
  return { event, refundedCount };
};

export const deleteDraft = async ({
  uid,
  key,
}: ServiceParams & { uid: string; key: string }) => {
  const event = await loadOwnedEvent(uid, key);
  await StronEvent.deleteOne({ _id: event._id });
  return { key };
};

export const listOrganizerEvents = async (uid: string) =>
  StronEvent.find({ organizerUid: uid }).sort({ createdAt: -1 });

export const getEventByKey = async (key: string) => {
  let event = await StronEvent.findOne({ key });
  if (!event && key && String(key).length === 24) {
    try {
      event = await StronEvent.findById(key);
    } catch {
      // Ignore ObjectId cast error
    }
  }
  if (!event) {
    throw codedError("event_not_found", "Event not found.");
  }
  return event;
};

// Whether registration is currently open (used by the participation flow).
export const isRegistrationOpen = (event: EventDoc) => {
  if (!["published", "live"].includes(String(event.status || "")) || event.soldOut) {
    return false;
  }
  const now = istMoment().toDate();
  if (event.registrationEndDate && now > new Date(event.registrationEndDate as Date)) {
    return false;
  }

  if (event.registrationStartDate && now < new Date(event.registrationStartDate as Date)) {
    // Create UI used to auto-pin registration start to the event start day, which
    // blocked signups after publish until that midnight. If reg start aligns with
    // the event start day and the event is already published, open from publish time.
    const publishedAt = event.publishedAt ? new Date(event.publishedAt) : null;
    const alignedToEventStart =
      event.startDate &&
      dayKey(event.registrationStartDate as Date) === dayKey(event.startDate as Date);
    if (publishedAt && now >= publishedAt && alignedToEventStart) {
      return true;
    }
    return false;
  }

  return true;
};

// Public catalog: discoverable events (published/live), optionally filtered by format.
// Order: registration open (nearest start to today) → registration closed (nearest start).
export const getCatalog = async ({
  format = null,
}: { format?: string | null } = {}) => {
  const query: MongoFilter = {
    status: { $in: ["published", "live", "completed", "settled"] },
  };
  if (format) {
    query.format = format;
  }
  const events = await StronEvent.find(query);
  const now = Date.now();
  const proximity = (event: EventDoc) => {
    if (!event?.startDate) return Number.POSITIVE_INFINITY;
    const t = new Date(event.startDate as Date).getTime();
    return Number.isFinite(t) ? Math.abs(t - now) : Number.POSITIVE_INFINITY;
  };
  return [...events].sort((a, b) => {
    const aOpen = isRegistrationOpen(a as unknown as EventDoc) ? 0 : 1;
    const bOpen = isRegistrationOpen(b as unknown as EventDoc) ? 0 : 1;
    if (aOpen !== bOpen) return aOpen - bOpen;
    return proximity(a as unknown as EventDoc) - proximity(b as unknown as EventDoc);
  });
};


/**
 * Home Feed official slice: events created by stepwars2025@gmail.com that are
 * published/live, or completed/settled within the last 7 days.
 */
export const getOfficialHomeFeedEvents = async () => {
  const { UserModel } = await import("../../identity-auth/index.js");
  const escaped = OFFICIAL_HOME_FEED_EMAIL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const user = await UserModel.findOne({
    email: { $regex: new RegExp(`^${escaped}$`, "i") },
  })
    .select("uid")
    .lean();

  if (!user?.uid) return [];

  const since = new Date(Date.now() - COMPLETED_FEED_WINDOW_MS);
  const events = await StronEvent.find({
    organizerUid: user.uid,
    $or: [
      { status: { $in: ["published", "live"] } },
      {
        status: { $in: ["completed", "settled"] },
        $or: [
          { completedAt: { $gte: since } },
          { completedAt: null, endDate: { $gte: since } },
          { completedAt: null, endDate: null, updatedAt: { $gte: since } },
        ],
      },
    ],
  });

  const now = Date.now();
  const activeEvents = events.filter((e) => {
    const status = (e.status || "").toLowerCase();
    if (["completed", "settled", "cancelled", "ended"].includes(status)) return false;

    const endMs = e.endDate
      ? new Date(e.endDate).getTime()
      : e.startDate
        ? new Date(e.startDate).getTime() + (e.durationDays || 1) * 86400000
        : null;

    if (endMs && Number.isFinite(endMs) && endMs < now) {
      return false;
    }
    return true;
  });

  return activeEvents.sort((a, b) => {
    const aT = a?.startDate ? new Date(a.startDate).getTime() : Number.POSITIVE_INFINITY;
    const bT = b?.startDate ? new Date(b.startDate).getTime() : Number.POSITIVE_INFINITY;
    const aProx = Number.isFinite(aT) ? Math.abs(aT - now) : Number.POSITIVE_INFINITY;
    const bProx = Number.isFinite(bT) ? Math.abs(bT - now) : Number.POSITIVE_INFINITY;
    return aProx - bProx;
  });
};
