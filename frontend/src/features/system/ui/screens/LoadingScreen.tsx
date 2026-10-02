import { useEffect, useRef } from "react";
import { ActivityIndicator, Image, StyleSheet, View } from "react-native";
import { useAppDispatch } from "@/store/hooks";
import { bootstrapAuth } from "@/features/auth";
import { markSplashStart } from "@/constants/splash";
import { images } from "@/utils/images";

const SPLASH_INDICATOR_COLOR = "#086CFF";

const LoadingScreen = () => {
  const dispatch = useAppDispatch();
  const hasBootstrapped = useRef(false);

  useEffect(() => {
    if (hasBootstrapped.current) {
      return;
    }
    hasBootstrapped.current = true;
    markSplashStart();
    void dispatch(bootstrapAuth());
  }, [dispatch]);

  return (
    <View style={styles.container}>
      <Image source={images.LOADING_LOGO} style={styles.logo} resizeMode="contain" />
      <ActivityIndicator color={SPLASH_INDICATOR_COLOR} style={styles.loader} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 240,
    height: 240,
  },
  loader: {
    marginTop: 18,
  },
});

export default LoadingScreen;
