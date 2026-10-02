declare module "react-native-rate" {
  export enum AndroidMarket {
    Google = "Google",
    Amazon = "Amazon",
    Other = "Other",
  }

  export type RateOptions = {
    AppleAppID?: string;
    GooglePackageName?: string;
    AmazonPackageName?: string;
    OtherAndroidURL?: string;
    preferredAndroidMarket?: AndroidMarket;
    preferInApp?: boolean;
    openAppStoreIfInAppFails?: boolean;
  };

  const Rate: {
    rate: (
      options: RateOptions,
      callback?: (success: boolean, errorMessage?: string) => void,
    ) => void;
  };

  export default Rate;
}
