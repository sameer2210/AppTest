import type { StartupPermissionSheet } from "./permissionSheetDismissal";

type OpenHandler = (type: StartupPermissionSheet, resolve: (granted: boolean) => void) => void;

let openHandler: OpenHandler | null = null;
const settledListeners = new Set<() => void>();

export const registerPermissionSheetOpener = (handler: OpenHandler | null) => {
  openHandler = handler;
};

/** Re-open the in-app permission sheet (Home cards). Resolves true if granted. */
export const openPermissionSheet = (type: StartupPermissionSheet): Promise<boolean> =>
  new Promise((resolve) => {
    if (!openHandler) {
      resolve(false);
      return;
    }
    openHandler(type, resolve);
  });

export const subscribePermissionSettled = (listener: () => void) => {
  settledListeners.add(listener);
  return () => {
    settledListeners.delete(listener);
  };
};

export const notifyPermissionSettled = () => {
  settledListeners.forEach((listener) => listener());
};
