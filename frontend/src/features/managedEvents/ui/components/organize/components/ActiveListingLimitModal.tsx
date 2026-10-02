import React from "react";
import { View, StyleSheet, Modal, Pressable, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { useProSubscription } from "@/features/gymBusiness";

type Props = {
  visible: boolean;
  onClose: () => void;
  onGoToLive?: () => void;
  onUpgradeSuccess?: () => void;
};

const ActiveListingLimitModal = ({ visible, onClose, onGoToLive, onUpgradeSuccess }: Props) => {
  const { isTrialEligible, isSubmitting, offeringsPrices, startFreeTrial, subscribe } =
    useProSubscription();

  const handleUpgradePress = async () => {
    const ok = isTrialEligible ? await startFreeTrial() : await subscribe();
    if (ok) {
      onClose();
      if (onUpgradeSuccess) onUpgradeSuccess();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <LinearGradient
            colors={["#0C255A", "#061536", "#020A1C"]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={styles.cardInner}
          >
            {/* Top Close Icon */}
            <PressableScale
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={20} color="rgba(255,255,255,0.7)" />
            </PressableScale>

            {/* Header Icon + Title */}
            <View style={styles.headerBlock}>
              <LinearGradient colors={["#3573FA", "#1B47A4"]} style={styles.iconCircle}>
                <Ionicons name="shield-checkmark" size={28} color="#FFFFFF" />
              </LinearGradient>

              <CustomText style={styles.title}>
                Upgrade to STRON PRO
              </CustomText>
              <CustomText style={styles.subtitle}>
                You have reached your 1 active listing limit. Upgrade to publish unlimited listings
                and boost your reach!
              </CustomText>
            </View>

            {/* Benefits Card */}
            <View style={styles.perksCard}>
              <View style={styles.perksList}>
                <View style={styles.perkRow}>
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color="#4DA6FF"
                    style={styles.checkIcon}
                  />
                  <CustomText style={styles.perkText}>
                    Unlimited active listings & events
                  </CustomText>
                </View>
                <View style={styles.perkRow}>
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color="#4DA6FF"
                    style={styles.checkIcon}
                  />
                  <CustomText style={styles.perkText}>
                    Automated ticket check-in & analytics
                  </CustomText>
                </View>
                <View style={styles.perkRow}>
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color="#4DA6FF"
                    style={styles.checkIcon}
                  />
                  <CustomText style={styles.perkText}>
                    Top search placement & priority support
                  </CustomText>
                </View>
              </View>
            </View>

            {/* Price Tag */}
            <View style={styles.priceRow}>
              <CustomText style={styles.priceText}>
                {offeringsPrices?.amount || (isTrialEligible ? "₹0" : "₹999")}
              </CustomText>
              <CustomText style={styles.pricePeriod}>
                {offeringsPrices?.period ||
                  (isTrialEligible ? "for 14 days, then ₹999/mo" : "/month")}
              </CustomText>
            </View>

            <PressableScale
              onPress={handleUpgradePress}
              disabled={isSubmitting}
              style={styles.ctaButton}
              accessibilityRole="button"
              accessibilityLabel={
                offeringsPrices?.cta ||
                (isTrialEligible ? "Claim 14-day free trial" : "Upgrade to PRO")
              }
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <CustomText style={styles.ctaText}>
                  {offeringsPrices?.cta ||
                    (isTrialEligible ? "Claim 14-day free trial" : "Upgrade to PRO")}
                </CustomText>
              )}
            </PressableScale>

            {onGoToLive ? (
              <PressableScale onPress={onGoToLive} style={styles.secondaryButton}>
                <CustomText style={styles.secondaryText}>
                  View Active Live Listing
                </CustomText>
              </PressableScale>
            ) : null}
          </LinearGradient>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default ActiveListingLimitModal;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  cardInner: {
    padding: 20,
    alignItems: "center",
  },
  closeBtn: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  perksCard: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  ctaButton: {
    width: "100%",
    height: 48,
    borderRadius: 999,
    backgroundColor: "#1877F2",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  secondaryButton: {
    marginTop: 12,
    paddingVertical: 6,
  },
  headerBlock: {
    alignItems: "center",
    marginBottom: 16,
    paddingTop: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    marginTop: 12,
  },
  subtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: 8,
  },
  perksList: {
    gap: 8,
  },
  perkRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkIcon: {
    marginRight: 8,
  },
  perkText: {
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.9)",
    flex: 1,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    marginVertical: 12,
  },
  priceText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  pricePeriod: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.7)",
    marginLeft: 6,
  },
  ctaText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  secondaryText: {
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.6)",
  },
});
