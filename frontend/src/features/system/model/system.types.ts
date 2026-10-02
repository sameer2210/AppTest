export interface LoaderState {
  showLoader: boolean;
  splashLoader: boolean;
  message: string;
  varient: string;
  showToast: boolean;
}

export interface NavigationState {
  deeplink: string;
}

export interface SystemState {
  loader: LoaderState;
  navigation: NavigationState;
}
