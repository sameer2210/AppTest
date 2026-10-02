import { refreshRemoteConfig } from "../../../config/remoteConfigService.js";

export const triggerRemoteConfigRefresh = () => {
  refreshRemoteConfig();
};
