import React, { memo } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { showToastMessage } from "@/utils/app-utils";
import { fontTextStyles, headingTextStyles } from "@/utils/typography";

type Props = {
  manualInputCode: string;
  onChangeText: (text: string) => void;
  onPaste: () => void;
  onSubmit: (code: string) => void;
};

export const ManualCodeInputView: React.FC<Props> = memo(
  ({ manualInputCode, onChangeText, onPaste, onSubmit }) => {
    return (
      <View style={styles.card}>
        {/* Header inside Card */}
        <View style={styles.header}>
          <CustomText style={styles.title}>Enter Code Manually</CustomText>
          <CustomText style={styles.subtitle}>
            Enter your 5-digit connect code
          </CustomText>
        </View>

        {/* Middle Section: Text Input & Separate Paste Button */}
        <View style={styles.middleSection}>
          <View style={styles.inputRow}>
            <TextInput
              value={manualInputCode}
              onChangeText={onChangeText}
              placeholder="A7X9K"
              placeholderTextColor="rgba(255, 255, 255, 0.35)"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={5}
              style={styles.textInput}
            />
            <PressableScale
              onPress={onPaste}
              style={styles.pasteButton}
            >
              <Ionicons name="clipboard-outline" size={16} color="#FFFFFF" />
              <CustomText style={styles.pasteButtonText}>Paste</CustomText>
            </PressableScale>
          </View>
        </View>

        {/* Submit Button inside Card */}
        <PressableScale
          onPress={() => {
            const code = manualInputCode.trim();
            if (code) {
              onSubmit(code);
            } else {
              showToastMessage("Please enter a code");
            }
          }}
          style={styles.submitButton}
        >
          <CustomText style={styles.submitButtonText}>Submit Code</CustomText>
        </PressableScale>
      </View>
    );
  },
);

ManualCodeInputView.displayName = "ManualCodeInputView";

const styles = StyleSheet.create({
  card: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    padding: 24,
    backgroundColor: "#0B1E42",
  },
  header: {
    alignItems: "center",
  },
  title: {
    ...headingTextStyles.h4,
    fontSize: 20,
    color: "#FFFFFF",
  },
  subtitle: {
    marginTop: 4,
    ...fontTextStyles.regular,
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
  },
  middleSection: {
    marginVertical: "auto",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  textInput: {
    height: 52,
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 16,
    ...fontTextStyles.bold,
    fontSize: 18,
    letterSpacing: 3,
    color: "#FFFFFF",
  },
  pasteButton: {
    height: 52,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    flexDirection: "row",
    gap: 6,
  },
  pasteButtonText: {
    ...fontTextStyles.medium,
    fontSize: 13,
    color: "#FFFFFF",
  },
  submitButton: {
    height: 50,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 25,
    backgroundColor: "#FFFFFF",
    elevation: 6,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  submitButtonText: {
    ...fontTextStyles.bold,
    fontSize: 16,
    color: "#000000",
  },
});

export default ManualCodeInputView;
