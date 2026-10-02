import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  Linking,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenImageBackground, GlassBackButton } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { images } from "@/utils/images";
import ConfirmationModal from "@/components/confirmation/ConfirmationModal";
import { getProfileImageSource } from "@/utils/profileImage.utils";
import { useAppSelector } from "@/store/hooks";
import { selectGymProfile, generateMemberWhatsAppText } from "@/features/gymBusiness";
import { showToastMessage } from "@/utils/app-utils";
import { screenContentContainerStyle, SCREEN_HORIZONTAL_PADDING } from "@/utils/screen-layout";
import { fontTextStyles, headingTextStyles } from "@/utils/typography";
import type {
  MemberValidityItem,
  MemberValidityCounters,
  MemberValidityFilterType,
} from "@/types/gym/member.types";
import { MemberContactModal } from "./MemberContactModal";

const GRADIENT_COLORS = [
  "rgba(18, 128, 255, 0.65)",
  "rgba(8, 55, 140, 0.35)",
  "rgba(4, 12, 26, 0.85)",
  "#04060A",
] as const;
const GRADIENT_LOCATIONS = [0, 0.28, 0.62, 1] as const;

interface MemberValidityScreenContentProps {
  members: MemberValidityItem[];
  counters: MemberValidityCounters;
  initialFilter?: MemberValidityFilterType;
  isLoading: boolean;
  onDeleteMember: (memberId: string) => void;
  onBack: () => void;
}

export const MemberValidityScreenContent: React.FC<MemberValidityScreenContentProps> = ({
  members,
  counters,
  initialFilter = "ALL",
  isLoading,
  onDeleteMember,
  onBack,
}) => {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, StatusBar.currentHeight ?? 0);
  const gymProfile = useAppSelector(selectGymProfile);
  const gymName = (gymProfile as any)?.businessName || (gymProfile as any)?.name || "our business";
  const smartQrLink = (gymProfile as any)?.slug
    ? `https://stron.fit/business/${(gymProfile as any).slug}`
    : "https://stron.fit/join";

  const [selectedFilter, setSelectedFilter] = useState<MemberValidityFilterType>(initialFilter);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (initialFilter) {
      setSelectedFilter(initialFilter);
    }
  }, [initialFilter]);

  // Contact Sheet state
  const [contactSheetVisible, setContactSheetVisible] = useState(false);
  const [selectedContactMember, setSelectedContactMember] = useState<{
    name: string;
    phone?: string | null;
    email?: string | null;
    category?: "NEW_LEADS" | "EXPIRED" | "ABOUT_TO_EXPIRE" | "MORE_THAN_WEEK";
    daysCount?: number;
    subheadingText?: string;
    whatsappText?: string;
    autoRenew?: boolean;
  } | null>(null);

  // Delete Member Modal state
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<MemberValidityItem | null>(null);

  const computedCounters = useMemo(() => {
    return {
      newLeadsCount: members.filter((m) => (m.category || "").toUpperCase() === "NEW_LEADS").length,
      expiredCount: members.filter((m) => (m.category || "").toUpperCase() === "EXPIRED").length,
      aboutToExpireCount: members.filter(
        (m) => (m.category || "").toUpperCase() === "ABOUT_TO_EXPIRE",
      ).length,
      moreThanWeekCount: members.filter(
        (m) => (m.category || "").toUpperCase() === "MORE_THAN_WEEK",
      ).length,
    };
  }, [members]);

  const activeCounters = {
    newLeadsCount: counters.newLeadsCount || computedCounters.newLeadsCount,
    expiredCount: counters.expiredCount || computedCounters.expiredCount,
    aboutToExpireCount: counters.aboutToExpireCount || computedCounters.aboutToExpireCount,
    moreThanWeekCount: counters.moreThanWeekCount || computedCounters.moreThanWeekCount,
  };

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      // 1. Filter category
      if (
        selectedFilter !== "ALL" &&
        (member.category || "").toUpperCase() !== selectedFilter.toUpperCase()
      ) {
        return false;
      }
      // 2. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (member.name || "").toLowerCase().includes(q);
        const matchesPhone = member.phone ? member.phone.includes(q) : false;
        return matchesName || matchesPhone;
      }
      return true;
    });
  }, [members, selectedFilter, searchQuery]);

  const handleContactPress = (member: MemberValidityItem) => {
    const defaultMsg = generateMemberWhatsAppText({
      category: member.category,
      days: member.daysCount || 1,
      gymName,
      smartQrLink,
    });
    setSelectedContactMember({
      name: member.name,
      phone: member.phone,
      email: member.email,
      category: member.category,
      daysCount: member.daysCount,
      subheadingText: member.subheadingText,
      whatsappText: member.whatsappText || defaultMsg,
      autoRenew: member.autoRenew,
    });
    setContactSheetVisible(true);
  };

  const handleDirectWhatsApp = (member: MemberValidityItem) => {
    const rawPhone = (member.phone || "").replace(/[^\d+]/g, "");
    if (!rawPhone) {
      showToastMessage("No phone number available for this member");
      return;
    }
    const msg =
      member.whatsappText ||
      generateMemberWhatsAppText({
        category: member.category,
        days: member.daysCount || 1,
        gymName,
        smartQrLink,
      });
    const cleanDigits = rawPhone.replace(/\+/g, "");
    Linking.openURL(`https://wa.me/${cleanDigits}?text=${encodeURIComponent(msg)}`).catch(() => {
      showToastMessage("Could not open WhatsApp");
    });
  };

  const handleDeletePress = (member: MemberValidityItem) => {
    setMemberToDelete(member);
    setDeleteModalVisible(true);
  };

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

      {/* Header and Content Wrapper */}
      <View style={styles.safeContent}>
        {/* Header Row: GlassBackButton + Right-aligned Header Title */}
        <View style={[styles.headerContainer, { paddingTop: topInset + 8 }]}>
          <GlassBackButton onPress={onBack} size={48} iconSize={24} />

          <CustomText style={styles.headerTitleText}>
            Members Validity
          </CustomText>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Search Bar */}
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

          {/* 4-Tile Filter Grid with Exact Card Dimensions */}
          <View style={styles.tileGridRow}>
            {/* Tile 1: New Leads */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() =>
                setSelectedFilter(selectedFilter === "NEW_LEADS" ? "ALL" : "NEW_LEADS")
              }
              style={[
                styles.gridTile,
                selectedFilter === "NEW_LEADS" ? styles.gridTileActive : styles.gridTileInactive,
              ]}
            >
              <View style={styles.tileIconRow}>
                <Ionicons name="person-add" size={15} color="#4E92FF" />
                <Ionicons name="chevron-forward" size={11} color="rgba(255,255,255,0.35)" />
              </View>
              <CustomText
                style={styles.tileCountText}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {activeCounters.newLeadsCount}
              </CustomText>
              <View style={styles.tileLabelWrapper}>
                <CustomText
                  style={styles.tileLabelText}
                  numberOfLines={2}
                >
                  New Leads{"\n"}(New to Old)
                </CustomText>
              </View>
            </TouchableOpacity>

            {/* Tile 2: Expired */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setSelectedFilter(selectedFilter === "EXPIRED" ? "ALL" : "EXPIRED")}
              style={[
                styles.gridTile,
                selectedFilter === "EXPIRED" ? styles.gridTileActive : styles.gridTileInactive,
              ]}
            >
              <View style={styles.tileIconRow}>
                <Ionicons name="close-circle" size={15} color="#FF5252" />
                <Ionicons name="chevron-forward" size={11} color="rgba(255,255,255,0.35)" />
              </View>
              <CustomText
                style={styles.tileCountText}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {activeCounters.expiredCount}
              </CustomText>
              <View style={styles.tileLabelWrapper}>
                <CustomText
                  style={styles.tileLabelText}
                  numberOfLines={2}
                >
                  Expired{"\n"}(New to Old)
                </CustomText>
              </View>
            </TouchableOpacity>

            {/* Tile 3: About to Expire */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() =>
                setSelectedFilter(selectedFilter === "ABOUT_TO_EXPIRE" ? "ALL" : "ABOUT_TO_EXPIRE")
              }
              style={[
                styles.gridTile,
                selectedFilter === "ABOUT_TO_EXPIRE"
                  ? styles.gridTileActive
                  : styles.gridTileInactive,
              ]}
            >
              <View style={styles.tileIconRow}>
                <Ionicons name="warning" size={15} color="#FFB800" />
                <Ionicons name="chevron-forward" size={11} color="rgba(255,255,255,0.35)" />
              </View>
              <CustomText
                style={styles.tileCountText}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {activeCounters.aboutToExpireCount}
              </CustomText>
              <View style={styles.tileLabelWrapper}>
                <CustomText
                  style={styles.tileLabelText}
                  numberOfLines={2}
                >
                  About to{"\n"}Expire
                </CustomText>
              </View>
            </TouchableOpacity>

            {/* Tile 4: More than a week left */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() =>
                setSelectedFilter(selectedFilter === "MORE_THAN_WEEK" ? "ALL" : "MORE_THAN_WEEK")
              }
              style={[
                styles.gridTile,
                selectedFilter === "MORE_THAN_WEEK"
                  ? styles.gridTileActive
                  : styles.gridTileInactive,
              ]}
            >
              <View style={styles.tileIconRow}>
                <Ionicons name="shield-checkmark" size={15} color="#61DC60" />
                <Ionicons name="chevron-forward" size={11} color="rgba(255,255,255,0.35)" />
              </View>
              <CustomText
                style={styles.tileCountText}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {activeCounters.moreThanWeekCount}
              </CustomText>
              <View style={styles.tileLabelWrapper}>
                <CustomText
                  style={styles.tileLabelText}
                  numberOfLines={2}
                >
                  More than a{"\n"}week left
                </CustomText>
              </View>
            </TouchableOpacity>
          </View>

          {/* Member Items List */}
          {isLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="small" color="#086CFF" />
            </View>
          ) : filteredMembers.length === 0 ? (
            <View style={styles.centerContainer}>
              <Ionicons name="people-outline" size={40} color="rgba(255,255,255,0.3)" />
              <CustomText style={styles.emptyText}>No members found for this filter</CustomText>
            </View>
          ) : (
            filteredMembers.map((member) => {
              const isLeads = member.category === "NEW_LEADS";
              const isExpired = member.category === "EXPIRED" || member.isExpired;
              const isAboutToExpire = member.category === "ABOUT_TO_EXPIRE";

              const subheadingColor = isLeads
                ? "#4E92FF"
                : isExpired
                  ? "#FF5252"
                  : isAboutToExpire
                    ? "#FFB800"
                    : "#61DC60";

              return (
                <View key={member.id} style={styles.memberRow}>
                  {/* Left: Avatar + Name + Subheading */}
                  <View style={styles.memberLeft}>
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

                    <View style={styles.memberInfo}>
                      <CustomText style={styles.memberName} numberOfLines={1}>
                        {member.name}
                      </CustomText>
                      <CustomText style={[styles.memberValidityText, { color: subheadingColor }]}>
                        {member.subheadingText || member.validityText}
                      </CustomText>
                      {!isLeads ? (
                        <CustomText style={styles.autoRenewText}>
                          Auto-renew: {member.autoRenew ? "On" : "Off"}
                        </CustomText>
                      ) : null}
                    </View>
                  </View>

                  {/* Right: Direct WhatsApp CTA + Contact + Dismiss */}
                  <View style={styles.memberActions}>
                    {/* WhatsApp Direct Action Button */}
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => handleDirectWhatsApp(member)}
                      style={styles.whatsappButton}
                    >
                      <FontAwesome5
                        name="whatsapp"
                        size={13}
                        color="#FFFFFF"
                        style={{ marginRight: 5 }}
                      />
                      <CustomText style={styles.whatsappButtonText}>WhatsApp</CustomText>
                    </TouchableOpacity>

                    {/* Contact Modal button */}
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => handleContactPress(member)}
                      style={styles.contactButton}
                    >
                      <CustomText style={styles.contactButtonText}>Contact</CustomText>
                    </TouchableOpacity>

                    {/* Dismiss button */}
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => handleDeletePress(member)}
                      style={styles.dismissButton}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Ionicons name="close" size={16} color="rgba(255,255,255,0.7)" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Member Contact Info Bottom Sheet */}
        <MemberContactModal
          visible={contactSheetVisible}
          onClose={() => setContactSheetVisible(false)}
          gymName={gymName}
          member={selectedContactMember}
        />

        {/* Remove Member Confirmation Modal */}
        <ConfirmationModal
          visible={deleteModalVisible}
          title={`You're about to remove ${memberToDelete?.name || "this member"}. Continue?`}
          message="This member will be removed from your active validity records."
          titleColor="#FF5454"
          cancelText="No"
          confirmText="Yes, Remove"
          onCancel={() => {
            setDeleteModalVisible(false);
            setMemberToDelete(null);
          }}
          onConfirm={() => {
            if (memberToDelete) {
              onDeleteMember(memberToDelete.id);
            }
            setDeleteModalVisible(false);
            setMemberToDelete(null);
          }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#04060A",
  },
  safeContent: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitleText: {
    fontFamily: "SpaceGrotesk-Bold",
    fontWeight: "800",
    fontSize: 28,
    lineHeight: 38,
    paddingBottom: 4,
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  backButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    ...headingTextStyles.twentyFourBoldBlack,
    color: "#FFFFFF",
  },
  scrollContent: {
    ...screenContentContainerStyle,
  },
  searchBarContainer: {
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    ...fontTextStyles.sixteenNormalBlack,
    flex: 1,
    color: "#FFFFFF",
  },
  tileGridRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 24,
  },
  gridTile: {
    flex: 1,
    height: 111,
    backgroundColor: "#313131",
    borderRadius: 4,
    padding: 10,
  },
  gridTileActive: {
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  gridTileInactive: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  tileIconRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tileCountText: {
    fontFamily: "SpaceGrotesk-Bold",
    fontWeight: "bold",
    fontSize: 25,
    color: "#FFFFFF",
    lineHeight: 28,
    letterSpacing: -0.5,
    marginTop: 6,
  },
  tileLabelWrapper: {
    marginTop: "auto",
    height: 28,
    justifyContent: "center",
  },
  tileLabelText: {
    fontFamily: "SpaceGrotesk-Regular",
    fontSize: 10,
    color: "#FFFFFF",
    fontWeight: "500",
    lineHeight: 13,
  },
  tileGrid: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 24,
  },
  tile: {
    flex: 1,
    height: 96,
    borderRadius: 6,
    padding: 10,
    justifyContent: "space-between",
    backgroundColor: "#313131",
  },
  tileActive: {
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  tileInactive: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  tileTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tileCount: {
    ...headingTextStyles.twentySixSemiBoldBlack,
    color: "#FFFFFF",
  },
  tileLabel: {
    ...fontTextStyles.tenNormalBlack,
    color: "rgba(214, 214, 214, 0.6)",
    marginTop: 4,
  },
  centerContainer: {
    paddingVertical: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "rgba(255, 255, 255, 0.5)",
    textAlign: "center",
    marginTop: 12,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  memberLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#2A2A2A",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginRight: 12,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    ...fontTextStyles.sixteenSemiBoldBlack,
    color: "#FFFFFF",
  },
  memberValidityText: {
    ...fontTextStyles.twelveNormalBlack,
    color: "rgba(255, 255, 255, 0.75)",
    marginTop: 2,
  },
  autoRenewText: {
    ...fontTextStyles.twelveNormalBlack,
    color: "rgba(255, 255, 255, 0.55)",
    marginTop: 2,
  },
  memberValidityExpired: {
    color: "#FF7F7F",
  },
  memberActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dismissButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#242424",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  whatsappButton: {
    backgroundColor: "#25D366",
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#25D366",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  whatsappButtonText: {
    ...fontTextStyles.twelveBoldBlack,
    color: "#FFFFFF",
  },
  contactButton: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  contactButtonText: {
    ...fontTextStyles.twelveSemiBoldBlack,
    color: "#FFFFFF",
  },
});

export default MemberValidityScreenContent;
