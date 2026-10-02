import { fontTextStyles, headingTextStyles } from "@/utils/typography";
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import { InlineButtonSkeleton } from "@/components/skeletons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import CustomText from "@/components/CustomText";
import { BRAND } from "@/constants/stron";
import { selectAuthUser } from "../../model/auth.slice";
import { updateUserProfileThunk } from "../../model/auth.thunks";
import { RevenueCatService } from "@/features/payments";
import { href } from "@/navigation/href";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { showToastMessage } from "@/utils/app-utils";
import { ctaStyles } from "@/utils/ctaStyles";
import { dobToIsoString, createMinimalUser, parseUserDob, type StronUser } from "@/models/user";

const GENDERS = ["Male", "Female", "Other"];

const ProfileCompletionScreen = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectAuthUser);
  const [username, setUsername] = useState(user?.username ?? "");
  const [dob, setDob] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [contactNo, setContactNo] = useState(user?.contactNo ?? "");
  const [stepGoal, setStepGoal] = useState(String(user?.stepGoal ?? 10000));
  const [gender, setGender] = useState<string | null>(user?.gender ?? null);
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    const uid = user?.uid?.trim();
    if (!uid || saving) return;
    if (!username.trim()) {
      showToastMessage("Username is required");
      return;
    }
    setSaving(true);
    try {
      const payload: StronUser = {
        ...(user ?? createMinimalUser(uid)),
        uid,
        username: username.trim(),
        dob: (() => {
          const parsed = dob.trim() ? parseUserDob(dob.trim()) : null;
          return parsed ? dobToIsoString(parsed) : (user?.dob ?? null);
        })(),
        weight: weight.trim() ? Number(weight) : user?.weight,
        height: height.trim() ? Number(height) : user?.height,
        contactNo: contactNo.trim() || user?.contactNo,
        stepGoal: stepGoal.trim() ? Number(stepGoal) : user?.stepGoal,
        gender: gender ?? user?.gender,
      };
      await dispatch(updateUserProfileThunk(payload)).unwrap();
      void RevenueCatService.syncProfileAttributes(payload);
      showToastMessage("Profile saved");
      router.replace(href.app.tabs);
    } catch (error) {
      showToastMessage(error instanceof Error ? error.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <LinearGradient colors={[BRAND.gradientTop, BRAND.gradientBottom]} style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <CustomText text="Complete Your Profile" style={styles.title} />
        <CustomText text="Tell us a bit about yourself to personalize Stron." style={styles.sub} />

        <Field
          label="Username"
          value={username}
          onChangeText={setUsername}
          placeholder="Choose a username"
        />
        <Field
          label="Date of Birth (YYYY-MM-DD)"
          value={dob}
          onChangeText={setDob}
          placeholder="YYYY-MM-DD"
        />
        <Field
          label="Weight (kg)"
          value={weight}
          onChangeText={setWeight}
          keyboardType="numeric"
          placeholder="e.g. 70"
        />
        <Field
          label="Height (cm)"
          value={height}
          onChangeText={setHeight}
          keyboardType="numeric"
          placeholder="e.g. 175"
        />
        <Field
          label="Phone (10 digits)"
          value={contactNo}
          onChangeText={setContactNo}
          keyboardType="phone-pad"
          placeholder="10-digit mobile number"
        />
        <Field
          label="Daily Step Goal"
          value={stepGoal}
          onChangeText={setStepGoal}
          keyboardType="numeric"
          placeholder="e.g. 10000"
        />

        <CustomText text="Gender" style={styles.fieldLabel} />
        <View style={styles.genderRow}>
          {GENDERS.map((option) => (
            <TouchableOpacity
              key={option}
              style={[styles.genderChip, gender === option && styles.genderChipActive]}
              onPress={() => setGender(option)}
              activeOpacity={0.7}
            >
              <CustomText
                text={option}
                style={[styles.genderText, gender === option && styles.genderTextActive]}
              />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.saveBtn}
          onPress={onSave}
          disabled={saving}
          activeOpacity={0.7}
        >
          {saving ? (
            <InlineButtonSkeleton width={88} />
          ) : (
            <CustomText text="CONTINUE" style={styles.saveBtnText} />
          )}
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
};

const Field = ({
  label,
  value,
  onChangeText,
  keyboardType,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: "default" | "numeric" | "phone-pad";
  placeholder?: string;
}) => (
  <View style={styles.field}>
    <CustomText text={label} style={styles.fieldLabel} />
    <TextInput
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      style={styles.input}
      placeholder={placeholder ?? `Enter ${label.toLowerCase()}`}
      placeholderTextColor="rgba(255,255,255,0.4)"
    />
  </View>
);

export default ProfileCompletionScreen;

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 24, gap: 12, paddingBottom: 40 },
  title: {
    ...headingTextStyles.thirtyExtraBoldBlack,
    color: "#FDD85D",
  },
  sub: { ...fontTextStyles.fourteenNormalBlack, color: "rgba(255,255,255,0.75)", marginBottom: 8 },
  field: { gap: 6 },
  fieldLabel: {
    ...fontTextStyles.fourteenSemiBoldBlack,
    color: "#FDD85D",
  },
  input: {
    ...fontTextStyles.fourteenNormalBlack,
    minHeight: 48,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 10,
    paddingHorizontal: 14,
    color: "#FFF",
  },
  genderRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  genderChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  genderChipActive: { backgroundColor: "#FDD85D", borderColor: "#FDD85D" },
  genderText: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "#FFF",
  },
  genderTextActive: { ...fontTextStyles.fourteenSemiBoldBlack, color: "#111" },
  saveBtn: {
    ...ctaStyles.primaryButton,
    marginTop: 12,
    borderRadius: 12,
  },
  saveBtnText: ctaStyles.primaryButtonText,
});
