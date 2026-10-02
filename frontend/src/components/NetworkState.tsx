import { StyleSheet, View, TouchableOpacity } from "react-native";
import CustomText from "@/components/CustomText";
import { useEffect, useRef, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import { Ionicons } from "@expo/vector-icons";
import { captureEvent } from "../analytics/posthog/events";
import { headingTextStyles, fontTextStyles } from "@/utils/typography";

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    left: 0,
    backgroundColor: "#13111F",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999999,
    padding: 24,
  },
  iconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    ...headingTextStyles.size24BoldBlack,
    color: "#FFFFFF",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    ...fontTextStyles.eighteenNormalBlack,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    marginBottom: 32,
  },
  retryBtn: {
    backgroundColor: "#086CFF",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 100,
  },
  retryText: {
    ...fontTextStyles.eighteenSemiBoldBlack,
    color: "#FFFFFF",
  },
});

const NetworkState = () => {
  const [isConnected, setIsConnected] = useState(true);
  const reportedOffline = useRef(false);

  useEffect(() => {
    // Listen for network state changes in real-time
    const unsubscribe = NetInfo.addEventListener((state) => {
      // Default to true if null to prevent false positives during fast refreshes
      setIsConnected(state.isConnected ?? true);
    });

    // Also perform an initial fetch just in case
    NetInfo.fetch().then((state) => {
      setIsConnected(state.isConnected ?? true);
    });

    return () => unsubscribe();
  }, []);

  const fetchNetwork = () => {
    NetInfo.fetch().then((state) => {
      setIsConnected(state.isConnected ?? true);
    });
  };

  useEffect(() => {
    if (!isConnected && !reportedOffline.current) {
      reportedOffline.current = true;
      captureEvent("offline_banner_shown");
    }
    if (isConnected) {
      reportedOffline.current = false;
    }
  }, [isConnected]);

  if (isConnected) return null;

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name="cloud-offline-outline" size={48} color="#086CFF" />
      </View>
      <CustomText style={styles.title}>No Internet Connection</CustomText>
      <CustomText style={styles.subtitle}>
        It looks like you are offline. Please check your network connection and try again.
      </CustomText>
      <TouchableOpacity activeOpacity={0.7} style={styles.retryBtn} onPress={fetchNetwork}>
        <CustomText style={styles.retryText}>Try Again</CustomText>
      </TouchableOpacity>
    </View>
  );
};

export default NetworkState;
