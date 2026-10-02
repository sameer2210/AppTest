import { createSlice } from "@reduxjs/toolkit";

/**
 * Core feature slice — app-level state managed by the core feature.
 * Placeholder for future blocker / remote-config state that currently lives
 * in local hooks.
 */
export interface CoreState {
  /** Reserved for future use. */
  _placeholder: boolean;
}

const initialState: CoreState = {
  _placeholder: false,
};

const coreSlice = createSlice({
  name: "core",
  initialState,
  reducers: {},
});

export default coreSlice.reducer;
