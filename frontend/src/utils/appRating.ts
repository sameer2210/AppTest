import { Linking, Platform } from "react-native";
import { AndroidMarket } from "react-native-rate";
import { APP_IDENTITY } from "@/constants/stron";

/** In-app review options for react-native-rate. */
export const rateBoxOptions = {
  AppleAppID: APP_IDENTITY.iosAppStoreId,
  GooglePackageName: APP_IDENTITY.androidPackage,
  preferredAndroidMarket: AndroidMarket.Google,
  preferInApp: true,
};

const PLAY_STORE_LINK = `market://details?id=${APP_IDENTITY.androidPackage}`;

const STORE_LINK = Platform.select({
  ios: APP_IDENTITY.iosAppStoreUrl,
  android: PLAY_STORE_LINK,
});

/** Open the platform store listing for ratings. */
export const openReviewInStore = () => {
  if (!STORE_LINK) {
    return Promise.resolve(false);
  }
  return Linking.openURL(STORE_LINK);
};
