import React, { useCallback } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ConfirmationPublishedView } from "@/components/confirmation";
import { href } from "@/navigation/href";
import { shareEvent } from "@/utils/shareEvent";
import { useProSubscription } from "@/features/gymBusiness";

/**
 * Event & Listing Published Congrats Screen (Figma redesigned confirmation).
 */
const EventPublishedScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{
    key?: string;
    title?: string;
    type?: string;
  }>();

  const { isPro, isTrialEligible, isSubmitting, offeringsPrices, startFreeTrial, subscribe } =
    useProSubscription();

  const eventKey = typeof params.key === "string" ? params.key : "";
  const title = typeof params.title === "string" ? params.title : "My Event";
  const isListing = params.type === "listing" || !params.type;

  const handleShare = useCallback(async () => {
    if (!eventKey) return;
    await shareEvent({ title, eventKey });
  }, [eventKey, title]);

  const handleSeePreview = useCallback(() => {
    if (!eventKey) {
      router.replace(href.app.organizeCreate);
      return;
    }
    router.replace({
      pathname: href.app.organizerPreview,
      params: { key: eventKey },
    });
  }, [eventKey, router]);

  const handleUpgradePro = useCallback(async () => {
    if (isTrialEligible) {
      await startFreeTrial();
    } else {
      await subscribe();
    }
  }, [isTrialEligible, startFreeTrial, subscribe]);

  return (
    <ConfirmationPublishedView
      title="Congrats"
      subtitle="Now your Listing is live and Discoverable by thousands of fitness enthusiasts"
      isListing={isListing}
      isPro={isPro}
      isTrialEligible={isTrialEligible}
      isSubmittingPro={isSubmitting}
      proPrice={offeringsPrices?.amount}
      proBillingPeriod={offeringsPrices?.period}
      proCtaLabel={offeringsPrices?.cta}
      shareLabel="Share Event"
      previewLabel="See Preview"
      onShare={handleShare}
      onSeePreview={handleSeePreview}
      onUpgradePro={handleUpgradePro}
    />
  );
};

export default EventPublishedScreen;
