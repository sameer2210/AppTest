import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS, sanitizeStepCount } from "./stepStorage";

const MAX_ISOLATED_DUMP_JUMP = 400;

let suppressDeviceWideRecovery = false;
let isolatedStepFloor = 0;
let deviceDayTotalAtBind = 0;
let allowHcDownwardAdopt = false;

export const getSuppressDeviceWideRecovery = (): boolean => suppressDeviceWideRecovery;
export const setSuppressDeviceWideRecovery = (val: boolean): void => {
  suppressDeviceWideRecovery = val;
};

export const getIsolatedStepFloor = (): number => isolatedStepFloor;
export const setIsolatedStepFloor = (val: number): void => {
  isolatedStepFloor = val;
};

export const getDeviceDayTotalAtBind = (): number => deviceDayTotalAtBind;
export const setDeviceDayTotalAtBind = (val: number): void => {
  deviceDayTotalAtBind = val;
};

export const getAllowHcDownwardAdopt = (): boolean => allowHcDownwardAdopt;
export const setAllowHcDownwardAdopt = (val: boolean): void => {
  allowHcDownwardAdopt = val;
};

export const consumeHcDownwardAdopt = (): boolean => {
  if (!allowHcDownwardAdopt) return false;
  allowHcDownwardAdopt = false;
  return true;
};

export const peekHcDownwardAdopt = (): boolean => allowHcDownwardAdopt;

export const isHealthIsolated = async (currentUid?: string | null): Promise<boolean> => {
  if (suppressDeviceWideRecovery) return true;
  try {
    const isolatedUid = await AsyncStorage.getItem(STORAGE_KEYS.isolateHealth);
    if (!isolatedUid) return false;
    const uid = currentUid || (await AsyncStorage.getItem(STORAGE_KEYS.activeUid));
    return !!uid && isolatedUid === uid;
  } catch {
    return false;
  }
};

export const filterIsolatedNativeSteps = (incoming: number, current: number): number => {
  const safeIn = sanitizeStepCount(incoming);
  const safeCur = sanitizeStepCount(current);
  if (!suppressDeviceWideRecovery) return safeIn;
  if (deviceDayTotalAtBind > 50) {
    const slack = Math.max(100, Math.round(deviceDayTotalAtBind * 0.08));
    if (Math.abs(safeIn - deviceDayTotalAtBind) <= slack) {
      return Math.max(isolatedStepFloor, safeCur);
    }
  }
  if (safeIn <= safeCur) return safeIn;
  const floor = Math.max(isolatedStepFloor, safeCur);
  const jump = safeIn - floor;
  if (jump > MAX_ISOLATED_DUMP_JUMP) {
    return floor;
  }
  return safeIn;
};

export const resetIsolationState = (): void => {
  suppressDeviceWideRecovery = false;
  isolatedStepFloor = 0;
  deviceDayTotalAtBind = 0;
  allowHcDownwardAdopt = false;
};
