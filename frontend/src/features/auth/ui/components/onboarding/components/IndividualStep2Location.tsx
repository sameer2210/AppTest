import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import CustomText from "@/components/CustomText";
import Animated, { FadeInDown } from "react-native-reanimated";
import PressableScale from "@/components/ui/PressableScale";
import { OnboardingStepLayout } from "./OnboardingStepLayout";
import { StepBadgeIcon } from "./StepBadgeIcon";
import { images } from "@/utils/images";
import { showToastMessage } from "@/utils/app-utils";
import { LocationSearchService as locationSearchService, type LocationSuggestion } from "@/features/core";
import { fontTextStyles, headingTextStyles } from "@/utils/typography";

type Props = {
  onBack: () => void;
  onContinue: (location: string) => void;
  onUseCurrentLocation: () => void;
  onSkip: () => void;
  initialLocation?: string;
  locating?: boolean;
};

const SUGGESTIONS_MAX_HEIGHT = 200;

export const IndividualStep2Location = ({
  onBack,
  onContinue,
  onUseCurrentLocation,
  onSkip,
  initialLocation = "",
  locating = false,
}: Props) => {
  const [manualLocation, setManualLocation] = useState(initialLocation);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const q = manualLocation.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setSearching(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setSearching(true);
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const hits = await locationSearchService.search(q);
          if (requestId !== requestIdRef.current) return;
          setSuggestions(hits.slice(0, 8));
          setShowSuggestions(true);
        } catch {
          if (requestId !== requestIdRef.current) return;
          setSuggestions([]);
        } finally {
          if (requestId === requestIdRef.current) setSearching(false);
        }
      })();
    }, 350);

    return () => clearTimeout(timer);
  }, [manualLocation]);

  const selectSuggestion = (item: LocationSuggestion) => {
    const label = item.label || item.name;
    setManualLocation(label);
    setSuggestions([]);
    setShowSuggestions(false);
    Keyboard.dismiss();
    onContinue(label);
  };

  const dismissSuggestions = () => {
    Keyboard.dismiss();
    setShowSuggestions(false);
  };

  return (
    <OnboardingStepLayout
      bgImageSource={images.ONBOARDING.INDIVIDUAL_2}
      onBack={onBack}
      onSkip={onSkip}
      showSkip
      activeStepIndex={1}
      primaryButtonLabel="Continue"
      onPrimaryPress={() => {
        const loc = manualLocation.trim();
        if (!loc) {
          showToastMessage("Please enter your location");
          return;
        }
        setShowSuggestions(false);
        onContinue(loc);
      }}
    >
      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable onPress={dismissSuggestions}>
          <StepBadgeIcon iconName="navigate-outline" iconSize={34} />

          <Animated.View
            entering={FadeInDown.duration(400).delay(100)}
            style={styles.headerTextContainer}
          >
            <CustomText style={styles.headerTitle}>
              You can discover gyms, fitness events, workshops and more near you.
            </CustomText>
          </Animated.View>
        </Pressable>

        <Animated.View
          entering={FadeInDown.duration(400).delay(150)}
          style={styles.formContainer}
        >
          <CustomText style={styles.sectionTitle}>
            Where are you currently located?
          </CustomText>

          <PressableScale
            scale={0.98}
            onPress={onUseCurrentLocation}
            style={styles.currentLocationButton}
          >
            <CustomText style={styles.currentLocationButtonText}>
              {locating ? "Finding your location..." : "Use Current Location"}
            </CustomText>
          </PressableScale>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <CustomText style={styles.dividerText}>OR</CustomText>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.searchContainer}>
            <View style={styles.inputWrapper}>
              <TextInput
                value={manualLocation}
                onChangeText={(text) => {
                  setManualLocation(text);
                  setShowSuggestions(true);
                }}
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true);
                }}
                placeholder="Enter Location"
                placeholderTextColor="rgba(255,255,255,0.4)"
                style={styles.textInput}
                returnKeyType="done"
                onSubmitEditing={() => {
                  const loc = manualLocation.trim();
                  if (!loc) {
                    showToastMessage("Please enter your location");
                    return;
                  }
                  setShowSuggestions(false);
                  onContinue(loc);
                }}
              />

              {searching ? (
                <View
                  pointerEvents="none"
                  style={styles.indicatorWrapper}
                >
                  <ActivityIndicator color="#2B82FF" size="small" />
                </View>
              ) : null}
            </View>

            {showSuggestions && suggestions.length > 0 ? (
              <View style={styles.suggestionsDropdown}>
                <FlatList
                  data={suggestions}
                  keyExtractor={(item) => item.id}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled
                  bounces
                  style={{ flex: 1 }}
                  contentContainerStyle={{ paddingBottom: 4 }}
                  showsVerticalScrollIndicator
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => selectSuggestion(item)}
                      style={styles.suggestionItem}
                    >
                      <CustomText style={styles.suggestionName} numberOfLines={1}>
                        {item.name}
                      </CustomText>
                      <CustomText style={styles.suggestionLabel} numberOfLines={1}>
                        {item.label}
                      </CustomText>
                    </Pressable>
                  )}
                />
              </View>
            ) : null}
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </OnboardingStepLayout>
  );
};

const styles = StyleSheet.create({
  keyboardAvoiding: {
    flex: 1,
  },
  headerTextContainer: {
    paddingHorizontal: 24,
    alignItems: "center",
    marginBottom: 20,
  },
  headerTitle: {
    ...headingTextStyles.h3,
    fontSize: 22,
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 30,
  },
  formContainer: {
    paddingHorizontal: 20,
    width: "100%",
    flex: 1,
  },
  sectionTitle: {
    ...fontTextStyles.semiBold,
    fontSize: 16,
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 16,
  },
  currentLocationButton: {
    height: 52,
    width: "100%",
    borderRadius: 10,
    backgroundColor: "rgba(71, 150, 255, 0.5)",
    borderWidth: 1,
    borderColor: "rgba(113, 186, 255, 0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  currentLocationButtonText: {
    ...fontTextStyles.semiBold,
    fontSize: 16,
    color: "#FFFFFF",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  dividerText: {
    marginHorizontal: 12,
    ...fontTextStyles.bold,
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
  },
  searchContainer: {
    position: "relative",
    zIndex: 20,
  },
  inputWrapper: {
    position: "relative",
  },
  textInput: {
    height: 56,
    width: "100%",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    backgroundColor: "rgba(11, 26, 58, 0.8)",
    paddingHorizontal: 16,
    ...fontTextStyles.regular,
    fontSize: 16,
    color: "#FFFFFF",
  },
  indicatorWrapper: {
    position: "absolute",
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  suggestionsDropdown: {
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    backgroundColor: "#0B1A3A",
    overflow: "hidden",
    height: SUGGESTIONS_MAX_HEIGHT,
  },
  suggestionItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  suggestionName: {
    ...fontTextStyles.semiBold,
    fontSize: 15,
    color: "#FFFFFF",
  },
  suggestionLabel: {
    ...fontTextStyles.regular,
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.55)",
    marginTop: 2,
  },
});
