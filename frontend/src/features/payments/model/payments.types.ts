import type { StronProOfferingsPrices, ReceiptData } from "../api/payments.api";

export interface PaymentsState {
  offeringsPrices: StronProOfferingsPrices | null;
  hasStoreTrial: boolean;
  hasEntitlement: boolean;
  isProcessing: boolean;
  lastReceipt: ReceiptData | null;
  error: string | null;
}
