import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { fontTextStyles, headingTextStyles } from "@/utils/typography";
import { ChipGridSkeleton, InlineButtonSkeleton } from "@/components/skeletons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import CustomText from "@/components/CustomText";
import { BRAND } from "@/constants/stron";
import { selectAuthUser, updateUser } from "../../model/auth.slice";
import { href } from "@/navigation/href";
import { UserService, InterestService } from "@/features/user";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { showToastMessage } from "@/utils/app-utils";
import { createMinimalUser, type StronUser } from "@/models/user";
import { ctaStyles } from "@/utils/ctaStyles";

const STEP_RANGES = ["< 1000", "1000 - 3000", "3000 - 6000", "6000 - 10000", "10000 +"];

const PreferencesScreen = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectAuthUser);
  const [interests, setInterests] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>(user?.interestAreas ?? []);
  const [stepRange, setStepRange] = useState<string | null>(
    user?.avgDailySteps ? String(user.avgDailySteps) : null,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void InterestService.fetchInterests().then((items) => {
      setInterests(items);
      setLoading(false);
    });
  }, []);

  const toggleInterest = (name: string) => {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name],
    );
  };

  const onSave = async () => {
    const uid = user?.uid?.trim();
    if (!uid || saving || selected.length === 0 || !stepRange) return;
    setSaving(true);
    try {
      const payload: StronUser = {
        ...(user ?? createMinimalUser(uid)),
        uid,
        interestAreas: selected,
        avgDailySteps: stepRange,
      };
      const updated = await UserService.updateProfile(payload);
      dispatch(updateUser(updated));
      router.replace(href.app.tabs);
    } catch (error) {
      showToastMessage(error instanceof Error ? error.message : "Could not save preferences");
    } finally {
      setSaving(false);
    }
  };

  return (
    <LinearGradient colors={[BRAND.gradientTop, BRAND.gradientBottom]} style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <CustomText text="Your Preferences" style={styles.title} />
        <CustomText text="Pick interests and your typical daily steps." style={styles.sub} />

        {loading ? (
          <ChipGridSkeleton count={8} />
        ) : (
          <>
            <CustomText text="Interests" style={styles.section} />
            <View style={styles.chipWrap}>
              {interests.map((name) => (
                <TouchableOpacity
                  key={name}
                  style={[styles.chip, selected.includes(name) && styles.chipActive]}
                  onPress={() => toggleInterest(name)}
                  activeOpacity={0.7}
                >
                  <CustomText
                    text={name}
                    style={[styles.chipText, selected.includes(name) && styles.chipTextActive]}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <CustomText text="Average daily steps" style={styles.section} />
            <View style={styles.chipWrap}>
              {STEP_RANGES.map((range) => (
                <TouchableOpacity
                  key={range}
                  style={[styles.chip, stepRange === range && styles.chipActive]}
                  onPress={() => setStepRange(range)}
                  activeOpacity={0.7}
                >
                  <CustomText
                    text={range}
                    style={[styles.chipText, stepRange === range && styles.chipTextActive]}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <TouchableOpacity
          style={[styles.saveBtn, (selected.length === 0 || !stepRange) && styles.saveBtnDisabled]}
          onPress={onSave}
          disabled={saving || selected.length === 0 || !stepRange}
          activeOpacity={0.7}
        >
          {saving ? (
            <InlineButtonSkeleton width={96} />
          ) : (
            <CustomText text="GET STARTED" style={styles.saveBtnText} />
          )}
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
};

export default PreferencesScreen;

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 24, gap: 12, paddingBottom: 40 },
  title: {
    ...headingTextStyles.thirtyExtraBoldBlack,
    color: "#FDD85D",
  },
  sub: { ...fontTextStyles.fourteenNormalBlack, color: "rgba(255,255,255,0.75)", marginBottom: 8 },
  section: {
    ...fontTextStyles.eighteenSemiBoldBlack,
    color: "#FFF",
    marginTop: 8,
  },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  chipActive: { backgroundColor: "#FDD85D", borderColor: "#FDD85D" },
  chipText: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "#FFF",
  },
  chipTextActive: { ...fontTextStyles.fourteenSemiBoldBlack, color: "#111" },
  saveBtn: {
    ...ctaStyles.primaryButton,
    marginTop: 20,
    borderRadius: 12,
  },
  saveBtnDisabled: {
    opacity: 0.45,
  },
  saveBtnText: ctaStyles.primaryButtonText,
});
