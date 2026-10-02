import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { TrackingStage } from "@/models/tracking";
import { sanitizeDailySteps } from "@/constants/steps";

export interface StepsState {
  todaySteps: number;
  isTracking: boolean;
  trackingStage: TrackingStage;
  lastSyncedAt: string | null;
}

const initialState: StepsState = {
  todaySteps: 0,
  isTracking: false,
  trackingStage: "weak",
  lastSyncedAt: null,
};

const stepsSlice = createSlice({
  name: "steps",
  initialState,
  reducers: {
    setTodaySteps(state, action: PayloadAction<number>) {
      state.todaySteps = sanitizeDailySteps(action.payload);
    },
    setIsTracking(state, action: PayloadAction<boolean>) {
      state.isTracking = action.payload;
    },
    setTrackingStage(state, action: PayloadAction<TrackingStage>) {
      state.trackingStage = action.payload;
    },
    setLastSyncedAt(state, action: PayloadAction<string | null>) {
      state.lastSyncedAt = action.payload;
    },
    resetStepsState() {
      return initialState;
    },
  },
});

export const { setTodaySteps, setIsTracking, setTrackingStage, setLastSyncedAt, resetStepsState } =
  stepsSlice.actions;

export default stepsSlice.reducer;

export const selectTodaySteps = (state: { steps: StepsState }) => state.steps.todaySteps;
export const selectTrackingStage = (state: { steps: StepsState }) => state.steps.trackingStage;
export const selectIsTracking = (state: { steps: StepsState }) => state.steps.isTracking;
