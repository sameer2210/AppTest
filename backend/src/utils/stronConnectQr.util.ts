import type { ServiceParams } from "../types/service.util.js";

type JsonObject = ServiceParams;

const tryParseJsonObject = (raw: unknown): JsonObject | null => {
  const s = String(raw || "").trim();
  if (!s.startsWith("{") || !s.endsWith("}")) return null;
  try {
    const parsed = JSON.parse(s);
    return parsed && typeof parsed === "object" ? (parsed as JsonObject) : null;
  } catch {
    return null;
  }
};

const safeDecodeURIComponent = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const extractQueryCode = (raw: string) => {
  const match = raw.match(/[?&]code=([A-Za-z0-9]+)/i);
  return match?.[1] ? match[1].toUpperCase() : null;
};

export const parseStationQrPayload = (raw: unknown) => {
  if (!raw || typeof raw !== "string") return null;
  const s = raw.trim();
  const json = tryParseJsonObject(s);
  if (json && (json.t === "station" || json.t === "checkin" || json.stationId)) {
    return {
      entityType: (json.entityType as string) || "station",
      entityId: String(json.stationId || json.entityId || "default_station"),
      entityName: (json.entityName as string) || (json.name as string) || "STRON Station",
    };
  }

  const matchStation = s.match(/^stron:\/\/station\/([^?#/]+)(?:\?.*name=([^&]+))?/i);
  if (matchStation) {
    return {
      entityType: "station",
      entityId: matchStation[1],
      entityName: matchStation[2]
        ? safeDecodeURIComponent(matchStation[2])
        : "STRON Station",
    };
  }

  if (s.startsWith("STATION|")) {
    const parts = s.split("|");
    if (parts.length >= 3) {
      return { entityType: parts[1], entityId: parts[2], entityName: parts[3] || "STRON Station" };
    }
  }

  if (s.startsWith("GYM|")) {
    const parts = s.split("|");
    if (parts.length >= 2) {
      return { entityType: "gym", entityId: parts[1], entityName: parts[2] || "STRON Gym Station" };
    }
  }

  return null;
};

export const parseTicketQrPayload = (raw: unknown) => {
  if (!raw || typeof raw !== "string") return null;
  const s = raw.trim();
  const json = tryParseJsonObject(s);
  if (json && (json.t === "ticket" || (json.eventKey && json.uid))) {
    return {
      eventKey: String(json.eventKey),
      uid: String(json.uid),
      ticketNumber: json.ticketNumber ? String(json.ticketNumber) : null,
    };
  }

  const matchTicket = s.match(/^stron:\/\/ticket\/([^/]+)\/([^?#/]+)(?:\?.*ticketNumber=([^&]+))?/i);
  if (matchTicket) {
    return {
      eventKey: matchTicket[1],
      uid: matchTicket[2],
      ticketNumber: matchTicket[3] ? safeDecodeURIComponent(matchTicket[3]) : null,
    };
  }

  if (s.startsWith("STRON|")) {
    const parts = s.split("|");
    if (parts.length >= 4) {
      return { ticketNumber: parts[1], eventKey: parts[2], uid: parts[3] };
    }
  }

  return null;
};

export const parseUserConnectPayload = (raw: unknown) => {
  if (!raw || typeof raw !== "string") return null;
  const s = raw.trim();
  const queryCode = extractQueryCode(s);
  const json = tryParseJsonObject(s);
  if (json) {
    const uid = json.uid || json.userId || json.user_id;
    if (uid) {
      return {
        uid: String(uid),
        code: json.code ? String(json.code).toUpperCase() : queryCode,
        businessId: json.businessId ? String(json.businessId) : undefined,
      };
    }
    if (json.businessId) {
      return {
        businessId: String(json.businessId),
        code: json.code ? String(json.code).toUpperCase() : queryCode,
      };
    }
  }

  const matchUser = s.match(/^(?:stron:\/\/user\/|https?:\/\/[^/]+\/user\/)([^/?#]+)/i);
  if (matchUser) {
    return { uid: safeDecodeURIComponent(matchUser[1]), code: queryCode };
  }

  const matchConnect = s.match(/^stron:\/\/connect\/([^?#/]+)/i);
  if (matchConnect) {
    return { uid: matchConnect[1], code: queryCode };
  }

  const matchBusiness = s.match(/^stron:\/\/(?:gym|business)\/([^?#/]+)/i);
  if (matchBusiness) {
    return { businessId: matchBusiness[1], code: queryCode };
  }

  if (/^[A-Za-z0-9_-]{12,64}$/.test(s) && !/^[A-Za-z0-9]{5}$/.test(s)) {
    return { uid: s, code: queryCode };
  }

  return queryCode ? { code: queryCode } : null;
};
