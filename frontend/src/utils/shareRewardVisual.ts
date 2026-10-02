import { Platform, Share } from "react-native";
import type { RefObject } from "react";
import * as Sharing from "expo-sharing";
import { showToastMessage } from "@/utils/app-utils";

type CaptureTarget = RefObject<unknown>;

/** Capture the on-screen reward/certificate, then open the share sheet. */
export const shareCapturedView = async ({
  viewRef,
  fallbackMessage,
  dialogTitle,
}: {
  viewRef: CaptureTarget;
  fallbackMessage: string;
  dialogTitle: string;
}) => {
  try {
    if (viewRef.current && Platform.OS !== "web") {
      const { captureRef } = await import("react-native-view-shot");
      const uri = await captureRef(viewRef, { format: "png", quality: 1 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "image/png",
          dialogTitle,
        });
        return;
      }
    }
    await Share.share({ message: fallbackMessage });
  } catch (error) {
    if (
      error instanceof Error &&
      /user.*cancel|did not share|share.*dismiss/i.test(error.message)
    ) {
      return;
    }
    try {
      await Share.share({ message: fallbackMessage });
    } catch (shareError) {
      showToastMessage(shareError instanceof Error ? shareError.message : "Could not share.");
    }
  }
};
