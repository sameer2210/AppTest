export type StronSettlementStatus = "preview" | "pending_kyc" | "ready" | "released" | "on_hold";

export type StronSettlement = {
  eventKey: string;
  organizerUid?: string | null;
  status: StronSettlementStatus;
  participantCount: number;
  grossTicketSales: number;
  totalGatewayFees: number;
  totalPlatformCommission: number;
  totalRefunds: number;
  netPayable: number;
  expectedReleaseBy?: string | null;
  releasedAt?: string | null;
  releaseReference?: string | null;
};

export interface StronSettlementResponse {
  success: boolean;
  settlement: Record<string, unknown>;
}

export const parseStronSettlement = (raw: Record<string, unknown>): StronSettlement => {
  const asNum = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const asStr = (v: unknown) => (v == null ? null : String(v));
  return {
    eventKey: String(raw.eventKey || ""),
    organizerUid: asStr(raw.organizerUid),
    status: String(raw.status || "preview") as StronSettlementStatus,
    participantCount: asNum(raw.participantCount),
    grossTicketSales: asNum(raw.grossTicketSales),
    totalGatewayFees: asNum(raw.totalGatewayFees),
    totalPlatformCommission: asNum(raw.totalPlatformCommission),
    totalRefunds: asNum(raw.totalRefunds),
    netPayable: asNum(raw.netPayable),
    expectedReleaseBy: asStr(raw.expectedReleaseBy),
    releasedAt: asStr(raw.releasedAt),
    releaseReference: asStr(raw.releaseReference),
  };
};
