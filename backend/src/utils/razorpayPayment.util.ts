import crypto from "node:crypto";

export const generateTicketNumber = () =>
  `TKT-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

export const generateQrCodePayload = ({
  ticketNumber,
  uid,
  eventKey,
}: {
  ticketNumber: string;
  uid: string;
  eventKey: string;
}) => `STRON|${ticketNumber}|${eventKey}|${uid}`;

export const resolveEventKeyInput = (eventKey: unknown, eventId: unknown) => {
  const resolved = String(eventKey || eventId || "").trim();
  if (!resolved) {
    throw new Error("eventKey is required.");
  }
  return resolved;
};

export default {
  generateTicketNumber,
  generateQrCodePayload,
  resolveEventKeyInput,
};
