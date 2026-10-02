import EventCatalogItemModel from "../models/eventCatalogItem.model.js";
import moment from "moment-timezone";
import {
  EVENT_CATALOG,
  EVENT_KEYS,
  buildMarathonPhysicalEvent,
  getEventDefinition as getBuiltInEventDefinition,
} from "../../../config/eventCatalog.js";
import type { ServiceParams } from "../../../types/service.util.js";
import type { CatalogEvent, IEventCatalogItem } from "../types/index.js";
import { TZ } from "../../../constants/index.js";


const isExpiredByEventDate = (event: CatalogEvent | null | undefined) => {
  const customMeta = event?.customMeta;
  if (!customMeta || typeof customMeta !== "object") {
    return false;
  }

  const metaRecord = customMeta as Record<string, unknown>;
  const eventDateRaw = metaRecord.eventDate;
  if (!eventDateRaw) {
    return false;
  }

  const eventDate = moment(eventDateRaw as string | Date).tz(TZ);
  if (!eventDate.isValid()) {
    return false;
  }

  // Event should vanish from the start of the next day in IST.
  const expiresAt = eventDate.clone().add(1, "day").startOf("day");
  return moment().tz(TZ).isSameOrAfter(expiresAt);
};

const isVisibleCatalogEvent = (event: CatalogEvent | null | undefined) =>
  !isExpiredByEventDate(event);

const normalizeEventDefinition = (event: CatalogEvent | null | undefined) => {
  if (!event) {
    return null;
  }

  if (typeof event.toObject === "function") {
    return event.toObject();
  }

  return {
    ...event,
    rules: Array.isArray(event.rules) ? [...event.rules] : [],
    plans: Array.isArray(event.plans)
      ? event.plans.map((plan: ServiceParams) => ({ ...plan }))
      : [],
    customMeta:
      event.customMeta && typeof event.customMeta === "object"
        ? { ...event.customMeta }
        : {},
  };
};

export const listCatalogEvents = async () => {
  const persistedEvents = await EventCatalogItemModel.find({}).sort({
    updatedAt: -1,
    createdAt: -1,
  });

  return [
    ...EVENT_CATALOG.map((event) =>
      normalizeEventDefinition(event as unknown as CatalogEvent),
    ),
    ...persistedEvents.map((event) =>
      normalizeEventDefinition(event as unknown as CatalogEvent),
    ),
  ].filter(isVisibleCatalogEvent);
};

export const getEventDefinitionByKey = async (eventKey: string) => {
  const builtInEvent = getBuiltInEventDefinition(eventKey);
  if (builtInEvent) {
    const normalizedBuiltIn = normalizeEventDefinition(
      builtInEvent as unknown as CatalogEvent,
    );
    return isVisibleCatalogEvent(normalizedBuiltIn) ? normalizedBuiltIn : null;
  }

  const persistedEvent = await EventCatalogItemModel.findOne({ key: eventKey });
  const normalizedPersisted = normalizeEventDefinition(
    persistedEvent as unknown as CatalogEvent,
  );
  return isVisibleCatalogEvent(normalizedPersisted)
    ? normalizedPersisted
    : null;
};

export const saveMarathonPhysicalEvent = async (payload: ServiceParams = {}) => {
  const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const eventKey =
    payload?.key && String(payload.key).trim().length > 0
      ? String(payload.key).trim()
      : `${EVENT_KEYS.MARATHON_PHYSICAL}_${uniqueSuffix}`;

  const eventDefinition = buildMarathonPhysicalEvent({
    ...payload,
    key: eventKey,
  });
  const { _id, ...eventToStore } = eventDefinition;

  const savedEvent = await EventCatalogItemModel.create(eventToStore);

  return normalizeEventDefinition(savedEvent as unknown as CatalogEvent);
};
