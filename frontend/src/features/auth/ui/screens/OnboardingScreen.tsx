import React, { useCallback, useState } from "react";
import { Alert, Image, StatusBar, StyleSheet, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectAuthLoading,
  selectAuthUser,
} from "../../model/auth.slice";
import { completeLogin, updateUserProfileThunk } from "../../model/auth.thunks";
import { setSelectedCity as setExploreSelectedCity } from "@/features/explore";
import { setSelectedCity as setEventsSelectedCity } from "@/features/events";
import { saveLastCity } from "@/utils/exploreStorage";
import { showToastMessage } from "@/utils/app-utils";
import { images } from "@/utils/images";
import { href } from "@/navigation/href";
import { captureEvent } from "@/analytics/posthog/events";
import { logError } from "@/config/devLogger";
import { OnboardingSlide1, UserRoleType } from "../components/onboarding/components/OnboardingSlide1";
import { BusinessStep1Name } from "../components/onboarding/components/BusinessStep1Name";
import { BusinessStep2Offers } from "../components/onboarding/components/BusinessStep2Offers";
import { BusinessStep3Help } from "../components/onboarding/components/BusinessStep3Help";
import { BusinessStep4Success } from "../components/onboarding/components/BusinessStep4Success";
import { IndividualStep1Name } from "../components/onboarding/components/IndividualStep1Name";
import { IndividualStep2Location } from "../components/onboarding/components/IndividualStep2Location";
import { IndividualStep3StepTracking } from "../components/onboarding/components/IndividualStep3StepTracking";
import { IndividualStep4Success } from "../components/onboarding/components/IndividualStep4Success";
import { requestStepPermissions } from "@/features/steps";
import { LocationService } from "@/features/core";
import { OnboardingAuthSheet } from "../components/onboarding/components/OnboardingAuthSheet";
import { OnboardingHeader } from "../components/onboarding/components/OnboardingHeader";

type OnboardingStep =
  | "role_selection"
  | "business_step1"
  | "business_step2"
  | "business_step3"
  | "business_step4"
  | "individual_step1"
  | "individual_step2"
  | "individual_step3"
  | "individual_step4"
  | "individual_flow";

const OnboardingScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const isAuthLoading = useAppSelector(selectAuthLoading);
  const currentUser = useAppSelector(selectAuthUser);

  const [step, setStep] = useState<OnboardingStep>("role_selection");
  const [selectedRole, setSelectedRole] = useState<UserRoleType>("individual");
  const [businessName, setBusinessName] = useState("");
  const [businessOffers, setBusinessOffers] = useState<string[]>([]);
  const [businessFeatures, setBusinessFeatures] = useState<string[]>([]);

  const [userName, setUserName] = useState("");
  const [userLocation, setUserLocation] = useState("");
  const [isLocating, setIsLocating] = useState(false);

  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setIsGoogleLoading(false);
      setIsGuestLoading(false);

      // Must be signed in to continue onboarding. Phone may still be syncing
      // right after OTP — only bounce to login when there is no session at all.
      if (!currentUser?.uid) {
        router.replace(href.auth.login as never);
      }
    }, [currentUser?.uid, router]),
  );

  const handleRoleContinue = (role: UserRoleType) => {
    setSelectedRole(role);
    captureEvent("onboarding_role_selected", { role });
    if (role === "business") {
      setStep("business_step1");
    } else {
      setStep("individual_step1");
    }
  };

  // Business Step Handlers
  const handleBusinessStep1Continue = (name: string) => {
    setBusinessName(name);
    setStep("business_step2");
  };

  const handleBusinessStep2Continue = (offers: string[]) => {
    setBusinessOffers(offers);
    setStep("business_step3");
  };

  const handleBusinessStep3Continue = (features: string[]) => {
    setBusinessFeatures(features);
    setStep("business_step4");
  };

  const guestProfile = {
    username: userName.trim() || businessName.trim() || undefined,
    location: userLocation.trim() || undefined,
    city: userLocation.trim() ? userLocation.trim().split(",")[0].trim() : undefined,
    onboardingRole: selectedRole,
    onboardingBusinessName: businessName.trim() || undefined,
    onboardingBusinessOffers: businessOffers.length ? businessOffers : undefined,
    onboardingBusinessFeatures: businessFeatures.length ? businessFeatures : undefined,
  };

  const saveOnboardingProfile = async (targetRoute?: string) => {
    captureEvent("onboarding_completed", { role: selectedRole });

    if (userLocation.trim()) {
      const cityName = userLocation.trim().split(",")[0].trim();
      const cityObj = {
        id: cityName.toLowerCase().replace(/\s+/g, "_"),
        name: cityName,
        label: userLocation.trim(),
      };
      dispatch(setExploreSelectedCity(cityObj));
      dispatch(setEventsSelectedCity(cityName));
      void saveLastCity(cityObj);
    }

    if (currentUser?.uid) {
      try {
        const updatePayload = {
          uid: currentUser.uid,
          ...(userName.trim() ? { username: userName.trim() } : {}),
          ...(userLocation.trim()
            ? {
              location: userLocation.trim(),
              city: userLocation.trim().split(",")[0].trim(),
            }
            : {}),
          onboardingRole: selectedRole,
          ...(businessName.trim() ? { onboardingBusinessName: businessName.trim() } : {}),
        };
        await dispatch(
          updateUserProfileThunk({
            ...currentUser,
            ...updatePayload,
          }),
        ).unwrap();
      } catch (err) {
        logError("Failed to update profile after onboarding", err);
      }
      router.replace((targetRoute || href.app.tabs) as never);
    } else {
      finishGuestOnboarding(targetRoute || href.app.tabs);
    }
  };

  const finishGuestOnboarding = (targetRoute?: string) => {
    if (isGuestLoading || isAuthLoading) return;
    captureEvent("onboarding_cta_tapped", { method: "guest" });
    setIsGuestLoading(true);

    if (userLocation.trim()) {
      const cityName = userLocation.trim().split(",")[0].trim();
      const cityObj = {
        id: cityName.toLowerCase().replace(/\s+/g, "_"),
        name: cityName,
        label: userLocation.trim(),
      };
      dispatch(setExploreSelectedCity(cityObj));
      dispatch(setEventsSelectedCity(cityName));
      void saveLastCity(cityObj);
    }

    void dispatch(completeLogin({ mode: "guest", ...guestProfile, navigate: false }))
      .unwrap()
      .then(() => {
        router.replace((targetRoute || href.app.tabs) as never);
      })
      .catch((err) =>
        showToastMessage(typeof err === "string" ? err : err?.message || "Guest sign-in failed"),
      )
      .finally(() => setIsGuestLoading(false));
  };

  // Direct -> Home screen / target on finish onboarding
  const handleFinishBusinessOnboarding = (targetRoute?: string) => {
    void saveOnboardingProfile(targetRoute || href.app.tabs);
  };

  // Individual Step Handlers
  const handleIndividualStep1Continue = (name: string) => {
    setUserName(name);
    setStep("individual_step2");
  };

  const handleIndividualStep2Continue = (loc: string) => {
    setUserLocation(loc);
    setStep("individual_step3");
  };

  const handleUseCurrentLocation = async () => {
    if (isLocating) return;
    setIsLocating(true);
    try {
      const status = await LocationService.ensurePermission();
      if (status !== "granted") {
        if (status === "blocked") {
          Alert.alert(
            "Location Permission Required",
            "STRON needs location access to automatically find gyms, fitness events, and races near you. Please enable location permissions in Settings.",
            [
              { text: "Enter Manually", style: "cancel" },
              {
                text: "Open Settings",
                onPress: () => {
                  void LocationService.openSettings();
                },
              },
            ],
          );
        } else {
          Alert.alert(
            "Location Permission",
            "Please allow location access to automatically detect your current city.",
            [
              { text: "Enter Manually", style: "cancel" },
              {
                text: "Allow Access",
                onPress: async () => {
                  const reqStatus = await LocationService.requestPermission();
                  if (reqStatus === "granted") {
                    void handleUseCurrentLocation();
                  }
                },
              },
            ],
          );
        }
        return;
      }
      const position = await LocationService.getCurrentPosition({ forceFresh: true });
      const label = await LocationService.reverseGeocodeLabel(
        position.latitude,
        position.longitude,
      );
      handleIndividualStep2Continue(label);
    } catch (err: any) {
      if (err?.message === "LOCATION_SERVICES_DISABLED") {
        Alert.alert(
          "Location Services Disabled",
          "Please turn on your device's location/GPS to detect your current city.",
          [
            { text: "Enter Manually", style: "cancel" },
            {
              text: "Turn On",
              onPress: () => {
                void LocationService.openLocationSettings();
              },
            },
          ],
        );
      } else {
        showToastMessage("Could not get your current location. Please enter it manually.");
      }
    } finally {
      setIsLocating(false);
    }
  };

  const handleIndividualStep3Continue = () => {
    void dispatch(requestStepPermissions());
    setStep("individual_step4");
  };

  // Direct -> Home or Step Race on finish onboarding
  const handleFinishIndividualOnboarding = (targetRoute?: string) => {
    void saveOnboardingProfile(targetRoute);
  };

  const onGoogleSignIn = () => {
    if (isGoogleLoading || isAuthLoading) return;
    captureEvent("onboarding_cta_tapped", { method: "google" });
    setIsGoogleLoading(true);
    void dispatch(completeLogin({ mode: "google" }))
      .unwrap()
      .catch((err) =>
        showToastMessage(typeof err === "string" ? err : err?.message || "Google sign-in failed"),
      )
      .finally(() => setIsGoogleLoading(false));
  };

  const onPhoneSignIn = () => {
    captureEvent("onboarding_cta_tapped", { method: "phone" });
    router.push({
      pathname: href.auth.login,
      params: { slide: 0 },
    });
  };

  const onGuestSignIn = () => {
    if (isGuestLoading || isAuthLoading) return;
    captureEvent("onboarding_cta_tapped", { method: "guest" });
    setIsGuestLoading(true);
    void dispatch(completeLogin({ mode: "guest", ...guestProfile }))
      .unwrap()
      .catch((err) =>
        showToastMessage(typeof err === "string" ? err : err?.message || "Guest sign-in failed"),
      )
      .finally(() => setIsGuestLoading(false));
  };

  // Render Business Flow Steps
  if (step === "business_step1") {
    return (
      <BusinessStep1Name
        onBack={() => setStep("role_selection")}
        onContinue={handleBusinessStep1Continue}
      />
    );
  }

  if (step === "business_step2") {
    return (
      <BusinessStep2Offers
        onBack={() => setStep("business_step1")}
        onContinue={handleBusinessStep2Continue}
        onSkip={() => setStep("business_step3")}
      />
    );
  }

  if (step === "business_step3") {
    return (
      <BusinessStep3Help
        onBack={() => setStep("business_step2")}
        onContinue={handleBusinessStep3Continue}
        onSkip={() => setStep("business_step4")}
      />
    );
  }

  if (step === "business_step4") {
    return (
      <BusinessStep4Success
        onBack={() => setStep("business_step3")}
        onGetPro={() => handleFinishBusinessOnboarding(href.app.gymOnboarding)}
        onContinue={() => handleFinishBusinessOnboarding(href.app.gymOnboarding)}
        actionsLoading={isGuestLoading || isAuthLoading}
      />
    );
  }

  // Render Individual Flow Steps
  if (step === "individual_step1") {
    return (
      <IndividualStep1Name
        onBack={() => setStep("role_selection")}
        onContinue={handleIndividualStep1Continue}
        onSkip={() => setStep("individual_step2")}
        initialName={userName}
      />
    );
  }

  if (step === "individual_step2") {
    return (
      <IndividualStep2Location
        onBack={() => setStep("individual_step1")}
        onContinue={handleIndividualStep2Continue}
        onUseCurrentLocation={() => void handleUseCurrentLocation()}
        onSkip={() => setStep("individual_step3")}
        initialLocation={userLocation}
        locating={isLocating}
      />
    );
  }

  if (step === "individual_step3") {
    return (
      <IndividualStep3StepTracking
        onBack={() => setStep("individual_step2")}
        onAllowStepTracking={handleIndividualStep3Continue}
        onSkip={() => setStep("individual_step4")}
      />
    );
  }

  if (step === "individual_step4") {
    return (
      <IndividualStep4Success
        onBack={() => setStep("individual_step3")}
        onStartRaceNow={() => handleFinishIndividualOnboarding(href.app.stepRace)}
        onTryLater={() => handleFinishIndividualOnboarding(href.app.tabs)}
        actionsLoading={isGuestLoading || isAuthLoading}
      />
    );
  }

  // Render Auth Sheet (Google / Phone / Guest)
  if (step === "individual_flow") {
    return (
      <View style={styles.screen}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <Image
          source={images.HOME_V2.BG}
          style={[StyleSheet.absoluteFillObject, { transform: [{ scaleY: -1 }] }]}
          resizeMode="cover"
        />

        <View style={{ paddingTop: Math.max(insets.top, 10) }}>
          <OnboardingHeader
            onBack={() => {
              if (selectedRole === "business") {
                setStep("business_step4");
              } else {
                setStep("individual_step4");
              }
            }}
          />
        </View>

        <OnboardingAuthSheet
          insetsBottom={insets.bottom}
          isAuthLoading={isAuthLoading}
          isGoogleLoading={isGoogleLoading}
          isGuestLoading={isGuestLoading}
          onGoogleSignIn={onGoogleSignIn}
          onPhoneSignIn={onPhoneSignIn}
          onGuestSignIn={onGuestSignIn}
        />
      </View>
    );
  }

  // Default: Welcome & Role Selection (no back — OTP already done)
  return <OnboardingSlide1 onContinue={handleRoleContinue} currentSlideIndex={0} totalSlides={4} />;
};

export default OnboardingScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "black",
  },
});
