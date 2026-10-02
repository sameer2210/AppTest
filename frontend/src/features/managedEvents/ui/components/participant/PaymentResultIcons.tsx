import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

/** Figma node 787:30 / 787:105 — 50×50 back circle + 24×24 chevron. */
export const PaymentBackIcon = () => (
  <View style={styles.backIconContainer}>
    <View style={styles.absoluteInset}>
      <Svg width={50} height={50} viewBox="0 0 50 50" fill="none">
        <Circle cx={25} cy={25} r={25} fill="#191919" fillOpacity={0.2} />
      </Svg>
    </View>
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 18L9 12L15 6"
        stroke="#FFFFFF"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  </View>
);

/** Figma node 787:53 — refresh-ccw 24×24. */
export const PaymentRefreshIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M1 4V10H7"
      stroke="#FFFFFF"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M23 20V14H17"
      stroke="#FFFFFF"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M20.49 9C19.9828 7.56679 19.1209 6.2854 17.9845 5.27542C16.8482 4.26543 15.4745 3.55977 13.9917 3.22426C12.5089 2.88875 10.9652 2.93434 9.50481 3.35677C8.04437 3.77921 6.71475 4.56471 5.64 5.64L1 10M23 14L18.36 18.36C17.2853 19.4353 15.9556 20.2208 14.4952 20.6432C13.0348 21.0657 11.4911 21.1112 10.0083 20.7757C8.52547 20.4402 7.1518 19.7346 6.01547 18.7246C4.87913 17.7146 4.01717 16.4332 3.51 15"
      stroke="#FFFFFF"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/** Figma node 787:60 — lock 16×16. */
export const PaymentLockIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path
      d="M13 5H11V3.5C11 2.70435 10.6839 1.94129 10.1213 1.37868C9.55871 0.81607 8.79565 0.5 8 0.5C7.20435 0.5 6.44129 0.81607 5.87868 1.37868C5.31607 1.94129 5 2.70435 5 3.5V5H3C2.73478 5 2.48043 5.10536 2.29289 5.29289C2.10536 5.48043 2 5.73478 2 6V13C2 13.2652 2.10536 13.5196 2.29289 13.7071C2.48043 13.8946 2.73478 14 3 14H13C13.2652 14 13.5196 13.8946 13.7071 13.7071C13.8946 13.5196 14 13.2652 14 13V6C14 5.73478 13.8946 5.48043 13.7071 5.29289C13.5196 5.10536 13.2652 5 13 5ZM6 3.5C6 2.96957 6.21071 2.46086 6.58579 2.08579C6.96086 1.71071 7.46957 1.5 8 1.5C8.53043 1.5 9.03914 1.71071 9.41421 2.08579C9.78929 2.46086 10 2.96957 10 3.5V5H6V3.5ZM13 13H3V6H13V13ZM8.75 9.5C8.75 9.64834 8.70601 9.79334 8.6236 9.91668C8.54119 10.04 8.42406 10.1361 8.28701 10.1929C8.14997 10.2497 7.99917 10.2645 7.85368 10.2356C7.7082 10.2067 7.57456 10.1352 7.46967 10.0303C7.36478 9.92544 7.29335 9.7918 7.26441 9.64632C7.23547 9.50083 7.25032 9.35003 7.30709 9.21299C7.36386 9.07594 7.45999 8.95881 7.58332 8.8764C7.70666 8.79399 7.85166 8.75 8 8.75C8.19891 8.75 8.38968 8.82902 8.53033 8.96967C8.67098 9.11032 8.75 9.30109 8.75 9.5Z"
      fill="#FFFFFF"
    />
  </Svg>
);

/** Figma nodes 787:58 + 787:64 — 150 halo, 52 plus rotated −45°. */
export const PaymentFailedStatusIcon = () => (
  <View style={styles.failedStatusContainer}>
    <View style={styles.absoluteInset}>
      <Svg width={150} height={150} viewBox="0 0 150 150" fill="none">
        <Circle cx={75} cy={75} r={75} fill="#261113" />
      </Svg>
    </View>
    <View style={styles.rotatedPlus}>
      <Svg width={52} height={52} viewBox="0 0 52 52" fill="none">
        <Path
          d="M46.3125 26C46.3125 26.6465 46.0557 27.2665 45.5986 27.7236C45.1415 28.1807 44.5215 28.4375 43.875 28.4375H28.4375V43.875C28.4375 44.5215 28.1807 45.1415 27.7236 45.5986C27.2665 46.0557 26.6465 46.3125 26 46.3125C25.3535 46.3125 24.7335 46.0557 24.2764 45.5986C23.8193 45.1415 23.5625 44.5215 23.5625 43.875V28.4375H8.125C7.47853 28.4375 6.85855 28.1807 6.40143 27.7236C5.94431 27.2665 5.6875 26.6465 5.6875 26C5.6875 25.3535 5.94431 24.7335 6.40143 24.2764C6.85855 23.8193 7.47853 23.5625 8.125 23.5625H23.5625V8.125C23.5625 7.47853 23.8193 6.85855 24.2764 6.40143C24.7335 5.94431 25.3535 5.6875 26 5.6875C26.6465 5.6875 27.2665 5.94431 27.7236 6.40143C28.1807 6.85855 28.4375 7.47853 28.4375 8.125V23.5625H43.875C44.5215 23.5625 45.1415 23.8193 45.5986 24.2764C46.0557 24.7335 46.3125 25.3535 46.3125 26Z"
          fill="#FF5151"
        />
      </Svg>
    </View>
  </View>
);

/** Figma nodes 787:117 + 787:137 — 113 halo, 49 check. */
export const PaymentSuccessStatusIcon = () => (
  <View style={styles.successStatusContainer}>
    <View style={styles.absoluteInset}>
      <Svg width={113} height={113} viewBox="0 0 113 113" fill="none">
        <Circle cx={56.5} cy={56.5} r={56.5} fill="#0B1E11" />
      </Svg>
    </View>
    <Svg width={49} height={49} viewBox="0 0 49 49" fill="none">
      <Path
        d="M44.5 15.4063L20 39.9063C19.7866 40.1204 19.5331 40.2903 19.2539 40.4062C18.9747 40.5222 18.6754 40.5818 18.3731 40.5818C18.0708 40.5818 17.7714 40.5222 17.4923 40.4062C17.2131 40.2903 16.9595 40.1204 16.7461 39.9063L6.02738 29.1875C5.81372 28.9739 5.64424 28.7202 5.52861 28.4411C5.41298 28.1619 5.35347 27.8627 5.35347 27.5606C5.35347 27.2584 5.41298 26.9592 5.52861 26.6801C5.64424 26.4009 5.81372 26.1473 6.02738 25.9336C6.24103 25.72 6.49467 25.5505 6.77383 25.4349C7.05298 25.3192 7.35217 25.2597 7.65433 25.2597C7.95648 25.2597 8.25567 25.3192 8.53483 25.4349C8.81398 25.5505 9.06763 25.72 9.28128 25.9336L18.375 35.0273L41.2499 12.1562C41.6814 11.7247 42.2667 11.4823 42.8769 11.4823C43.4871 11.4823 44.0723 11.7247 44.5038 12.1562C44.9353 12.5877 45.1777 13.1729 45.1777 13.7832C45.1777 14.3934 44.9353 14.9786 44.5038 15.4101L44.5 15.4063Z"
        fill="#00B14A"
      />
    </Svg>
  </View>
);

const styles = StyleSheet.create({
  backIconContainer: {
    height: 50,
    width: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  absoluteInset: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  failedStatusContainer: {
    height: 150,
    width: 150,
    alignItems: "center",
    justifyContent: "center",
  },
  rotatedPlus: {
    height: 73.5,
    width: 73.5,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-45deg" }],
  },
  successStatusContainer: {
    height: 113,
    width: 113,
    alignItems: "center",
    justifyContent: "center",
  },
});

