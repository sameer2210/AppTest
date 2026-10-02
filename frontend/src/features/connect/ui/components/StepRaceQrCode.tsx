import React, { memo } from "react";
import { StyleSheet, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

type Props = {
  value: string;
};

export const StepRaceQrCode: React.FC<Props> = memo(({ value }) => (
  <View style={styles.container}>
    <View style={styles.qrWrapper}>
      <QRCode
        value={value || " "}
        size={150}
        color="#000000"
        backgroundColor="#FFFFFF"
        quietZone={4}
      />
    </View>
  </View>
));

StepRaceQrCode.displayName = "StepRaceQrCode";

const styles = StyleSheet.create({
  container: {
    width: 170,
    height: 170,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  qrWrapper: {
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    padding: 4,
  },
});

export default StepRaceQrCode;
