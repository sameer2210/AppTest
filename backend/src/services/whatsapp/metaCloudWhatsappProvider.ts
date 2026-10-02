import mongoose from "mongoose";
import {
  getWhatsappAccessToken,
  getWhatsappApiVersion,
  getWhatsappPhoneNumberId,
} from "../../constants/infra.constants.js";
import {
  WHATSAPP_GRAPH_BASE_URL,
  WHATSAPP_GRAPH_RETRY_SLEEP_MS,
  WHATSAPP_GRAPH_TIMEOUT_MS,
  isRetryableWhatsappError,
} from "../../constants/whatsapp.constants.js";
import { logger } from "../../utils/logger.util.js";
import { getActiveWhatsappAccount } from "./whatsappAccount.service.js";
import type { WhatsappProvider, WhatsappSendInput, WhatsappSendResult } from "./whatsappProvider.js";

type GraphError = {
  error?: {
    code?: number;
    message?: string;
    error_data?: { details?: string };
  };
};

type GraphSuccess = {
  messages?: Array<{ id?: string }>;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const buildPayload = (input: WhatsappSendInput) => {
  if (input.kind === "template" && input.template) {
    return {
      messaging_product: "whatsapp",
      to: input.to,
      type: "template",
      template: {
        name: input.template.name,
        language: { code: input.template.language || "en" },
        components: input.template.components,
      },
    };
  }
  return {
    messaging_product: "whatsapp",
    to: input.to,
    type: "text",
    text: { body: String(input.body || "").slice(0, 4096) || " " },
  };
};

const sanitizeLogPayload = (body: unknown) => body;

const parseGraphResult = async (
  response: Response,
): Promise<WhatsappSendResult> => {
  const json = (await response.json().catch(() => ({}))) as GraphSuccess & GraphError;
  if (response.ok) {
    const id = json.messages?.[0]?.id || null;
    return {
      ok: Boolean(id),
      providerMessageId: id,
      httpStatus: response.status,
      retryable: false,
      rawResponse: json,
    };
  }
  const errorCode = json.error?.code != null ? String(json.error.code) : String(response.status);
  const errorMessage =
    json.error?.error_data?.details || json.error?.message || `WhatsApp Graph error ${response.status}`;
  logger.warn("[whatsapp] Graph send rejected", {
    httpStatus: response.status,
    errorCode,
    errorMessage,
  });
  return {
    ok: false,
    providerMessageId: null,
    errorCode,
    errorMessage,
    httpStatus: response.status,
    retryable: isRetryableWhatsappError(errorCode, response.status),
    rawResponse: json,
  };
};

const postOnce = async (url: string, token: string, body: unknown): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WHATSAPP_GRAPH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
};

const resolveGraphTarget = async () => {
  if (mongoose.connection.readyState === 1) {
    try {
      const account = await getActiveWhatsappAccount();
      if (account?.phoneNumberId) {
        return {
          phoneNumberId: String(account.phoneNumberId),
          version: String(account.apiVersion || getWhatsappApiVersion()),
        };
      }
    } catch {
      // env fallback
    }
  }
  return {
    phoneNumberId: getWhatsappPhoneNumberId(),
    version: getWhatsappApiVersion(),
  };
};

export class MetaCloudWhatsappProvider implements WhatsappProvider {
  async send(input: WhatsappSendInput): Promise<WhatsappSendResult> {
    const token = getWhatsappAccessToken();
    const { phoneNumberId, version } = await resolveGraphTarget();
    if (!token || !phoneNumberId) {
      return {
        ok: false,
        providerMessageId: null,
        errorCode: "not_configured",
        errorMessage: "WhatsApp Cloud API credentials are not configured.",
        retryable: false,
      };
    }

    const url = `${WHATSAPP_GRAPH_BASE_URL}/${version}/${phoneNumberId}/messages`;
    const payload = buildPayload(input);
    logger.info("[whatsapp] Graph send", {
      to: input.to,
      kind: input.kind,
      templateName: input.template?.name || null,
      payload: sanitizeLogPayload(payload),
    });

    try {
      let response = await postOnce(url, token, payload);
      if (response.status >= 500) {
        await sleep(WHATSAPP_GRAPH_RETRY_SLEEP_MS);
        response = await postOnce(url, token, payload);
      }
      const result = await parseGraphResult(response);
      logger.info("[whatsapp] Graph send result", {
        ok: result.ok,
        providerMessageId: result.providerMessageId,
        httpStatus: result.httpStatus,
        errorCode: result.errorCode || null,
      });
      return result;
    } catch (error) {
      try {
        await sleep(WHATSAPP_GRAPH_RETRY_SLEEP_MS);
        const retry = await postOnce(url, token, payload);
        return parseGraphResult(retry);
      } catch {
        const errorMessage =
          error instanceof Error ? error.message : "WhatsApp Graph request failed.";
        logger.warn("[whatsapp] Graph send network error", { errorMessage });
        return {
          ok: false,
          providerMessageId: null,
          errorCode: "network_error",
          errorMessage,
          retryable: true,
        };
      }
    }
  }
}
