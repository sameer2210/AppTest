import { Linking } from "react-native";
import { getAppStore } from "@/store";
import { setLoaderMessage, setLoaderVarient, setShowToast } from "@/features/system";
import { inferToastPreset, MONTH_NAMES_FULL, type ToastPreset } from "./constants";
import { isAndroid } from "./platform";
import { log, logError } from "@/config/devLogger";
import { initializePushNotifications } from "@/features/notifications";
import i18n from "../i18n";
import { captureEvent } from "@/analytics";
import { APP_IDENTITY } from "@/constants/stron";
import { shareMessageWithLink } from "./shareMessage";

export const isDev = (): boolean => (__DEV__ ? true : false);

export const capitalizeFirstLetterOnly = (value: string) =>
  value ? value.charAt(0).toUpperCase() + value.substr(1) : "";

export const capitalizeWords = (value: string) => {
  if (value) {
    return value.replace(/\w\S*/g, (txt: string) => {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  }
  return "";
};

export const showToastMessage = (msg: string, type?: ToastPreset) => {
  if (msg && msg.length > 0) {
    log("Toast Message: ", capitalizeFirstLetterOnly(msg));
    const resolvedType = type ?? inferToastPreset(msg);
    const store = getAppStore();
    store.dispatch(setLoaderMessage(msg));
    store.dispatch(setLoaderVarient(resolvedType));
    store.dispatch(setShowToast(true));
  }
};

export const shareApp = () => {
  const storeUrl = isAndroid() ? APP_IDENTITY.androidPlayStoreUrl : APP_IDENTITY.iosAppStoreUrl;
  const message = i18n.t("share.app.message");
  captureEvent("app_shared", {});
  void shareMessageWithLink({
    message: `${message}\n${storeUrl}`,
    url: storeUrl,
    title: i18n.t("share.app.subject"),
  })
    .then((res) => {
      log(res);
    })
    .catch((err) => {
      err && log(err);
    });
};

export const openPrivacyPolicy = () => {
  Linking.canOpenURL("https://klsystems.pro/privacy-policy/").then((supported) => {
    if (supported) {
      Linking.openURL("https://klsystems.pro/privacy-policy/");
    } else {
      log("Not opening Url: " + "https://klsystems.pro/privacy-policy/");
    }
  });
};

export const openTermsAndConditions = () => {
  Linking.canOpenURL("https://klsystems.pro/terms-and-conditions/").then((supported) => {
    if (supported) {
      Linking.openURL("https://klsystems.pro/terms-and-conditions/");
    } else {
      log("Not opening Url: " + "https://klsystems.pro/terms-and-conditions/");
    }
  });
};

export const generateFCMToken = async () => {
  const uid = getAppStore().getState().auth.user?.uid;
  if (!uid) {
    log("generateFCMToken: skipped (no authenticated user)");
    return;
  }
  await initializePushNotifications(uid);
};

export const isDateValid = (date: string | number | Date) => new Date(date).getTime() > 0;

export const formateDate = (dateInp: string | number | Date) => {
  if (!isDateValid(dateInp)) {
    return "";
  }
  const date = new Date(dateInp);
  let dateD: any = Number(date.getDate());
  dateD = dateD <= 9 ? `0${dateD}` : dateD;
  let dateM: any = date.getMonth() + 1;
  dateM = dateM <= 9 ? `0${dateM}` : dateM;
  let dateY;
  dateY = date.getFullYear();
  return `${dateY}-${dateM}-${dateD}`;
};

export const formatDateMonthYearOnly = (dateInp: string | number | Date) => {
  try {
    const date = new Date(dateInp);
    let dateM = MONTH_NAMES_FULL[date.getMonth()];
    let dateY = date.getFullYear();
    return `${dateM} ${dateY}`;
  } catch (err) {
    log("err", err);
    return null;
  }
};

export const compareVersions = (versionA: number[], versionB: number[]) => {
  for (let i = 0; i < 3; i++) {
    if (versionA[i] < versionB[i]) return -1;
    if (versionA[i] > versionB[i]) return 1;
  }
  return 0;
};

export const convertTo24Format = (date: string): string => {
  if (date) {
    const newDate = new Date(date);
    if (isNaN(newDate.getTime())) {
      logError("Invalid date format provided:", date);
      return "";
    }

    const minute = newDate.getMinutes().toString().padStart(2, "0");
    const hour = newDate.getHours().toString().padStart(2, "0");
    const result = `${hour}:${minute}`;

    return result;
  }
  return "";
};

export const parseVersion = (version: string): number[] | null => {
  const versionParts = version?.split(".").map(Number);
  if (!versionParts || versionParts.some(isNaN)) {
    return null; // Invalid version format
  }
  while (versionParts.length < 3) {
    versionParts.push(0); // Pad with zeros for missing parts (e.g., "1.0" -> [1, 0, 0])
  }
  return versionParts;
};
