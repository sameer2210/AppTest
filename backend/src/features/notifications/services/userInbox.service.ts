import UserNotification from "../models/userNotification.model.js";
import { StronEvent } from "../../managed-events/index.js";
import { getErrorMessage } from "../../../types/mongo.util.js";
import type { PaginationQuery, ServiceParams } from "../../../types/service.util.js";
import { logger } from "../../../utils/logger.util.js";
import { ENDED_EVENT_STATUSES } from "../../../constants/index.js";


export const deriveNotificationTag = (title = "") => {
  const t = String(title).toLowerCase();
  if (t.includes("completed")) return "Event Completed";
  if (t.includes("cancelled") || t.includes("canceled")) return "Event Cancelled";
  if (t.includes("you're in") || t.includes("ticket")) return "Ticket Confirmed";
  if (t.includes("it's on") || t.includes("started")) return "Event Started";
  if (t.includes("published") || t.includes("live")) return "New Event is Live Now";
  return title || "Update";
};

const toInboxRow = (row: ServiceParams) => ({
  id: String(row._id),
  tag: row.tag,
  title: row.title,
  body: row.body || "",
  eventKey: row.eventKey || null,
  data: row.data || null,
  readAt: row.readAt || null,
  createdAt: row.createdAt,
});

const isActiveEventNotification = (
  row: ServiceParams,
  eventByKey: Map<string, ServiceParams>,
  nowMs: number,
) => {
  if (!row.eventKey) return true;
  const event = eventByKey.get(String(row.eventKey));
  if (!event) return false;
  if (ENDED_EVENT_STATUSES.has(String(event.status))) return false;
  if (event.endDate && new Date(event.endDate as string | Date).getTime() < nowMs) return false;
  return true;
};

const loadEventsByKey = async (eventKeys: unknown[]) => {
  const uniqueKeys = [...new Set(eventKeys.filter(Boolean).map(String))];
  if (uniqueKeys.length === 0) return new Map<string, ServiceParams>();
  const events = await StronEvent.find({ key: { $in: uniqueKeys } })
    .select("key status endDate")
    .lean();
  return new Map(events.map((event) => [event.key, event as ServiceParams]));
};

export const createInboxNotification = async ({
  uid,
  title,
  body = "",
  eventKey = null,
  tag = null,
  data = null,
}: ServiceParams) => {
  if (!uid || String(uid).startsWith("bot_")) return null;
  try {
    return await UserNotification.create({
      uid,
      title: title || "Update",
      body: body || "",
      eventKey: eventKey || null,
      tag: tag || deriveNotificationTag(title),
      data: data || null,
    });
  } catch (error: unknown) {
    logger.warn("[inbox] create failed:", getErrorMessage(error));
    return null;
  }
};

export const listInboxNotifications = async (
  uid: string,
  { limit = 50 }: PaginationQuery = {},
) => {
  const cap = Math.min(Number(limit) || 50, 100);
  const rows = await UserNotification.find({ uid, dismissedAt: null })
    .sort({ createdAt: -1 })
    .limit(cap * 2)
    .lean();

  const eventByKey = await loadEventsByKey(rows.map((row) => row.eventKey));
  const nowMs = Date.now();

  return rows
    .filter((row) => isActiveEventNotification(row as ServiceParams, eventByKey, nowMs))
    .slice(0, cap)
    .map((row) => toInboxRow(row as ServiceParams));
};

export const getUnreadCount = async (uid: string) => {
  const rows = await UserNotification.find({ uid, readAt: null, dismissedAt: null })
    .select("eventKey")
    .lean();
  const eventByKey = await loadEventsByKey(rows.map((row) => row.eventKey));
  const nowMs = Date.now();
  return rows.filter((row) => isActiveEventNotification(row as ServiceParams, eventByKey, nowMs))
    .length;
};

export const markNotificationRead = async (uid: string, id: string) => {
  const row = await UserNotification.findOneAndUpdate(
    { _id: id, uid, dismissedAt: null },
    { $set: { readAt: new Date() } },
    { new: true },
  ).lean();
  return row;
};

export const markAllNotificationsRead = async (uid: string) => {
  const result = await UserNotification.updateMany(
    { uid, readAt: null, dismissedAt: null },
    { $set: { readAt: new Date() } },
  );
  return result.modifiedCount || 0;
};

export const dismissNotification = async (uid: string, id: string) => {
  const row = await UserNotification.findOneAndUpdate(
    { _id: id, uid, dismissedAt: null },
    { $set: { dismissedAt: new Date(), readAt: new Date() } },
    { new: true },
  ).lean();
  return row;
};
