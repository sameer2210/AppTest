import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { ConnectCheckInCatalog } from "../api/connect.api";
import { ConnectCheckInCatalogStore } from "../api/connect.api";
import { setCheckInCatalogThunk, clearCheckInCatalog } from "./connect.thunks";

export interface ConnectState {
  pendingCatalog: ConnectCheckInCatalog | null;
}

const initialState: ConnectState = {
  pendingCatalog: null,
};

const connectSlice = createSlice({
  name: "connect",
  initialState,
  reducers: {
    setPendingCatalog(state, action: PayloadAction<ConnectCheckInCatalog | null>) {
      state.pendingCatalog = action.payload;
      if (action.payload) {
        ConnectCheckInCatalogStore.set(action.payload);
      } else {
        ConnectCheckInCatalogStore.clear();
      }
    },
    clearPendingCatalog(state) {
      state.pendingCatalog = null;
      ConnectCheckInCatalogStore.clear();
    },
  },
  extraReducers: (builder) => {
    builder.addCase(setCheckInCatalogThunk.fulfilled, (state, action) => {
      state.pendingCatalog = action.meta.arg;
    });
    builder.addCase(clearCheckInCatalog.fulfilled, (state) => {
      state.pendingCatalog = null;
    });
  },
});

export const { setPendingCatalog, clearPendingCatalog } = connectSlice.actions;
export const selectPendingCatalog = (state: { connect: ConnectState }) => state.connect.pendingCatalog;
export default connectSlice.reducer;
