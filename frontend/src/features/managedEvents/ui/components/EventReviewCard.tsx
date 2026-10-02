import { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";

type Props = {
  rating: number;
  onRatingChange: (n: number) => void;
  comment: string;
  onCommentChange: (v: string) => void;
  onSubmit?: () => void;
  submitted?: boolean;
};

/** Completed-event review block — “You did Amazing” / Rate your Experience. */
const EventReviewCard = ({
  rating,
  onRatingChange,
  comment,
  onCommentChange,
  onSubmit,
  submitted = false,
}: Props) => {
  const [writing, setWriting] = useState(Boolean(comment));

  if (submitted) {
    return (
      <View style={styles.card}>
        <CustomText style={styles.topLabel}>Thanks!</CustomText>
        <CustomText style={styles.heading}>
          Your review was submitted
        </CustomText>
        <View style={styles.starRowSubmitted}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Ionicons
              key={n}
              name={n <= rating ? "star" : "star-outline"}
              size={28}
              color={n <= rating ? "#086CFF" : "rgba(217,217,217,0.35)"}
            />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <CustomText style={styles.topLabel}>You did Amazing</CustomText>
      <CustomText style={styles.heading}>Rate your Experience</CustomText>

      <View style={styles.starRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <PressableScale
            key={n}
            onPress={() => onRatingChange(n)}
            accessibilityRole="button"
            accessibilityLabel={`Rate ${n} stars`}
          >
            <Ionicons
              name={n <= rating ? "star" : "star-outline"}
              size={36}
              color={n <= rating ? "#086CFF" : "rgba(217,217,217,0.45)"}
            />
          </PressableScale>
        ))}
      </View>

      {writing ? (
        <TextInput
          value={comment}
          onChangeText={onCommentChange}
          placeholder="Write your review…"
          placeholderTextColor="rgba(255,255,255,0.35)"
          multiline
          style={styles.textInput}
          textAlignVertical="top"
        />
      ) : null}

      <View style={styles.btnRow}>
        <PressableScale
          onPress={onSubmit}
          style={styles.actionBtn}
          accessibilityRole="button"
          accessibilityLabel="Submit"
        >
          <CustomText style={styles.actionBtnText}>Submit</CustomText>
        </PressableScale>
        <PressableScale
          onPress={() => setWriting((v) => !v)}
          style={styles.actionBtn}
          accessibilityRole="button"
          accessibilityLabel="Write Review"
        >
          <CustomText style={styles.actionBtnText}>
            {writing ? "Hide Review" : "Write Review"}
          </CustomText>
        </PressableScale>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "#18181A",
    padding: 20,
  },
  topLabel: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.5)",
  },
  heading: {
    marginTop: 4,
    fontSize: 20,
    color: "#FFFFFF",
  },
  starRowSubmitted: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  starRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  textInput: {
    marginTop: 16,
    minHeight: 88,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: "#FFFFFF",
  },
  btnRow: {
    marginTop: 20,
    flexDirection: "row",
    gap: 12,
  },
  actionBtn: {
    height: 44,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "#D9D9D9",
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000000",
  },
});

export default EventReviewCard;
