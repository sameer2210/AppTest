import { ImageUploadService } from "@/services/core/imageUpload.service";
import { LocationService } from "@/services/core/location.service";
import { LocationSearchService } from "@/services/core/locationSearch.service";
import { DeepLinkService } from "@/services/core/deepLink.service";
import { apiClient } from "@/services/core/apiClient.service";
import * as RemoteConfig from "@/services/core/remoteConfig.service";

export const CoreApi = {
  apiClient,
  imageUpload: ImageUploadService,
  location: LocationService,
  locationSearch: LocationSearchService,
  deepLink: DeepLinkService,
  remoteConfig: RemoteConfig,
};

export type { LocationSuggestion } from "@/services/core/locationSearch.service";
export type { AppBlockerState } from "@/services/core/remoteConfig.service";
export {
  apiClient,
  ImageUploadService,
  LocationService,
  LocationSearchService,
  DeepLinkService,
};
export {
  evaluateAppBlocker,
  initializeRemoteConfig,
  subscribeRemoteConfigUpdates,
} from "@/services/core/remoteConfig.service";
export default CoreApi;
