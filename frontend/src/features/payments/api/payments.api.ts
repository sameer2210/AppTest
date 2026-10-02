import { RazorpayService } from "@/services/payment/razorpay.service";
import * as ReceiptGenerator from "@/services/payment/receiptGenerator.service";
import { RevenueCatService, PurchaseCancelledError, PurchaseLoginRequiredError } from "@/services/payment/revenueCat.service";
import { defaultStronProPrices } from "@/services/payment/stronProStoreOffer";

export const PaymentsApi = {
  razorpay: RazorpayService,
  receipt: ReceiptGenerator,
  shareHtmlAsPdf: ReceiptGenerator.shareHtmlAsPdf,
  downloadAndShareReceipt: ReceiptGenerator.downloadAndShareReceipt,
  revenueCat: RevenueCatService,
  stronProStoreOffer: { defaultStronProPrices },
};

export { RevenueCatService, PurchaseCancelledError, PurchaseLoginRequiredError, defaultStronProPrices };
export type { ReceiptData } from "@/services/payment/receiptGenerator.service";
export type { StronProOfferingsPrices } from "@/services/payment/stronProStoreOffer";
export type { StronProOfferingsCatalog } from "@/services/payment/revenueCat.service";
export type {
  StronTicketOrder,
  StronTicketOrderBreakdown,
  StronTicketPurchaseParams,
  StronTicketPurchaseResult,
  StronTicketCheckoutPrefill,
} from "@/services/payment/razorpay.service";

export default PaymentsApi;
