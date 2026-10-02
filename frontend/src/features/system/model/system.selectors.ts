import type { RootState } from "@/store/store";

export const selectLoader = (state: RootState) => state.system.loader;

export const selectShowLoader = (state: RootState) => state.system.loader.showLoader;
export const selectSplashLoader = (state: RootState) => state.system.loader.splashLoader;
export const selectLoaderMessage = (state: RootState) => state.system.loader.message;
export const selectLoaderVarient = (state: RootState) => state.system.loader.varient;
export const selectShowToast = (state: RootState) => state.system.loader.showToast;

export const selectDeeplink = (state: RootState) => state.system.navigation.deeplink;
