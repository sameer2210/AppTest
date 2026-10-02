export type BusinessPlanUserRole =
  "guest" | "unauthenticated" | "user" | "owner_free" | "owner_pro";

export type DayOfWeek =
  "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";

export interface OpeningHourItem {
  day: DayOfWeek;
  isAvailable: boolean;
  openTime: string | null;
  closeTime: string | null;
}

export interface BusinessProfileEntity {
  _id?: string;
  id?: string;
  ownerId?: string;
  businessName: string;
  logo?: string | null;
  location?: string | null;
  mapLink?: string | null;
  phone?: string | null;
  services: string[];
  openingHours: OpeningHourItem[];
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateBusinessProfileInput {
  businessName?: string;
  logo?: string | null;
  location?: string | null;
  mapLink?: string | null;
  phone?: string | null;
  services?: string[];
  openingHours?: OpeningHourItem[];
}

export interface GymBusinessProfile {
  id?: string;
  name: string;
  businessName?: string;
  address: string;
  location?: string;
  city?: string;
  phone?: string | null;
  phoneVerified?: boolean;
  email?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  tags: string[];
  services?: string[];
  mapLink?: string | null;
  operatingHours: {
    morning?: string;
    evening?: string;
    todayStatus?: string;
    weeklyHours?: OpeningHourItem[];
  };
  openingHours?: OpeningHourItem[];
  isVerified: boolean;
  verificationProgress: number; // 0 to 100
  payoutVerificationStatus?: "VERIFIED" | "FAILED" | "PENDING" | string | null;
  payoutSlaText: string;
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
}

export interface EarningsSummary {
  monthlyRevenue: number;
  formattedRevenue: string;
  weeklyRevenue?: number[];
  currentWeekRevenue?: number[];
  monthDailyRevenue?: number[];
  quarterlyRevenue?: number[];
  yearlyRevenue?: number;
  platformFeePercent: number; // 5% platform fee
  savedAmount: number;
  formattedSavedAmount: string;
  isPro: boolean;
  proRenewsOn?: string;
  proFeaturesSummary: string;
}

export interface MemberValidityMetrics {
  totalMembers: number;
  newLeads: number;
  expired: number;
  aboutToExpire: number;
  moreThanWeekLeft: number;
  hasPlans?: boolean;
  activePlansCount?: number;
}

export interface ListingCustomerMetrics {
  totalCustomers: number;
  activeCustomers: number;
  activeListing: number;
  totalListings?: number;
  conversionRate: number; // e.g. 20 (%)
  repeatUserRate: number; // e.g. 60 (%)
  activeEventKey?: string;
}

export interface CouponSummary {
  activeCount: number;
}

export interface BusinessAnalyticsTile {
  key: "earnings" | "paying_users" | "peak_hours" | "attendance";
  title: string;
  route?: string;
}

export interface BusinessFaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface PayoutAccountSummary {
  isConfigured: boolean;
  bankName?: string | null;
  maskedAccountNumber?: string | null;
  verificationStatus?: "VERIFIED" | "PENDING" | "REJECTED" | "NOT_CONFIGURED";
}

export interface BusinessPlanData {
  role: BusinessPlanUserRole;
  isGymOwner: boolean;
  hasPro: boolean;
  earnings: EarningsSummary;
  gymProfile: GymBusinessProfile;
  payoutAccount?: PayoutAccountSummary;
  memberValidity: MemberValidityMetrics;
  listingCustomers: ListingCustomerMetrics;
  coupons: CouponSummary;
  faqs?: BusinessFaqItem[];
}

export interface BusinessPlanScreenProps {
  data?: BusinessPlanData;
  renewalDateText?: string | number | Date | null;
  isLoading?: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  onEditProfile?: () => void;
  onShareProfile?: () => void;
  onProBannerPress?: () => void;
  onListingsPress?: () => void;
  onManualPaymentsPress?: () => void;
  onPlansPress?: () => void;
  onAddPlanPress?: () => void;
  onAddListingPress?: () => void;
  onMemberValidityPress?: (filterType?: string) => void;
  onListingCustomersPress?: (filterType?: string) => void;
  onManageCouponsPress?: () => void;
  onAnalyticsPress?: (metric: "earnings" | "paying_users" | "peak_hours" | "attendance") => void;
  onPayoutPress?: () => void;
  onFaqPress?: () => void;
  onRegisterGymPress?: () => void;
  onLoginPress?: () => void;
}
