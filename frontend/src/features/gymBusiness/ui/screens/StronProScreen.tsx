import React, { useEffect, useRef } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { href } from "@/navigation/href";
import { StronProScreenContent } from "../components";
import { useProSubscription } from "../hooks";

export const StronProScreen: React.FC = () => {
  const router = useRouter();
  const presented = useRef(false);
  const {
    subscription,
    features,
    isPro,
    offeringsPrices,
    isLoading,
    isSubmitting,
    isRestoring,
    subscribe,
    restorePurchases,
    cancel,
  } = useProSubscription();

  useEffect(() => {
    if (presented.current || isPro) return;
    presented.current = true;
    void (async () => {
      const purchased = await subscribe();
      if (purchased) return;
      if (router.canGoBack()) {
        router.back();
        return;
      }
      router.replace(href.app.tabs as never);
    })();
  }, [isPro, router, subscribe]);

  if (!isPro) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#2B7FFF" />
      </View>
    );
  }

  return (
    <StronProScreenContent
      subscription={subscription}
      features={features}
      isPro={isPro}
      offeringsPrices={offeringsPrices}
      isLoading={isLoading}
      isSubmitting={isSubmitting}
      isRestoring={isRestoring}
      onSubscribe={subscribe}
      onRestore={restorePurchases}
      onCancel={cancel}
      onBack={() => router.back()}
    />
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: "#040C1A",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default StronProScreen;
