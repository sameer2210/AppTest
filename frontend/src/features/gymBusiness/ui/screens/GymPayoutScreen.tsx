import React, { useCallback } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { PayoutVerificationScreenContent, type PayoutFlowStep } from "../components";

export const GymPayoutScreen: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ step?: PayoutFlowStep; gymName?: string }>();
  const step = params.step || "FORM";
  const gymName = params.gymName || "Business";

  const handleExit = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <PayoutVerificationScreenContent
      initialStep={step}
      gymName={gymName}
      onBack={handleExit}
      onDone={handleExit}
    />
  );
};

export default GymPayoutScreen;
