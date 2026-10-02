import * as PermissionSheetDismissal from "@/services/permissions/permissionSheetDismissal";
import * as PermissionSheetController from "@/services/permissions/permissionSheetController";
import * as PostLoginPermissions from "@/services/postLoginPermissions";

export const PermissionsApi = {
  sheetDismissal: PermissionSheetDismissal,
  sheetController: PermissionSheetController,
  postLogin: PostLoginPermissions,
};

export {
  loadDismissedPermissionSheets,
  isPermissionSheetDismissed,
  markPermissionSheetDismissed,
  markPermissionSheetsDismissed,
  clearPermissionSheetDismissed,
} from "@/services/permissions/permissionSheetDismissal";
export {
  registerPermissionSheetOpener,
  openPermissionSheet,
  subscribePermissionSettled,
  notifyPermissionSettled,
} from "@/services/permissions/permissionSheetController";
export type { StartupPermissionSheet } from "@/services/permissions/permissionSheetDismissal";
export { initializePostLoginPermissions } from "@/services/postLoginPermissions";

export default PermissionsApi;
