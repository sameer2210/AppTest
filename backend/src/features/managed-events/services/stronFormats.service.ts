import { STRON_STEPS_PER_KM } from "../../../config/stronConfig.js";
import type { StronErrorCode } from "../../../types/errors.js";
import type { ServiceParams } from "../../../types/service.util.js";
import { codedError } from "../../../utils/stronHttpError.util.js";

import {
  STRON_FORMATS,
  STRON_FORMAT_VALUES,
  SLUG_TO_FORMAT,
  MARATHON_MODES,
  DAILY_MATCH_FORMATS,
} from "../../../constants/index.js";

export {
  STRON_FORMATS,
  STRON_FORMAT_VALUES,
  SLUG_TO_FORMAT,
  MARATHON_MODES,
  DAILY_MATCH_FORMATS,
};


const fail = (code: StronErrorCode, message: string): never => {
  throw codedError(code, message);
};

const asPositiveNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const asNonNegativeNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

// Every ticket needs a stable id, a label, and a price of zero or more (free allowed).
const baseTicket = (raw: ServiceParams, index: number, { allowFree = true } = {}) => {
  const price = allowFree ? asNonNegativeNumber(raw?.price) : asPositiveNumber(raw?.price);
  if (price == null) {
    fail(
      "invalid_ticket",
      allowFree
        ? `Ticket ${index + 1}: price must be zero or more.`
        : `Ticket ${index + 1}: price must be greater than 0.`,
    );
  }
  return {
    id: String(raw?.id || `t${index + 1}`).trim(),
    label: String(raw?.label || `Ticket ${index + 1}`).trim(),
    price,
    distanceKm: null as number | null,
    targetSteps: null as number | null,
    days: null as number | null,
    dailyStepTarget: null as number | null,
    soldCount: 0,
    benefits: String(raw?.benefits || "").trim(),
  };
};

const buildMarathonTickets = (rawTickets: ServiceParams[], { allowFree = true } = {}) => {
  if (!Array.isArray(rawTickets) || rawTickets.length < 1) {
    fail("invalid_tickets", "Marathon requires at least one ticket with a distance/steps target.");
  }
  return rawTickets.map((raw, index) => {
    const ticket = baseTicket(raw, index, { allowFree });
    const distanceKm = asPositiveNumber(raw?.distanceKm);
    const targetSteps = asPositiveNumber(raw?.targetSteps);
    const days = asPositiveNumber(raw?.days);
    if (distanceKm == null && targetSteps == null) {
      fail("invalid_ticket", `Ticket ${index + 1}: provide a distance (km) or a steps target.`);
    }
    if (days == null) {
      fail("invalid_ticket", `Ticket ${index + 1}: provide the number of days to complete.`);
    }
    // Keep distance and steps in sync so progress can be computed from either.
    const resolvedDistance =
      distanceKm ?? Number(((targetSteps as number) / STRON_STEPS_PER_KM).toFixed(3));
    const resolvedSteps =
      targetSteps ?? Math.ceil((distanceKm as number) * STRON_STEPS_PER_KM);
    ticket.distanceKm = resolvedDistance;
    ticket.targetSteps = resolvedSteps;
    ticket.days = Math.floor(days as number);
    return ticket;
  });
};

const buildStepChallengeTickets = (rawTickets: ServiceParams[], { allowFree = true } = {}) => {
  if (!Array.isArray(rawTickets) || rawTickets.length < 1) {
    fail("invalid_tickets", "Step Challenge requires at least one ticket with a daily steps target.");
  }
  return rawTickets.map((raw, index) => {
    const ticket = baseTicket(raw, index, { allowFree });
    const dailyStepTarget = asPositiveNumber(raw?.dailyStepTarget);
    if (dailyStepTarget == null) {
      fail("invalid_ticket", `Ticket ${index + 1}: provide a daily steps target.`);
    }
    ticket.dailyStepTarget = Math.floor(dailyStepTarget as number);
    return ticket;
  });
};

const buildSingleTicket = (rawTickets: ServiceParams[], label: string, { allowFree = true } = {}) => {
  const list = Array.isArray(rawTickets) ? rawTickets : [];
  if (list.length !== 1) {
    fail("invalid_tickets", `${label} requires exactly one ticket type.`);
  }
  return [baseTicket(list[0], 0, { allowFree })];
};

// Validate the create payload for a format and return normalized event fields.
export const buildFormatFields = ({ format, body }: ServiceParams) => {
  const rawTickets = body?.tickets || body?.ticketTypes;

  if (format === STRON_FORMATS.MARATHON) {
    const mode = String(body?.marathonMode || MARATHON_MODES.VIRTUAL).trim();
    if (mode !== MARATHON_MODES.VIRTUAL && mode !== MARATHON_MODES.IN_PERSON) {
      fail("invalid_marathon_mode", "marathonMode must be 'virtual' or 'in_person'.");
    }
    const destination = String(body?.destination || "").trim() || null;
    if (mode === MARATHON_MODES.IN_PERSON && !destination) {
      fail("destination_required", "An in-person marathon requires a destination.");
    }
    const allowFree = true;
    return {
      ticketTypes: buildMarathonTickets(rawTickets, { allowFree }),
      formatFields: { marathonMode: mode, destination, successfulDaysRequired: null as number | null },
    };
  }

  if (format === STRON_FORMATS.STEP_CHALLENGE) {
    const durationDays = asPositiveNumber(body?.durationDays) || 1;
    const rawSuccess = asPositiveNumber(body?.successfulDaysRequired) ?? durationDays;
    const finalSuccess = Math.min(Math.floor(rawSuccess), Math.floor(durationDays));
    const destination = String(body?.destination || "").trim() || null;
    return {
      ticketTypes: buildStepChallengeTickets(rawTickets, { allowFree: true }),
      formatFields: {
        marathonMode: null,
        destination,
        successfulDaysRequired: Math.max(1, finalSuccess),
      },
    };
  }

  if (format === STRON_FORMATS.FACE_OFF) {
    return {
      ticketTypes: buildSingleTicket(rawTickets, "Face Off", { allowFree: true }),
      formatFields: { marathonMode: null, destination: null, successfulDaysRequired: null },
    };
  }

  if (format === STRON_FORMATS.KING_OF_THE_HILL) {
    return {
      ticketTypes: buildSingleTicket(rawTickets, "King of the Hill", { allowFree: true }),
      formatFields: { marathonMode: null, destination: null, successfulDaysRequired: null },
    };
  }

  fail("unknown_format", `Unsupported event format: ${format}`);
  return undefined as never;
};
