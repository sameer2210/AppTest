import React from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { PlanPublishedScreenContent } from "../components";
import { href } from "@/navigation/href";
import { useProSubscription } from "../hooks/useProSubscription";

export const PlanPublishedScreen: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{
    planId?: string;
    planName?: string;
    price?: string;
    duration?: string;
    durationUnit?: string;
  }>();
  const planId = typeof params.planId === "string" ? params.planId : "";
  const planName = typeof params.planName === "string" ? params.planName : "Gym Membership Plan";
  const price = params.price;
  const duration = params.duration;
  const durationUnit = params.durationUnit;

  const { isPro, isTrialEligible, isSubmitting, offeringsPrices, startFreeTrial, subscribe } =
    useProSubscription();

  const handleUpgradeToPro = async () => {
    if (isTrialEligible) {
      await startFreeTrial();
    } else {
      await subscribe();
    }
  };

  const handleSeePreview = () => {
    router.push({
      pathname: href.app.planPreview as any,
      params: {
        planId,
        planName,
      },
    });
  };

  const handleBackToDashboard = () => {
    router.replace(href.app.businessPlan as never);
  };

  return (
    <PlanPublishedScreenContent
      planId={planId}
      planName={planName}
      price={price}
      duration={duration}
      durationUnit={durationUnit}
      isPro={isPro}
      isTrialEligible={isTrialEligible}
      isSubmitting={isSubmitting}
      proPrice={offeringsPrices?.amount}
      proBillingPeriod={offeringsPrices?.period}
      proCtaLabel={offeringsPrices?.cta}
      onUpgradeToPro={handleUpgradeToPro}
      onSeePreview={handleSeePreview}
      onBackToDashboard={handleBackToDashboard}
    />
  );
};

export default PlanPublishedScreen;
