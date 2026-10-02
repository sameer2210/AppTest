import { ActivityIndicator, Image, StyleSheet, View } from "react-native";
import CustomText from "./CustomText";
import { useAppSelector } from "../store/hooks";
import { selectShowLoader } from "@/features/system";
import { images } from "../utils/images";

const INDICATOR_COLOR = "#086CFF";

const Loader = () => {
  const showLoader = useAppSelector(selectShowLoader);
  if (!showLoader) return null;

  return (
    <View style={styles.container} pointerEvents="auto">
      <Image source={images.LOADING_LOGO} style={styles.logo} resizeMode="contain" />
      <ActivityIndicator color={INDICATOR_COLOR} size="large" style={styles.spinner} />
      <CustomText className="font-body text-[15px] text-white/75 mt-3.5">Logging out…</CustomText>
    </View>
  );
};

export default Loader;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.92)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
    elevation: 9999,
  },
  logo: {
    width: 200,
    height: 200,
  },
  spinner: {
    marginTop: 20,
  },
});
