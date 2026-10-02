import { createAsyncThunk } from "@reduxjs/toolkit";
import { PaymentsApi, PurchaseCancelledError } from "../api/payments.api";

const toErrorMessage = (err: unknown, fallback: string) =>
  err instanceof Error ? err.message : fallback;

export const fetchProOfferingsThunk = createAsyncThunk(
  "payments/fetchProOfferings",
  async (isTrialEligible: boolean | undefined, { rejectWithValue }) => {
    try {
      const offerings = await PaymentsApi.revenueCat.getProOfferings(Boolean(isTrialEligible));
      return offerings;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch pro offerings";
      return rejectWithValue(message);
    }
  },
);

export const fetchProOfferingsCatalogThunk = createAsyncThunk(
  "payments/fetchProOfferingsCatalog",
  async (_, { rejectWithValue }) => {
    try {
      return await PaymentsApi.revenueCat.getProOfferingsCatalog();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch pro offerings catalog";
      return rejectWithValue(message);
    }
  },
);

export const checkEntitlementAccessThunk = createAsyncThunk(
  "payments/checkEntitlementAccess",
  async (_, { rejectWithValue }) => {
    try {
      const hasAccess = await PaymentsApi.revenueCat.hasEntitlementAccess();
      return hasAccess;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to check entitlement access";
      return rejectWithValue(message);
    }
  },
);

export const purchaseProSubscriptionThunk = createAsyncThunk(
  "payments/purchaseProSubscription",
  async (
    payload: { businessId?: string; preferTrial?: boolean; isTrialEligible?: boolean },
    { getState, rejectWithValue },
  ) => {
    try {
      const user = (getState() as { auth?: { user?: import("@/models/user").StronUser | null } })
        .auth?.user;
      const result = await PaymentsApi.revenueCat.presentStronProPaywall({
        businessId: payload.businessId,
        isTrialEligible: payload.isTrialEligible ?? payload.preferTrial === true,
        user,
      });
      return result;
    } catch (err: unknown) {
      if (err instanceof PurchaseCancelledError) {
        return rejectWithValue("Purchase cancelled");
      }
      return rejectWithValue(
        toErrorMessage(err, "In-app purchase failed. Please try again."),
      );
    }
  },
);

export const presentStronProPaywallThunk = createAsyncThunk(
  "payments/presentStronProPaywall",
  async (
    payload: { businessId?: string; isTrialEligible: boolean },
    { getState, rejectWithValue },
  ) => {
    try {
      const user = (getState() as { auth?: { user?: import("@/models/user").StronUser | null } })
        .auth?.user;
      return await PaymentsApi.revenueCat.presentStronProPaywall({
        ...payload,
        user,
      });
    } catch (err: unknown) {
      if (err instanceof PurchaseCancelledError) {
        return rejectWithValue("Purchase cancelled");
      }
      return rejectWithValue(
        toErrorMessage(err, "In-app purchase failed. Please try again."),
      );
    }
  },
);

export const restoreProPurchasesThunk = createAsyncThunk(
  "payments/restoreProPurchases",
  async (_, { rejectWithValue }) => {
    try {
      const customerInfo = await PaymentsApi.revenueCat.restorePurchases();
      return customerInfo;
    } catch (err: unknown) {
      if (err instanceof PurchaseCancelledError) {
        return rejectWithValue("Purchase cancelled");
      }
      return rejectWithValue(toErrorMessage(err, "Failed to restore purchases."));
    }
  },
);

export const getCustomerInfoThunk = createAsyncThunk(
  "payments/getCustomerInfo",
  async (_, { rejectWithValue }) => {
    try {
      const customerInfo = await PaymentsApi.revenueCat.getCustomerInfo();
      return customerInfo;
    } catch (err: unknown) {
      return rejectWithValue(toErrorMessage(err, "Failed to load customer info."));
    }
  },
);

export const downloadAndShareReceiptThunk = createAsyncThunk(
  "payments/downloadAndShareReceipt",
  async (
    payload: Parameters<typeof PaymentsApi.downloadAndShareReceipt>[0],
    { rejectWithValue },
  ) => {
    try {
      const result = await PaymentsApi.downloadAndShareReceipt(payload);
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to download receipt";
      return rejectWithValue(message);
    }
  },
);

export const shareHtmlAsPdfThunk = createAsyncThunk(
  "payments/shareHtmlAsPdf",
  async (
    payload: { html: string; dialogTitle?: string },
    { rejectWithValue },
  ) => {
    try {
      const result = await PaymentsApi.shareHtmlAsPdf(
        payload.html,
        payload.dialogTitle || "Share PDF",
      );
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to share PDF";
      return rejectWithValue(message);
    }
  },
);

export const createStronTicketOrderThunk = createAsyncThunk(
  "payments/createStronTicketOrder",
  async (
    payload: Parameters<typeof PaymentsApi.razorpay.createStronTicketOrder>[0],
    { rejectWithValue },
  ) => {
    try {
      const order = await PaymentsApi.razorpay.createStronTicketOrder(payload);
      return order;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create ticket order";
      return rejectWithValue(message);
    }
  },
);

export const checkoutStronTicketOrderThunk = createAsyncThunk(
  "payments/checkoutStronTicketOrder",
  async (
    payload: {
      order: Parameters<typeof PaymentsApi.razorpay.checkoutStronTicketOrder>[0];
      prefill?: Parameters<typeof PaymentsApi.razorpay.checkoutStronTicketOrder>[1];
      options?: Parameters<typeof PaymentsApi.razorpay.checkoutStronTicketOrder>[2];
    },
    { rejectWithValue },
  ) => {
    try {
      const result = await PaymentsApi.razorpay.checkoutStronTicketOrder(
        payload.order,
        payload.prefill,
        payload.options,
      );
      return result;
    } catch (err: unknown) {
      return rejectWithValue(toErrorMessage(err, "Checkout failed. Please try again."));
    }
  },
);

export const purchaseStronTicketThunk = createAsyncThunk(
  "payments/purchaseStronTicket",
  async (
    payload: Parameters<typeof PaymentsApi.razorpay.purchaseStronTicket>[0],
    { rejectWithValue },
  ) => {
    try {
      const result = await PaymentsApi.razorpay.purchaseStronTicket(payload);
      return result;
    } catch (err: unknown) {
      return rejectWithValue(toErrorMessage(err, "Ticket purchase failed. Please try again."));
    }
  },
);

