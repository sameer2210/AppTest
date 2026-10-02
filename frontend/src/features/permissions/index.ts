/** Public API — external consumers import only from here. */
export { default as permissionsReducer } from "./model/permissions.slice";

export {
  default as PermissionsApi,
  loadDismissedPermissionSheets,
  isPermissionSheetDismissed,
  markPermissionSheetDismissed,
  markPermissionSheetsDismissed,
  clearPermissionSheetDismissed,
  initializePostLoginPermissions,
} from "./api/permissions.api";

export {
  registerPermissionSheetOpener,
  openPermissionSheet,
  subscribePermissionSettled,
  notifyPermissionSettled,
} from "./api/permissions.api";

export {
  loadDismissedPermissionSheetsThunk,
  markPermissionSheetDismissedThunk,
  markPermissionSheetsDismissedThunk,
  clearPermissionSheetDismissedThunk,
  checkPermissionSheetDismissedThunk,
  openPermissionSheetThunk,
  checkActivityPermissionThunk,
  checkHealthStoreLinkedThunk,
  checkPushPermissionThunk,
  requestActivityPermissionThunk,
  requestHealthStoreAuthorizationThunk,
  requestPushPermissionThunk,
  initializeTrackingForUserThunk,
  initializeNotificationsForUserThunk,
} from "./model/permissions.thunks";

export type { StartupPermissionSheet } from "./api/permissions.api";
export { AppPermissionFlowModal } from "./ui/AppPermissionFlowModal";
