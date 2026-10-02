import React, { memo } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { fontTextStyles } from "@/utils/typography";
import { showToastMessage } from "@/utils/app-utils";
import { CornerBracket } from "./CornerBracket";
import type { CheckInResultState } from "./CheckInResultOverlay";

const SCAN_FRAME_SIZE = 175;
const BARCODE_SETTINGS = { barcodeTypes: ["qr"] as const };

type Props = {
  cameraAvailable: boolean;
  CameraView: React.ComponentType<any> | null;
  permission: { granted?: boolean } | null;
  torch: boolean;
  setTorch: React.Dispatch<React.SetStateAction<boolean>>;
  scanning: boolean;
  scanMode: "camera" | "manual";
  checkInState: CheckInResultState | null;
  onPickFromGallery: () => void;
  onRequestPermission: () => void;
  onBarcodeScanned: (result: { data?: string }) => void;
};

export const CameraScannerView: React.FC<Props> = memo(
  ({
    cameraAvailable,
    CameraView,
    permission,
    torch,
    setTorch,
    scanning,
    scanMode,
    checkInState,
    onPickFromGallery,
    onRequestPermission,
    onBarcodeScanned,
  }) => {
    return (
      <View style={styles.bgFallback}>
        {/* Camera — always mounted, scanning paused when manual or checkIn */}
        {cameraAvailable && CameraView && permission?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            enableTorch={torch}
            barcodeScannerSettings={BARCODE_SETTINGS}
            onBarcodeScanned={scanMode === "manual" || checkInState ? undefined : onBarcodeScanned}
          />
        ) : (
          <View style={styles.bgFallback} />
        )}

        {/* Scanner Chrome Overlay — only visible in camera mode */}
        {scanMode === "camera" && (
          <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
            {/* Top Controls inside Camera View */}
            <View style={styles.topControls}>
              <PressableScale
                onPress={() => {
                  if (!cameraAvailable) {
                    showToastMessage("Flash requires camera.");
                    return;
                  }
                  setTorch((v) => !v);
                }}
                style={styles.iconBtn}
              >
                <Ionicons name={torch ? "flash" : "flash-outline"} size={20} color="#1A1A1A" />
              </PressableScale>

              <CustomText style={styles.statusText}>
                {scanning ? "Scanning..." : "Scan a Qr"}
              </CustomText>

              <PressableScale
                onPress={onPickFromGallery}
                style={styles.iconBtn}
              >
                <Ionicons name="image-outline" size={20} color="#1A1A1A" />
              </PressableScale>
            </View>

            {/* Center Bracket Frame */}
            <View style={styles.centerFrame} pointerEvents="none">
              <View style={styles.frameBox}>
                <CornerBracket position="tl" />
                <CornerBracket position="tr" />
                <CornerBracket position="bl" />
                <CornerBracket position="br" />
              </View>
            </View>

            {/* Camera Permission helper fallback */}
            {cameraAvailable && permission && !permission.granted ? (
              <View style={styles.permissionWrap}>
                <PressableScale
                  onPress={onRequestPermission}
                  style={styles.permissionBtn}
                >
                  <CustomText style={styles.permissionBtnText}>Allow Camera</CustomText>
                </PressableScale>
              </View>
            ) : null}
          </View>
        )}
      </View>
    );
  },
);

CameraScannerView.displayName = "CameraScannerView";

const styles = StyleSheet.create({
  bgFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#D9D9D9",
  },
  topControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  statusText: {
    ...fontTextStyles.sixteenMediumBlack,
    color: "#1A1A1A",
  },
  centerFrame: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  frameBox: {
    width: SCAN_FRAME_SIZE,
    height: SCAN_FRAME_SIZE,
  },
  permissionWrap: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  permissionBtn: {
    borderRadius: 999,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  permissionBtnText: {
    ...fontTextStyles.twelveMediumBlack,
    color: "#FFFFFF",
  },
});

export default CameraScannerView;
