import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { PaymentsState } from "./payments.types";
import { fetchProOfferingsThunk, checkEntitlementAccessThunk } from "./payments.thunks";
import type { StronProOfferingsPrices } from "../api/payments.api";

const initialState: PaymentsState = {
  offeringsPrices: null,
  hasStoreTrial: false,
  hasEntitlement: false,
  isProcessing: false,
  lastReceipt: null,
  error: null,
};

const paymentsSlice = createSlice({
  name: "payments",
  initialState,
  reducers: {
    setOfferingsPrices(state, action: PayloadAction<StronProOfferingsPrices | null>) {
      state.offeringsPrices = action.payload;
    },
    setHasEntitlement(state, action: PayloadAction<boolean>) {
      state.hasEntitlement = action.payload;
    },
    clearPaymentsError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProOfferingsThunk.pending, (state) => {
        state.isProcessing = true;
        state.error = null;
      })
      .addCase(fetchProOfferingsThunk.fulfilled, (state, action) => {
        state.isProcessing = false;
        if (action.payload?.pricing) {
          state.offeringsPrices = action.payload.pricing;
          state.hasStoreTrial = action.payload.hasStoreTrial === true;
        }
      })
      .addCase(fetchProOfferingsThunk.rejected, (state, action) => {
        state.isProcessing = false;
        state.error = (action.payload as string) || "Failed to fetch pro offerings";
      })
      .addCase(checkEntitlementAccessThunk.fulfilled, (state, action) => {
        state.hasEntitlement = action.payload === true;
      });
  },
});

export const { setOfferingsPrices, setHasEntitlement, clearPaymentsError } =
  paymentsSlice.actions;

export const selectPaymentsState = (state: { payments: PaymentsState }) => state.payments;
export const selectProOfferingsPrices = (state: { payments: PaymentsState }) =>
  state.payments.offeringsPrices;
export const selectHasProEntitlement = (state: { payments: PaymentsState }) =>
  state.payments.hasEntitlement;
export const selectPaymentsProcessing = (state: { payments: PaymentsState }) =>
  state.payments.isProcessing;

export default paymentsSlice.reducer;
