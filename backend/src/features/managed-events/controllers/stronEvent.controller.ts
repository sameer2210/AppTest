// HTTP layer for event creation and lifecycle. Business logic lives in eventService.
// Write actions trust req.user!.uid; reads for catalog/detail are public.

import type { NextFunction, Request, Response } from "express";
import {
  cancelEvent,
  createEvent,
  deleteDraft,
  enrichEventsWithOrganizerAvatar,
  getCatalog,
  getEventByKey,
  getOfficialHomeFeedEvents,
  listOrganizerEvents,
  publishEvent,
  updateEvent,
} from "../services/stronEvent.service.js";
import { STRON_FORMATS } from "../services/stronFormats.service.js";
import { sendError } from "../../../utils/stronHttpError.util.js";
import { ANALYTICS_EVENTS, trackEvent } from "../../../services/analytics.service.js";
import { queryString, routeParam } from "../../../types/controller.util.js";

// Factory that returns a creation handler bound to a specific format.
const makeCreateHandler = (format: string) => async (req: Request, res: Response) => {
  try {
    const event = await createEvent({ uid: req.user!.uid, format, body: req.body || {} });
    trackEvent(ANALYTICS_EVENTS.STRON_EVENT_CREATED, {
      user_id: req.user!.uid,
      event_key: event.key,
      format,
    });
    return res.status(201).json({ success: true, event });
  } catch (error) {
    return sendError(res, error);
  }
};

export const createMarathon = makeCreateHandler(STRON_FORMATS.MARATHON);
export const createStepChallenge = makeCreateHandler(STRON_FORMATS.STEP_CHALLENGE);
export const createKingOfHill = makeCreateHandler(STRON_FORMATS.KING_OF_THE_HILL);
export const createFaceOff = makeCreateHandler(STRON_FORMATS.FACE_OFF);

export const patchEvent = async (req: Request, res: Response) => {
  try {
    const event = await updateEvent({
      uid: req.user!.uid,
      key: routeParam(req.params.key),
      patch: req.body || {},
    });
    trackEvent(ANALYTICS_EVENTS.EVENT_UPDATED, {
      user_id: req.user!.uid,
      event_key: event.key,
      fields_changed: Object.keys(req.body || {}),
    });
    return res.status(200).json({ success: true, event });
  } catch (error) {
    return sendError(res, error);
  }
};

export const publishEventHandler = async (req: Request, res: Response) => {
  try {
    const event = await publishEvent({ uid: req.user!.uid, key: routeParam(req.params.key) });
    trackEvent(ANALYTICS_EVENTS.STRON_EVENT_PUBLISHED, {
      user_id: req.user!.uid,
      event_key: event.key,
      format: event.format,
    });
    return res.status(200).json({ success: true, event });
  } catch (error) {
    return sendError(res, error);
  }
};

export const cancelEventHandler = async (req: Request, res: Response) => {
  try {
    const { event, refundedCount } = await cancelEvent({
      uid: req.user!.uid,
      key: routeParam(req.params.key),
      reason: req.body?.reason,
    });
    trackEvent(ANALYTICS_EVENTS.STRON_EVENT_CANCELLED, {
      user_id: req.user!.uid,
      event_key: event.key,
      format: event.format,
      refunded_count: refundedCount,
    });
    return res.status(200).json({ success: true, event, refundedCount });
  } catch (error) {
    return sendError(res, error);
  }
};

export const deleteDraftHandler = async (req: Request, res: Response) => {
  try {
    const result = await deleteDraft({ uid: req.user!.uid, key: routeParam(req.params.key) });
    trackEvent(ANALYTICS_EVENTS.EVENT_DELETED, {
      user_id: req.user!.uid,
      event_key: routeParam(req.params.key),
    });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getMyEventsHandler = async (req: Request, res: Response) => {
  try {
    const events = await listOrganizerEvents(req.user!.uid);
    const enriched = await enrichEventsWithOrganizerAvatar(events);
    return res.status(200).json({ success: true, events: enriched });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getCatalogHandler = async (req: Request, res: Response) => {
  try {
    const events = await getCatalog({ format: queryString(req.query?.format) || null });
    const enriched = await enrichEventsWithOrganizerAvatar(events);
    return res.status(200).json({ success: true, events: enriched });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getOfficialHomeFeedHandler = async (req: Request, res: Response) => {
  try {
    const events = await getOfficialHomeFeedEvents();
    const enriched = await enrichEventsWithOrganizerAvatar(events);
    return res.status(200).json({ success: true, events: enriched });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getEventDetailHandler = async (req: Request, res: Response) => {
  try {
    const event = await getEventByKey(routeParam(req.params.key));
    const enriched = await enrichEventsWithOrganizerAvatar(event);
    return res.status(200).json({ success: true, event: enriched });
  } catch (error) {
    return sendError(res, error);
  }
};
