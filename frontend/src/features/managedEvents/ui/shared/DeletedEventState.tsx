import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { href } from "@/navigation/href";
import { fontTextStyles, headingTextStyles } from "@/utils/typography";

type Props = {
  title?: string;
  message?: string;
  onBack?: () => void;
};

const DEFAULT_TITLE = "Event Has Been Deleted";
const DEFAULT_MESSAGE =
  "This event is no longer available as it was removed by the organizer. If you purchased a ticket, refunds will be automatically settled within 3 to 5 business days.";

export const DeletedEventState = ({
  title = DEFAULT_TITLE,
  message = DEFAULT_MESSAGE,
  onBack,
}: Props) => {
  const router = useRouter();

  const handleAction = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(href.app.tabs as never);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Ionicons name="trash-outline" size={32} color="#FF5151" />
        </View>

        <CustomText style={styles.title}>
          {title}
        </CustomText>

        <CustomText style={styles.message}>
          {message}
        </CustomText>

        <PressableScale
          onPress={handleAction}
          style={styles.actionBtn}
        >
          <CustomText style={styles.actionText}>Explore Events</CustomText>
        </PressableScale>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#090909",
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 24,
    backgroundColor: "#18181A",
    borderWidth: 1,
    borderColor: "rgba(255, 81, 81, 0.25)",
    padding: 24,
    alignItems: "center",
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255, 81, 81, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 81, 81, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    ...headingTextStyles.size24BoldBlack,
    textAlign: "center",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  message: {
    ...fontTextStyles.sixteenNormalBlack,
    textAlign: "center",
    color: "rgba(255, 255, 255, 0.7)",
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  actionBtn: {
    width: "100%",
    height: 50,
    borderRadius: 25,
    backgroundColor: "#0070FF",
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: {
    ...fontTextStyles.sixteenBoldBlack,
    color: "#FFFFFF",
  },
});

export default DeletedEventState;
