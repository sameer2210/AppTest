import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenImageBackground, GlassBackButton } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { images } from "@/utils/images";
import ConfirmationModal from "@/components/confirmation/ConfirmationModal";
import { getProfileImageSource } from "@/utils/profileImage.utils";
import { fontTextStyles } from "@/utils/typography";
import { SCREEN_HORIZONTAL_PADDING } from "@/utils/screen-layout";
import type { MemberValidityItem } from "@/types/gym/member.types";
import { MemberContactModal } from "./MemberContactModal";

const GRADIENT_COLORS = [
  "rgba(18, 128, 255, 0.65)",
  "rgba(8, 55, 140, 0.35)",
  "rgba(4, 12, 26, 0.85)",
  "#04060A",
] as const;
const GRADIENT_LOCATIONS = [0, 0.28, 0.62, 1] as const;

const getOrdinal = (n: number): string => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

interface ActiveCustomersScreenContentProps {
  members: MemberValidityItem[];
  isLoading: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  onDeleteMember: (memberId: string) => void;
  onBack: () => void;
}

export const ActiveCustomersScreenContent: React.FC<ActiveCustomersScreenContentProps> = React.memo(
  ({
    members,
    isLoading,
    isRefreshing = false,
    onRefresh,
    onDeleteMember,
    onBack,
  }) => {
    const insets = useSafeAreaInsets();
    const topInset = Math.max(insets.top, StatusBar.currentHeight ?? 0);

    const [searchQuery, setSearchQuery] = useState("");
    const [contactSheetVisible, setContactSheetVisible] = useState(false);
    const [selectedMember, setSelectedMember] = useState<MemberValidityItem | null>(null);

    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [memberToDelete, setMemberToDelete] = useState<MemberValidityItem | null>(null);

    const filteredMembers = useMemo(() => {
      const query = searchQuery.trim().toLowerCase();
      if (!query) return members;
      return members.filter((member) => {
        const nameMatch = member.name?.toLowerCase().includes(query);
        const phoneMatch = member.phone?.toLowerCase().includes(query);
        const emailMatch = member.email?.toLowerCase().includes(query);
        return Boolean(nameMatch || phoneMatch || emailMatch);
      });
    }, [members, searchQuery]);

    const handleContactPress = useCallback((member: MemberValidityItem) => {
      setSelectedMember(member);
      setContactSheetVisible(true);
    }, []);

    const handleDeletePress = useCallback((member: MemberValidityItem) => {
      setMemberToDelete(member);
      setDeleteModalVisible(true);
    }, []);

    const handleConfirmDelete = useCallback(() => {
      if (memberToDelete?.id) {
        onDeleteMember(memberToDelete.id);
      }
      setDeleteModalVisible(false);
      setMemberToDelete(null);
    }, [memberToDelete, onDeleteMember]);

    const handleCloseContactModal = useCallback(() => {
      setContactSheetVisible(false);
      setSelectedMember(null);
    }, []);

    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

        {/* Screen Background Image */}
        <ScreenImageBackground source={images.HOME_V2.BG} flipY={false} edgeToEdge={true} />

        {/* Full-screen Linear Gradient */}
        <LinearGradient
          colors={GRADIENT_COLORS}
          locations={GRADIENT_LOCATIONS}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />

        {/* Content wrapper */}
        <View style={styles.safeContent}>
          {/* Header Row: GlassBackButton + Right-aligned Header Title */}
          <View style={[styles.header, { paddingTop: topInset + 8 }]}>
            <GlassBackButton onPress={onBack} size={48} iconSize={24} />

            <View style={styles.headerRight}>
              <CustomText style={styles.headerTitle}>Active Customers</CustomText>
            </View>
          </View>

          {/* Search Bar */}
          <View style={styles.searchBarWrapper}>
            <View style={styles.searchBarContainer}>
              <Ionicons
                name="search"
                size={20}
                color="rgba(255,255,255,0.7)"
                style={styles.searchIcon}
              />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search your Members"
                placeholderTextColor="rgba(255,255,255,0.6)"
                style={styles.searchInput}
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setSearchQuery("")}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.6)" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Customer Items List */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              onRefresh ? (
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={onRefresh}
                  tintColor="#FFFFFF"
                  colors={["#086CFF"]}
                />
              ) : undefined
            }
          >
            {isLoading ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="small" color="#FFFFFF" />
              </View>
            ) : filteredMembers.length === 0 ? (
              <View style={styles.centerContainer}>
                <Ionicons name="people-outline" size={44} color="rgba(255,255,255,0.3)" />
                <CustomText style={styles.emptyText}>
                  {searchQuery ? "No members match your search" : "No active customers found"}
                </CustomText>
              </View>
            ) : (
              filteredMembers.map((member) => {
                const purchaseNum = member.purchaseCount && member.purchaseCount > 0 ? member.purchaseCount : 1;
                const purchaseText = `${getOrdinal(purchaseNum)} purchase`;

                return (
                  <View key={member.id} style={styles.customerRow}>
                    {/* Left: Avatar + Details */}
                    <View style={styles.customerLeft}>
                      <View style={styles.avatarContainer}>
                        <Image
                          source={getProfileImageSource(
                            member.profileImage,
                            member.id || member.name,
                          )}
                          style={styles.avatarImage}
                          resizeMode="cover"
                        />
                      </View>

                      <View style={styles.customerInfo}>
                        <CustomText style={styles.customerName} numberOfLines={1}>
                          {member.name}
                        </CustomText>
                        <CustomText style={styles.purchaseText}>
                          {purchaseText}
                        </CustomText>
                      </View>
                    </View>

                    {/* Right: Dismiss (X) + Contact */}
                    <View style={styles.customerActions}>
                      {/* Dismiss (X) Button */}
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => handleDeletePress(member)}
                        style={styles.dismissButton}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="close" size={17} color="rgba(255,255,255,0.75)" />
                      </TouchableOpacity>

                      {/* Contact Button */}
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => handleContactPress(member)}
                        style={styles.contactButton}
                      >
                        <CustomText style={styles.contactButtonText}>Contact</CustomText>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>

        {/* Member Contact Info Bottom Sheet Modal */}
        <MemberContactModal
          visible={contactSheetVisible}
          onClose={handleCloseContactModal}
          member={selectedMember}
        />

        {/* Confirmation Modal for Removing Customer */}
        <ConfirmationModal
          visible={deleteModalVisible}
          title="Remove Customer"
          message={`Are you sure you want to remove ${memberToDelete?.name || "this customer"}?`}
          cancelText="Cancel"
          confirmText="Remove"
          onCancel={() => {
            setDeleteModalVisible(false);
            setMemberToDelete(null);
          }}
          onConfirm={handleConfirmDelete}
        />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#04060A",
  },
  safeContent: {
    flex: 1,
  },
  header: {
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontFamily: "SpaceGrotesk-Bold",
    fontSize: 28,
    lineHeight: 38,
    paddingBottom: 4,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  searchBarWrapper: {
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
    marginBottom: 16,
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 50,
    paddingHorizontal: 16,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    ...fontTextStyles.bodyMedium,
    fontSize: 15,
    color: "#FFFFFF",
    paddingVertical: 0,
  },
  scrollContent: {
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
    paddingBottom: 40,
  },
  centerContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    ...fontTextStyles.bodyMedium,
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.5)",
    textAlign: "center",
  },
  customerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  customerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  customerInfo: {
    flex: 1,
    justifyContent: "center",
  },
  customerName: {
    ...fontTextStyles.bodyLarge,
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 3,
  },
  purchaseText: {
    ...fontTextStyles.bodySmall,
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.65)",
  },
  customerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dismissButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  contactButton: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  contactButtonText: {
    ...fontTextStyles.bodySmall,
    fontSize: 13,
    fontWeight: "600",
    color: "#000000",
  },
});

export default ActiveCustomersScreenContent;
