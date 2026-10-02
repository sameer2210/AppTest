import { authPaths } from "./auth.paths.js";
import { userPaths } from "./user.paths.js";
import { gymBusinessPaths } from "./gymBusiness.paths.js";
import { stronConnectPaths } from "./stronConnect.paths.js";
import { managedEventsPaths } from "./managedEvents.paths.js";
import { stepRacePaths } from "./stepRace.paths.js";
import { opinionPaths } from "./opinion.paths.js";
import { notificationsPaths } from "./notifications.paths.js";
import { paymentsPaths } from "./payments.paths.js";
import { systemPaths } from "./system.paths.js";

export const allOpenApiPaths = {
  ...authPaths,
  ...userPaths,
  ...gymBusinessPaths,
  ...stronConnectPaths,
  ...managedEventsPaths,
  ...stepRacePaths,
  ...opinionPaths,
  ...notificationsPaths,
  ...paymentsPaths,
  ...systemPaths,
};

export default allOpenApiPaths;
