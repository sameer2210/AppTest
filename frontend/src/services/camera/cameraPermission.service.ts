import { Camera } from "expo-camera";
import { logError } from "@/config/devLogger";
import { captureEvent } from "@/analytics/posthog/events";

export const hasCameraPermission = async (): Promise<boolean> => {
  try {
    const { status } = await Camera.getCameraPermissionsAsync();
    return status === "granted";
  } catch (error) {
    logError("[CameraPermission] Check failed", error);
    return false;
  }
};

export const requestCameraPermission = async (): Promise<boolean> => {
  try {
    const { status } = await Camera.requestCameraPermissionsAsync();
    captureEvent("camera_permission_result", { granted: status === "granted" });
    return status === "granted";
  } catch (error) {
    logError("[CameraPermission] Request failed", error);
    return false;
  }
};
