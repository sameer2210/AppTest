import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "stron_permission_sheet_dismissed";

export type StartupPermissionSheet = "activity" | "healthConnect" | "notification";

const STARTUP_SHEETS: StartupPermissionSheet[] = ["activity", "healthConnect", "notification"];

export const loadDismissedPermissionSheets = async (): Promise<Set<StartupPermissionSheet>> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as Partial<Record<StartupPermissionSheet, boolean>>;
    const dismissed = new Set<StartupPermissionSheet>();
    for (const type of STARTUP_SHEETS) {
      if (parsed[type]) dismissed.add(type);
    }
    return dismissed;
  } catch {
    return new Set();
  }
};

const persistDismissedSet = async (dismissed: Set<StartupPermissionSheet>) => {
  const payload: Partial<Record<StartupPermissionSheet, boolean>> = {};
  for (const key of dismissed) {
    payload[key] = true;
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
};

export const markPermissionSheetDismissed = async (type: StartupPermissionSheet): Promise<void> => {
  try {
    const current = await loadDismissedPermissionSheets();
    current.add(type);
    await persistDismissedSet(current);
  } catch {
    // ignore
  }
};

export const markPermissionSheetsDismissed = async (
  types: StartupPermissionSheet[],
): Promise<void> => {
  if (types.length === 0) return;
  try {
    const current = await loadDismissedPermissionSheets();
    for (const type of types) {
      current.add(type);
    }
    await persistDismissedSet(current);
  } catch {
    // ignore
  }
};

export const isPermissionSheetDismissed = async (
  type: StartupPermissionSheet,
): Promise<boolean> => {
  const dismissed = await loadDismissedPermissionSheets();
  return dismissed.has(type);
};

export const clearPermissionSheetDismissed = async (
  type: StartupPermissionSheet,
): Promise<void> => {
  try {
    const current = await loadDismissedPermissionSheets();
    if (!current.delete(type)) return;
    await persistDismissedSet(current);
  } catch {
    // ignore
  }
};
