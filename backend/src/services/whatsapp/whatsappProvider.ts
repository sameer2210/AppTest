export type WhatsappSendKind = "template" | "text";

export type WhatsappTemplateComponent = {
  type: "body" | "header" | "button";
  parameters: Array<{ type: "text"; text: string }>;
};

export type WhatsappSendInput = {
  to: string;
  businessId?: string;
  memberId?: string;
  kind: WhatsappSendKind;
  body?: string;
  template?: {
    name: string;
    language: string;
    components: WhatsappTemplateComponent[];
  };
};

export type WhatsappSendResult = {
  ok: boolean;
  providerMessageId: string | null;
  errorCode?: string;
  errorMessage?: string;
  httpStatus?: number;
  retryable?: boolean;
  rawResponse?: unknown;
};

export interface WhatsappProvider {
  send(input: WhatsappSendInput): Promise<WhatsappSendResult>;
}

export class NoopWhatsappProvider implements WhatsappProvider {
  async send(_input: WhatsappSendInput): Promise<WhatsappSendResult> {
    return {
      ok: true,
      providerMessageId: `noop-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };
  }
}

let provider: WhatsappProvider = new NoopWhatsappProvider();

export const getWhatsappProvider = (): WhatsappProvider => provider;

export const setWhatsappProvider = (next: WhatsappProvider): void => {
  provider = next;
};
