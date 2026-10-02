import React, { useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassBackButton, ScreenImageBackground } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { images } from "@/utils/images";
import { fontTextStyles } from "@/utils/typography";
import { screenContentContainerWideStyle, SCREEN_HORIZONTAL_PADDING_WIDE } from "@/utils/screen-layout";
import ConfirmationModal from "@/components/confirmation/ConfirmationModal";

import type { Coupon } from "@/types/gym/coupon.types";
import { CouponCardItem } from "./CouponCardItem";
import { EditCouponModal } from "./EditCouponModal";

const GRADIENT_COLORS = [
  "rgba(18, 128, 255, 0.65)",
  "rgba(8, 55, 140, 0.35)",
  "rgba(4, 12, 26, 0.85)",
  "#04060A",
] as const;
const GRADIENT_LOCATIONS = [0, 0.28, 0.62, 1] as const;

interface CouponsHubScreenContentProps {
  coupons: Coupon[];
  isLoading: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  onDeleteCoupon: (id: string, code?: string) => void;
  onCreateCouponPress: () => void;
  onBack: () => void;
}

export const CouponsHubScreenContent: React.FC<CouponsHubScreenContentProps> = ({
  coupons,
  isLoading,
  isRefreshing,
  onRefresh,
  onDeleteCoupon,
  onCreateCouponPress,
  onBack,
}) => {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, StatusBar.currentHeight ?? 0);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

  // Delete Coupon Confirmation Modal state
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [couponToDelete, setCouponToDelete] = useState<{ id: string; code: string } | null>(null);

  const handleDeletePress = (id: string, code?: string) => {
    setCouponToDelete({ id, code: code || "this coupon" });
    setDeleteModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Screen Background Image */}
      <ScreenImageBackground source={images.HOME_V2.BG} flipY={false} edgeToEdge={true} />

      {/* Full-screen Linear Gradient matching Business Home */}
      <LinearGradient
        colors={GRADIENT_COLORS}
        locations={GRADIENT_LOCATIONS}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      {/* Header Row: Circular Back Button & Title */}
      <View style={[styles.header, { paddingTop: topInset + 8 }]}>
        <GlassBackButton onPress={onBack} size={48} iconSize={24} />

        <CustomText style={styles.headerTitle}>Coupons</CustomText>
      </View>

      {/* Main Content Area */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#086CFF"
            colors={["#086CFF"]}
          />
        }
      >
        {/* 1. Add New Coupon Hero Card */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onCreateCouponPress}
          style={styles.addCouponCard}
        >
          <View style={styles.addIconCircle}>
            <Ionicons name="add" size={28} color="#000000" />
          </View>
          <CustomText style={styles.addCouponText}>Add New Coupon</CustomText>
        </TouchableOpacity>

        {/* 2. Real Live Coupons List */}
        {isLoading && !isRefreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#086CFF" />
          </View>
        ) : coupons.length === 0 ? (
          <View style={styles.emptyContainer}>
            <CustomText style={styles.emptyText}>
              No active coupons yet. Tap above to create one!
            </CustomText>
          </View>
        ) : (
          coupons.map((coupon) => (
            <CouponCardItem
              key={coupon._id || coupon.id || coupon.code}
              coupon={coupon}
              onDelete={(id, code) => handleDeletePress(id, code)}
              onEdit={(c) => setEditingCoupon(c)}
            />
          ))
        )}
      </ScrollView>

      {/* Edit Coupon Modal */}
      <EditCouponModal
        visible={editingCoupon !== null}
        coupon={editingCoupon}
        onClose={() => setEditingCoupon(null)}
        onSuccess={() => {
          onRefresh();
        }}
      />

      {/* Delete Coupon Confirmation Modal */}
      <ConfirmationModal
        visible={deleteModalVisible}
        title={`You're about to delete coupon "${couponToDelete?.code || ""}". Continue?`}
        message="This coupon will be deactivated and removed."
        titleColor="#FF5454"
        cancelText="No"
        confirmText="Yes, Delete"
        onCancel={() => {
          setDeleteModalVisible(false);
          setCouponToDelete(null);
        }}
        onConfirm={() => {
          if (couponToDelete) {
            onDeleteCoupon(couponToDelete.id, couponToDelete.code);
          }
          setDeleteModalVisible(false);
          setCouponToDelete(null);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#04060A",
  },
  header: {
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING_WIDE,
    paddingBottom: 20,
    paddingTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontFamily: "SpaceGrotesk-Bold",
    fontSize: 32,
    lineHeight: 44,
    paddingBottom: 6,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: screenContentContainerWideStyle,
  addCouponCard: {
    backgroundColor: "#18191E",
    borderRadius: 24,
    paddingVertical: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    elevation: 3,
  },
  addIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    elevation: 2,
  },
  addCouponText: {
    ...fontTextStyles.bodyMedium,
    fontSize: 15,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  loadingContainer: {
    paddingVertical: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    ...fontTextStyles.bodySmall,
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.4)",
    textAlign: "center",
  },
});

export default CouponsHubScreenContent;
