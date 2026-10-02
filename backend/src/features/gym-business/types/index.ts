import type { Types, WithMongoId } from "../../../types/mongoose.util.js";
import type { Business } from "../models/business.model.js";
import type { Member } from "../models/member.model.js";
import type { MembershipPlan } from "../models/membershipPlan.model.js";
import type { Membership } from "../models/membership.model.js";
import type { Attendance } from "../models/attendance.model.js";
import type { Coupon } from "../models/coupon.model.js";
import type { Payment } from "../models/payment.model.js";
import type { PayoutAccount } from "../models/payoutAccount.model.js";
import type { ProSubscription } from "../models/proSubscription.model.js";
import type { UniversalCheckin } from "../models/universalCheckin.model.js";
import type { BrandPageVisit } from "../models/brandPageVisit.model.js";
import type { StaffMember } from "../models/staffMember.model.js";
import type { WhatsappWallet } from "../models/whatsappWallet.model.js";
import type { WhatsappReminderConfig } from "../models/whatsappReminderConfig.model.js";
import type { WhatsappMessage } from "../models/whatsappMessage.model.js";
import type { WhatsappAccount } from "../models/whatsappAccount.model.js";
import type { WhatsappTemplate } from "../models/whatsappTemplate.model.js";
import type { WhatsappContact } from "../models/whatsappContact.model.js";
import type { WhatsappReminder } from "../models/whatsappReminder.model.js";
import type { WebhookEvent } from "../models/webhookEvent.model.js";

// Canonical Domain Entity Types (Single Source of Truth, derived from Schema)
export type IBusiness = WithMongoId<Business>;
export type IMember = WithMongoId<Member>;
export type IMembershipPlan = WithMongoId<MembershipPlan>;
export type IMembership = WithMongoId<Membership>;
export type IAttendance = WithMongoId<Attendance>;
export type ICoupon = WithMongoId<Coupon>;
export type IPayment = WithMongoId<Payment>;
export type IPayoutAccount = WithMongoId<PayoutAccount>;
export type IProSubscription = WithMongoId<ProSubscription>;
export type IUniversalCheckin = WithMongoId<UniversalCheckin>;
export type IBrandPageVisit = WithMongoId<BrandPageVisit>;
export type IStaffMember = WithMongoId<StaffMember>;
export type IWhatsappWallet = WithMongoId<WhatsappWallet>;
export type IWhatsappReminderConfig = WithMongoId<WhatsappReminderConfig>;
export type IWhatsappMessage = WithMongoId<WhatsappMessage>;
export type IWhatsappAccount = WithMongoId<WhatsappAccount>;
export type IWhatsappTemplate = WithMongoId<WhatsappTemplate>;
export type IWhatsappContact = WithMongoId<WhatsappContact>;
export type IWhatsappReminder = WithMongoId<WhatsappReminder>;
export type IWebhookEvent = WithMongoId<WebhookEvent>;

// Re-export Schema Types directly for model consumers
export type {
  Business,
  Member,
  MembershipPlan,
  Membership,
  Attendance,
  Coupon,
  Payment,
  PayoutAccount,
  ProSubscription,
  UniversalCheckin,
  BrandPageVisit,
  StaffMember,
  WhatsappWallet,
  WhatsappReminderConfig,
  WhatsappMessage,
  WhatsappAccount,
  WhatsappTemplate,
  WhatsappContact,
  WhatsappReminder,
  WebhookEvent,
};

// Domain Status and Enum Unions (Derived directly from Schema fields)
export type VerificationSummary = {
  isVerified: boolean;
  badgeLabel: string;
  progressPercent: number;
  missing: string[];
};

export type WhatsappWalletView = {
  creditsLeft: number;
  memberCount: number;
  hasEntitlement: boolean;
};

export type WhatsappReminderConfigView = {
  type: string;
  isActive: boolean;
  dayOffsets: number[];
  audience: string;
  audienceLimit: number | null;
  templateOverride: string | null;
  title: string;
  subtitle: string;
  targetLabel: string;
};

export type StaffRole = StaffMember["role"];
export type StaffMemberStatus = StaffMember["status"];
export type StaffInitiatedBy = NonNullable<StaffMember["initiatedBy"]>;

export type StaffListItem = {
  id: string;
  memberId: string | null;
  userId: string | null;
  name: string;
  phone: string;
  profileImage: string | null;
  role: StaffRole;
  status: StaffMemberStatus;
  initiatedBy: StaffInitiatedBy;
  splitPercent: number;
  counterOfferPercent: number | null;
  plansCount: number;
  proposedAt: Date | null;
  respondedAt: Date | null;
  createdAt: Date | null;
};

export type PublicBrandBusiness = {
  id: string;
  businessName: string;
  slug: string | null;
  logo: string | null;
  bannerUrl: string | null;
  galleryUrls: string[];
  bio: string | null;
  location: string | null;
  mapLink: string | null;
  phone: string | null;
  services: string[];
  openingHours: IOpeningHour[];
  isVerified: boolean;
};

export type BrandPlanViewerStatus = "alreadyBought" | "upgrade" | "expired" | "none";

export type PublicBrandPlan = {
  id: string;
  name: string;
  price: number;
  currency: string;
  billingCycle: string;
  duration: number;
  durationUnit: string;
  isFreeTrial: boolean;
  trialDuration: number;
  perks: string[];
  listingCategory: "plan" | "workshop" | "class" | "training";
  viewerStatus: BrandPlanViewerStatus;
  trainers?: Array<{
    id: string;
    name: string;
    specialty: string;
    profileImage: string | null;
  }>;
};

export type PublicBrandEvent = {
  id: string;
  key: string;
  title: string;
  subtitle: string;
  locationText: string;
  format: string;
  bannerKey: "FACE_OFF" | "KING_OF_THE_HILL" | "STEP_CHALLENGE" | "MARATHON";
  bannerName: string | null;
  startDate: Date | null;
  endDate: Date | null;
  status: string;
};

export type BrandPageVisitStats = {
  visitsToday: number;
  visitsLast7Days: number;
  visitsTotal: number;
};

export type PublicBrandPage = {
  business: PublicBrandBusiness;
  plans: PublicBrandPlan[];
  events: PublicBrandEvent[];
  categories: string[];
};

export type OwnerBrandPage = PublicBrandPage & {
  stats: BrandPageVisitStats;
  shareUrl: string | null;
};

export type BusinessHomeQuickAction = {
  id: "add_listing" | "record_payment" | "add_plans";
  label: string;
  route: string;
  badgeCount: number;
};

export type BusinessHomeSummary = {
  business: {
    id: string;
    businessName: string;
    slug: string | null;
    logo: string | null;
    status: BusinessStatus;
  };
  verification: {
    isVerified: boolean;
    badgeLabel: string;
    progressPercent: number;
  };
  earnings: {
    period: "THIS_MONTH";
    label: string;
    amount: number;
    currency: "INR";
    formattedAmount: string;
  };
  brandPage: {
    slug: string | null;
    shareUrl: string | null;
    visitsToday: number;
  };
  whatsapp: {
    creditsLeft: number;
    hasEntitlement: boolean;
    memberCount: number;
  };
  hasPro: boolean;
  notifications: {
    unreadCount: number;
  };
  quickActions: BusinessHomeQuickAction[];
};

export type BusinessStatus = Business["status"];
export type IOpeningHour = NonNullable<Business["openingHours"]>[number];
export type MemberStatus = Member["status"];
export type MemberGender = NonNullable<Member["gender"]>;
export type PlanBillingCycle = MembershipPlan["billingCycle"];
export type PlanDurationUnit = MembershipPlan["durationUnit"];
export type PlanStatus = MembershipPlan["status"];
export type MembershipStatus = Membership["status"];
export type MembershipRenewalStatus = NonNullable<Membership["renewalStatus"]>;
export type AttendanceSource = Attendance["source"];
export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | Attendance["source"];
export type CouponType = Coupon["type"];
export type CouponStatus = Coupon["status"];
export type PaymentMethod = Payment["method"];
export type PaymentSource = Payment["source"];
export type PaymentStatus = Payment["status"];
export type PayoutAccountStatus = PayoutAccount["verificationStatus"];
export type ProSubscriptionTier = "FREE" | "PRO" | "ENTERPRISE" | string;
export type ProSubscriptionStatus = ProSubscription["status"];

// Service Types (Active across gym-business services)
export type ResolveTargetsParams = {
  membership: IMembership | Record<string, unknown>;
  member?: IMember | Record<string, unknown> | null;
  customerUid?: string | null;
  businessId?: Types.ObjectId | string;
  targetAudience?: string | null;
  userIds?: Array<Types.ObjectId | string> | null;
};

export type UserWithPhone = { contactNo?: string; phone?: string };

export type PopulatedGymBusinessRef = {
  _id?: Types.ObjectId | string | unknown;
  name?: string;
  businessName?: string;
  title?: string;
  contactPhone?: string;
  phone?: string;
  contactEmail?: string;
  email?: string;
  address?: string;
  currency?: string;
  logo?: string;
  location?: string;
  mapLink?: string;
  services?: string[];
  openingHours?: Array<{
    day?: string;
    openTime?: string;
    closeTime?: string;
    isAvailable?: boolean;
  }>;
};

export type PopulatedGymPlanRef = Partial<IMembershipPlan> & {
  _id?: Types.ObjectId | string | unknown;
  amount?: number;
  price?: number;
  name?: string;
  billingCycle?: string;
  isFreeTrial?: boolean;
  duration?: number;
  durationUnit?: string;
  convertToPlanId?: unknown;
  trialDuration?: number;
  perks?: string[];
  currency?: string;
};

export type VerificationStatus = "PENDING" | "VERIFIED" | "FAILED";

export type ProSubDoc = Partial<IProSubscription> & {
  save?: () => Promise<unknown>;
  toObject?: () => Record<string, unknown>;
  [key: string]: unknown;
};
