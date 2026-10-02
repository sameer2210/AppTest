import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { StronEvent, ManagedActivityItem, StronReward } from "../api/managedEvents.api";
import {
  fetchManagedEventsCatalog,
  fetchMyActivity,
  fetchRewardPreviews,
} from "./managedEvents.thunks";

export interface ManagedEventsState {
  catalog: StronEvent[];
  myActivity: ManagedActivityItem[];
  rewardPreviews: StronReward[];
  loading: boolean;
  error: string | null;
}

const initialState: ManagedEventsState = {
  catalog: [],
  myActivity: [],
  rewardPreviews: [],
  loading: false,
  error: null,
};

const managedEventsSlice = createSlice({
  name: "managedEvents",
  initialState,
  reducers: {
    setCatalog(state, action: PayloadAction<StronEvent[]>) {
      state.catalog = action.payload;
    },
    setMyActivity(state, action: PayloadAction<ManagedActivityItem[]>) {
      state.myActivity = action.payload;
    },
    setRewardPreviews(state, action: PayloadAction<StronReward[]>) {
      state.rewardPreviews = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchManagedEventsCatalog.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchManagedEventsCatalog.fulfilled, (state, action) => {
        state.loading = false;
        state.catalog = (action.payload ?? []) as StronEvent[];
      })
      .addCase(fetchManagedEventsCatalog.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "Failed to fetch catalog";
      })
      .addCase(fetchMyActivity.fulfilled, (state, action) => {
        state.loading = false;
        state.myActivity = action.payload ?? [];
      })
      .addCase(fetchMyActivity.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyActivity.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "Failed to fetch activity";
      })
      .addCase(fetchRewardPreviews.fulfilled, (state, action) => {
        state.loading = false;
        state.rewardPreviews = action.payload ?? [];
      })
      .addCase(fetchRewardPreviews.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRewardPreviews.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "Failed to fetch reward previews";
      });
  },
});

export const { setCatalog, setMyActivity, setRewardPreviews, setLoading, setError } =
  managedEventsSlice.actions;

export default managedEventsSlice.reducer;

export const selectManagedEventsCatalog = (state: { managedEvents: ManagedEventsState }) =>
  state.managedEvents.catalog;
export const selectManagedEventsActivity = (state: { managedEvents: ManagedEventsState }) =>
  state.managedEvents.myActivity;
export const selectManagedEventsRewards = (state: { managedEvents: ManagedEventsState }) =>
  state.managedEvents.rewardPreviews;
export const selectManagedEventsLoading = (state: { managedEvents: ManagedEventsState }) =>
  state.managedEvents.loading;
