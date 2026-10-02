import React, { memo } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import CustomText from "@/components/CustomText";
import { fontTextStyles } from "@/utils/typography";

type Props = {
  loadingQr: boolean;
  qrPayload: string;
  displayCode: string;
  cardSize: number;
};

export const ProfileQrView: React.FC<Props> = memo(
  ({ loadingQr, qrPayload, displayCode, cardSize }) => {
    return (
      <View style={styles.container}>
        <View style={styles.qrCard}>
          {loadingQr || !qrPayload ? (
            <ActivityIndicator size="large" color="#000000" />
          ) : (
            <QRCode
              value={qrPayload}
              size={cardSize * 0.45}
              color="#111111"
              backgroundColor="#FFFFFF"
              quietZone={4}
            />
          )}
        </View>
        <CustomText style={styles.codeText}>{displayCode}</CustomText>
      </View>
    );
  },
);

ProfileQrView.displayName = "ProfileQrView";

const styles = StyleSheet.create({
  container: {
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 24,
    backgroundColor: "#0B1E42",
  },
  qrCard: {
    marginBottom: 20,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    padding: 16,
    elevation: 8,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  codeText: {
    ...fontTextStyles.bold,
    fontSize: 24,
    letterSpacing: 4,
    color: "#FFFFFF",
  },
});

export default ProfileQrView;
