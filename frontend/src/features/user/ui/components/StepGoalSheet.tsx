import {
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { InlineButtonSkeleton } from "@/components/skeletons";
import { useEffect, useMemo, useState } from "react";
import CustomText from "@/components/CustomText";
import { fontTextStyles } from "@/utils/typography";
import { STEP_GOAL_OPTIONS } from "../profile.utils";

type Props = {
  visible: boolean;
  initialGoal?: number | null;
  onClose: () => void;
  onSave: (goal: number) => void;
  saving?: boolean;
};

const StepGoalSheet = ({ visible, initialGoal, onClose, onSave, saving }: Props) => {
  const [value, setValue] = useState(String(initialGoal ?? ""));

  useEffect(() => {
    if (visible) {
      setValue(String(initialGoal ?? ""));
    }
  }, [visible, initialGoal]);

  const selected = value.trim();

  const onSelectPreset = (goal: string) => {
    setValue(goal);
  };

  const onSubmit = () => {
    const parsed = Number.parseInt(selected, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    onSave(parsed);
  };

  const presetRows = useMemo(() => STEP_GOAL_OPTIONS, []);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.headerRow}>
          <CustomText text="Daily Steps Goal" style={styles.title} />
          <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
            <CustomText text="✕" style={styles.close} />
          </TouchableOpacity>
        </View>

        <TextInput
          value={value}
          onChangeText={setValue}
          keyboardType="number-pad"
          placeholder="Enter your daily step goal"
          placeholderTextColor="#999"
          style={styles.input}
        />

        <View style={styles.chipsWrap}>
          {presetRows.map((goal: string) => {
            const active = selected === goal;
            return (
              <TouchableOpacity
                key={goal}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => onSelectPreset(goal)}
                activeOpacity={0.7}
              >
                <CustomText
                  text={goal}
                  style={[styles.chipText, active && styles.chipTextActive]}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={styles.saveBtn}
          onPress={onSubmit}
          disabled={saving}
          activeOpacity={0.7}
        >
          {saving ? (
            <InlineButtonSkeleton width={48} />
          ) : (
            <CustomText text="SAVE GOAL" style={styles.saveText} />
          )}
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  title: {
    ...fontTextStyles.size24BoldBlack,
    color: "#111111",
  },
  close: {
    ...fontTextStyles.size24NormalBlack,
    color: "#111111",
    padding: 4,
  },
  input: {
    ...fontTextStyles.eighteenSemiBoldBlack,
    borderWidth: 1,
    borderColor: "#999999",
    borderRadius: 8,
    height: 52,
    paddingHorizontal: 16,
    color: "#191919",
    marginBottom: 16,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },
  chip: {
    borderWidth: 1,
    borderColor: "#CCCCCC",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: "#006AD0",
    borderColor: "#006AD0",
  },
  chipText: {
    ...fontTextStyles.sixteenMediumBlack,
    color: "#333333",
  },
  chipTextActive: {
    color: "#FFFFFF",
  },
  saveBtn: {
    height: 52,
    backgroundColor: "#0070FF",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: {
    ...fontTextStyles.eighteenSemiBoldBlack,
    color: "#FFFFFF",
    textAlign: "center",
  },
});

export default StepGoalSheet;
