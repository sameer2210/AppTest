import type { Store } from "@reduxjs/toolkit";
import type { RootState, AppDispatch } from "./store";

export type AppStore = Store<RootState> & { dispatch: AppDispatch };

let cached: AppStore | undefined;

// Lazy store access avoids import cycles (thunks → axios → store while loading)
export const getAppStore = (): AppStore => {
  if (!cached) {
    cached = require("./store").store as AppStore;
  }
  return cached;
};
