import {
  getWhatsappAccessToken,
  getWhatsappApiVersion,
  getWhatsappBusinessAccountId,
} from "../../constants/infra.constants.js";
import {
  WHATSAPP_GRAPH_BASE_URL,
  WHATSAPP_GRAPH_TIMEOUT_MS,
  WHATSAPP_TEMPLATE_CATALOG,
} from "../../constants/whatsapp.constants.js";
import { logger } from "../../utils/logger.util.js";
import WhatsappTemplate from "../../features/gym-business/models/whatsappTemplate.model.js";

type GraphTemplateError = {
  error?: { code?: number; message?: string; error_subcode?: number };
};

const graphFetch = async (url: string, init: RequestInit) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WHATSAPP_GRAPH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

export const seedWhatsappTemplateCatalog = async () => {
  for (const entry of WHATSAPP_TEMPLATE_CATALOG) {
    await WhatsappTemplate.findOneAndUpdate(
      { name: entry.name, language: entry.language },
      {
        $set: {
          category: entry.category,
          kind: entry.kind,
          dayOffset: entry.dayOffset,
          body: entry.body,
          parameterNames: [...entry.parameterNames],
        },
        $setOnInsert: { status: "DRAFT" },
      },
      { upsert: true },
    );
  }
};

const isAlreadyExistsError = (json: GraphTemplateError) => {
  const message = String(json.error?.message || "").toLowerCase();
  return (
    json.error?.code === 100 &&
    (message.includes("already exists") || message.includes("duplicate"))
  );
};

export const createOrSyncWhatsappTemplates = async () => {
  const token = getWhatsappAccessToken();
  const wabaId = getWhatsappBusinessAccountId();
  const version = getWhatsappApiVersion();
  if (!token || !wabaId) {
    logger.info("[whatsapp] skip template sync — WABA id or access token missing");
    return { synced: 0, skipped: WHATSAPP_TEMPLATE_CATALOG.length };
  }

  await seedWhatsappTemplateCatalog();
  let synced = 0;
  for (const entry of WHATSAPP_TEMPLATE_CATALOG) {
    const url = `${WHATSAPP_GRAPH_BASE_URL}/${version}/${wabaId}/message_templates`;
    const body = {
      name: entry.name,
      language: entry.language,
      category: entry.category,
      components: [
        {
          type: "BODY",
          text: entry.body,
          example: { body_text: [entry.exampleParams] },
        },
      ],
    };
    try {
      const response = await graphFetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const json = (await response.json().catch(() => ({}))) as GraphTemplateError & {
        id?: string;
        status?: string;
      };
      if (response.ok || isAlreadyExistsError(json)) {
        synced += 1;
        await WhatsappTemplate.updateOne(
          { name: entry.name, language: entry.language },
          {
            $set: {
              status: json.status === "APPROVED" ? "APPROVED" : "PENDING",
              metaTemplateId: json.id || null,
            },
          },
        );
        logger.info("[whatsapp] template sync ok", { name: entry.name, status: json.status || "exists" });
      } else {
        logger.warn("[whatsapp] template sync rejected", {
          name: entry.name,
          errorCode: json.error?.code,
          errorMessage: json.error?.message,
        });
      }
    } catch (error) {
      logger.warn("[whatsapp] template sync failed", {
        name: entry.name,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  try {
    const listUrl = `${WHATSAPP_GRAPH_BASE_URL}/${version}/${wabaId}/message_templates?limit=100`;
    const listResponse = await graphFetch(listUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    const listJson = (await listResponse.json().catch(() => ({}))) as {
      data?: Array<{ name?: string; language?: string; status?: string; id?: string }>;
    };
    for (const row of listJson.data || []) {
      if (!row.name) continue;
      const status = String(row.status || "PENDING").toUpperCase();
      await WhatsappTemplate.updateOne(
        { name: row.name, language: row.language || "en" },
        {
          $set: {
            status: ["APPROVED", "REJECTED", "PAUSED", "DISABLED", "PENDING"].includes(status)
              ? status
              : "PENDING",
            metaTemplateId: row.id || null,
          },
        },
      );
    }
  } catch (error) {
    logger.warn("[whatsapp] template status refresh failed", {
      message: error instanceof Error ? error.message : String(error),
    });
  }

  return { synced, skipped: WHATSAPP_TEMPLATE_CATALOG.length - synced };
};
