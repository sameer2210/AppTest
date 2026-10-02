import React, { useState, useEffect } from "react";
import { fontTextStyles } from "@/utils/typography";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomText from "@/components/CustomText";
import type { Coupon, UpdateCouponInput } from "@/types/gym/coupon.types";
import { CouponFormField } from "./CouponFormField";
import { useAppDispatch } from "@/store/hooks";
import { updateCouponThunk } from "@/features/gymBusiness";
import { showToastMessage } from "@/utils/app-utils";

interface EditCouponModalProps {
  visible: boolean;
  coupon: Coupon | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditCouponModal: React.FC<EditCouponModalProps> = ({
  visible,
  coupon,
  onClose,
  onSuccess,
}) => {
  const dispatch = useAppDispatch();
  const isPercentage = coupon?.type === "PERCENTAGE";

  const [discountPercentage, setDiscountPercentage] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  const [minimumOrderValue, setMinimumOrderValue] = useState("");
  const [maximumDiscount, setMaximumDiscount] = useState("");
  const [totalCoupons, setTotalCoupons] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (coupon) {
      setDiscountPercentage(coupon.discountPercentage ? String(coupon.discountPercentage) : "");
      setDiscountAmount(coupon.discountAmount ? String(coupon.discountAmount) : "");
      setMinimumOrderValue(coupon.minimumOrderValue ? String(coupon.minimumOrderValue) : "");
      setMaximumDiscount(coupon.maximumDiscount ? String(coupon.maximumDiscount) : "");
      setTotalCoupons(coupon.totalCoupons ? String(coupon.totalCoupons) : "");
    }
  }, [coupon]);

  if (!coupon) return null;

  const handleSave = async () => {
    if (!coupon?._id && !coupon?.id) return;
    const couponId = (coupon._id || coupon.id)!;

    setIsSubmitting(true);
    try {
      const updatePayload: UpdateCouponInput = {
        discountPercentage:
          isPercentage && discountPercentage ? Number(discountPercentage) : undefined,
        discountAmount: !isPercentage && discountAmount ? Number(discountAmount) : undefined,
        minimumOrderValue: minimumOrderValue ? Number(minimumOrderValue) : 0,
        maximumDiscount: maximumDiscount ? Number(maximumDiscount) : undefined,
        totalCoupons: totalCoupons ? Number(totalCoupons) : undefined,
      };

      const res = await dispatch(
        updateCouponThunk({ couponId, updateData: updatePayload }),
      ).unwrap();
      if (res.success) {
        showToastMessage("Coupon updated successfully!");
        onSuccess();
        onClose();
      } else {
        showToastMessage(res.message || "Failed to update coupon.");
      }
    } catch {
      showToastMessage("Error saving coupon.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.modalBackdrop}
      >
        <View style={styles.sheetContainer}>
          {/* Modal Header */}
          <View style={styles.headerRow}>
            <View>
              <CustomText style={styles.headerTitle}>Edit Coupon: {coupon.code}</CustomText>
              <CustomText style={styles.headerSubtitle}>Update limits and discount parameters</CustomText>
            </View>
            <TouchableOpacity activeOpacity={0.7} onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {isPercentage ? (
              <>
                <CouponFormField
                  label="Discount Percentage"
                  placeholder="e.g. 20"
                  value={discountPercentage}
                  onChangeText={setDiscountPercentage}
                  keyboardType="numeric"
                  suffix="%"
                />
                <CouponFormField
                  label="Maximum Discount Cap (₹)"
                  placeholder="e.g. 500"
                  value={maximumDiscount}
                  onChangeText={setMaximumDiscount}
                  keyboardType="numeric"
                  prefix="₹"
                />
              </>
            ) : (
              <CouponFormField
                label="Discount Amount (₹)"
                placeholder="e.g. 200"
                value={discountAmount}
                onChangeText={setDiscountAmount}
                keyboardType="numeric"
                prefix="₹"
              />
            )}

            <CouponFormField
              label="Minimum Order Value (₹)"
              placeholder="e.g. 400"
              value={minimumOrderValue}
              onChangeText={setMinimumOrderValue}
              keyboardType="numeric"
              prefix="₹"
            />

            <CouponFormField
              label="Total Coupons Limit"
              placeholder="e.g. 50 (Leave blank for unlimited)"
              value={totalCoupons}
              onChangeText={setTotalCoupons}
              keyboardType="numeric"
            />

            {/* Action Buttons */}
            <View style={styles.actionsRow}>
              <TouchableOpacity activeOpacity={0.7} onPress={onClose} style={styles.cancelButton}>
                <CustomText style={styles.cancelButtonText}>Cancel</CustomText>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleSave}
                disabled={isSubmitting}
                style={styles.saveButton}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <CustomText style={styles.saveButtonText}>Save Changes</CustomText>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  sheetContainer: {
    backgroundColor: "#18191E",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: "85%",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
    marginBottom: 16,
  },
  headerTitle: {
    ...fontTextStyles.twentyFourBoldBlack,
    color: "#FFFFFF",
  },
  headerSubtitle: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "rgba(255, 255, 255, 0.5)",
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 16,
    marginBottom: 8,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "rgba(255, 255, 255, 0.8)",
  },
  saveButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#086CFF",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  saveButtonText: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "#FFFFFF",
  },
});

export default EditCouponModal;
