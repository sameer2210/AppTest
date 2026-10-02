import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { TOAST_PRESETS } from "@/utils/constants";
import { LoaderState, NavigationState, SystemState } from "./system.types";

const initialNavigation: NavigationState = {
  deeplink: "",
};

const initialLoader: LoaderState = {
  showLoader: false,
  splashLoader: false,
  message: "",
  varient: TOAST_PRESETS.GENERAL,
  showToast: false,
};

const initialState: SystemState = {
  loader: initialLoader,
  navigation: initialNavigation,
};

const systemSlice = createSlice({
  name: "system",
  initialState,
  reducers: {
    setLoaderStatus(state, action: PayloadAction<boolean>) {
      state.loader.showLoader = action.payload;
    },
    setLoaderMessage(state, action: PayloadAction<string>) {
      state.loader.message = action.payload;
    },
    setLoaderVarient(state, action: PayloadAction<string>) {
      state.loader.varient = action.payload;
    },
    setShowToast(state, action: PayloadAction<boolean>) {
      state.loader.showToast = action.payload;
    },
    setSplashLoader(state, action: PayloadAction<boolean>) {
      state.loader.splashLoader = action.payload;
    },
    resetLoaderState(state) {
      state.loader = initialLoader;
    },
    setDeeplink(state, action: PayloadAction<string>) {
      state.navigation.deeplink = action.payload;
    },
    resetNavigationState(state) {
      state.navigation = initialNavigation;
    },
  },
});

export const {
  setLoaderStatus,
  setLoaderMessage,
  setLoaderVarient,
  setShowToast,
  setSplashLoader,
  resetLoaderState,
  setDeeplink,
  resetNavigationState,
} = systemSlice.actions;

export default systemSlice.reducer;
