import type { WhatsappWebhookField } from "../../constants/whatsapp.constants.js";

export type ParsedWhatsappWebhookItem = {
  eventKey: string;
  field: WhatsappWebhookField;
  payload: Record<string, unknown>;
};

type WebhookBody = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: Array<Record<string, unknown>>;
        statuses?: Array<Record<string, unknown>>;
      };
    }>;
  }>;
};

export const collectWhatsappWebhookItems = (body: unknown): ParsedWhatsappWebhookItem[] => {
  const items: ParsedWhatsappWebhookItem[] = [];
  const payload = (body || {}) as WebhookBody;
  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      for (const message of change.value?.messages || []) {
        const id = String(message.id || "").trim();
        if (!id) continue;
        items.push({ eventKey: `message:${id}`, field: "messages", payload: message });
      }
      for (const status of change.value?.statuses || []) {
        const id = String(status.id || "").trim();
        const statusName = String(status.status || "").trim();
        if (!id) continue;
        items.push({
          eventKey: `status:${id}:${statusName}`,
          field: "statuses",
          payload: status,
        });
      }
    }
  }
  return items;
};
