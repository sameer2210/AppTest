import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { StepRace } from "@/models/stepRace";
import type { LiveStepRaceStatus } from "../api/stepRace.api";
import { fetchActiveStepRace } from "./stepRace.thunks";

export interface StepRaceState {
  activeRace: StepRace | null;
  status: LiveStepRaceStatus | null;
  loading: boolean;
  error: string | null;
}

const initialState: StepRaceState = {
  activeRace: null,
  status: null,
  loading: false,
  error: null,
};

const stepRaceSlice = createSlice({
  name: "stepRace",
  initialState,
  reducers: {
    setActiveRace(state, action: PayloadAction<StepRace | null>) {
      state.activeRace = action.payload;
    },
    setStepRaceStatus(state, action: PayloadAction<LiveStepRaceStatus | null>) {
      state.status = action.payload;
    },
    setStepRaceLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setStepRaceError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchActiveStepRace.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchActiveStepRace.fulfilled, (state, action) => {
        state.loading = false;
        state.activeRace = action.payload;
      })
      .addCase(fetchActiveStepRace.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "Failed to fetch active race";
      });
  },
});

export const {
  setActiveRace,
  setStepRaceStatus,
  setStepRaceLoading,
  setStepRaceError,
} = stepRaceSlice.actions;

export default stepRaceSlice.reducer;

export const selectActiveRace = (state: { stepRace: StepRaceState }) => state.stepRace.activeRace;
export const selectStepRaceStatus = (state: { stepRace: StepRaceState }) => state.stepRace.status;
export const selectStepRaceLoading = (state: { stepRace: StepRaceState }) => state.stepRace.loading;
