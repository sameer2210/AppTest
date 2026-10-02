/** Public API — external consumers import only from here. */

/* ── Model (slice + thunks + selectors) ─────────────────────────────────── */
export {
  default as paymentsReducer,
  setOfferingsPrices,
  setHasEntitlement,
  clearPaymentsError,
  selectPaymentsState,
  selectProOfferingsPrices,
  selectHasProEntitlement,
  selectPaymentsProcessing,
} from "./model/payments.slice";
export {
  fetchProOfferingsThunk,
  fetchProOfferingsCatalogThunk,
  checkEntitlementAccessThunk,
  purchaseProSubscriptionThunk,
  presentStronProPaywallThunk,
  restoreProPurchasesThunk,
  getCustomerInfoThunk,
  downloadAndShareReceiptThunk,
  shareHtmlAsPdfThunk,
  createStronTicketOrderThunk,
  checkoutStronTicketOrderThunk,
  purchaseStronTicketThunk,
} from "./model/payments.thunks";
export type { PaymentsState } from "./model/payments.types";

/* ── API & types ────────────────────────────────────────────────────────── */
export {
  PaymentsApi,
  PurchaseCancelledError,
  PurchaseLoginRequiredError,
  defaultStronProPrices,
  RevenueCatService,
} from "./api/payments.api";
export type {
  StronProOfferingsPrices,
  StronProOfferingsCatalog,
  ReceiptData,
  StronTicketOrder,
  StronTicketOrderBreakdown,
  StronTicketPurchaseParams,
  StronTicketPurchaseResult,
  StronTicketCheckoutPrefill,
} from "./api/payments.api";
