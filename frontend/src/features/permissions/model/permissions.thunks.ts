import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  loadDismissedPermissionSheets,
  isPermissionSheetDismissed,
  markPermissionSheetDismissed,
  markPermissionSheetsDismissed,
  clearPermissionSheetDismissed,
  openPermissionSheet,
  type StartupPermissionSheet,
} from "../api/permissions.api";
import {
  hasActivityPermission,
  isHealthStoreLinked,
  requestStepPermissionsService,
  requestHealthStoreAuthorization,
  initializeStepTracking,
} from "@/features/steps";
import {
  hasPushNotificationPermission,
  requestPushNotificationPermission,
  initializePushNotifications,
} from "@/features/notifications";

/**
 * Named thunks for permissions feature I/O.
 */

export const loadDismissedPermissionSheetsThunk = createAsyncThunk(
  "permissions/loadDismissed",
  async () => Array.from(await loadDismissedPermissionSheets()),
);

export const markPermissionSheetDismissedThunk = createAsyncThunk(
  "permissions/markDismissed",
  async (sheet: StartupPermissionSheet) => markPermissionSheetDismissed(sheet),
);

export const markPermissionSheetsDismissedThunk = createAsyncThunk(
  "permissions/markAllDismissed",
  async (sheets: StartupPermissionSheet[]) => markPermissionSheetsDismissed(sheets),
);

export const clearPermissionSheetDismissedThunk = createAsyncThunk(
  "permissions/clearDismissed",
  async (sheet: StartupPermissionSheet) => clearPermissionSheetDismissed(sheet),
);

export const checkPermissionSheetDismissedThunk = createAsyncThunk(
  "permissions/checkDismissed",
  async (sheet: StartupPermissionSheet) => isPermissionSheetDismissed(sheet),
);

export const openPermissionSheetThunk = createAsyncThunk(
  "permissions/openSheet",
  async (sheet: StartupPermissionSheet) => openPermissionSheet(sheet),
);

export const checkActivityPermissionThunk = createAsyncThunk(
  "permissions/checkActivity",
  async () => hasActivityPermission(),
);

export const checkHealthStoreLinkedThunk = createAsyncThunk(
  "permissions/checkHealthStoreLinked",
  async () => isHealthStoreLinked(),
);

export const checkPushPermissionThunk = createAsyncThunk(
  "permissions/checkPush",
  async () => hasPushNotificationPermission(),
);

export const requestActivityPermissionThunk = createAsyncThunk(
  "permissions/requestActivity",
  async () => requestStepPermissionsService(),
);

export const requestHealthStoreAuthorizationThunk = createAsyncThunk(
  "permissions/requestHealthStore",
  async (openHealthIfDecided: boolean = false) =>
    requestHealthStoreAuthorization(openHealthIfDecided),
);

export const requestPushPermissionThunk = createAsyncThunk(
  "permissions/requestPush",
  async () => requestPushNotificationPermission(),
);

export const initializeTrackingForUserThunk = createAsyncThunk<void, string>(
  "permissions/initTracking",
  async (uid: string, { dispatch }) => {
    await (dispatch as any)(initializeStepTracking(uid));
  },
);

export const initializeNotificationsForUserThunk = createAsyncThunk(
  "permissions/initNotifications",
  async (uid: string) => {
    void initializePushNotifications(uid);
  },
);
