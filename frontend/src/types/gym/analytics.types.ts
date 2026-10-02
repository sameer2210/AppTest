export type GymAnalyticsTab = "attendance" | "earnings" | "active_members" | "peak_hours";

export interface AttendanceDayData {
  dayLabel: string;
  dayShort: string;
  count: number;
  maxCount: number;
  date: string;
  formattedDate?: string;
}

export interface AttendanceRosterItem {
  _id: string;
  memberId: {
    _id: string;
    name: string;
    phone: string;
    email?: string;
    profileImage?: string;
    status: string;
  };
  attendanceDate: string;
  checkedInAt: string;
  checkedOutAt: string | null;
  inTime: string;
  outTime: string;
  isActiveNow: boolean;
  duration: string;
  membershipStatus: string;
  source: "QR" | "MANUAL";
}

export interface MonthlyMetricData {
  month: string;
  monthIndex: number;
  monthFull?: string;
  year: string;
  value: number;
  formattedValue: string;
  transactions?: number;
  manualTransactions?: number;
  onlineTransactions?: number;
}

export interface FinancialHighlights {
  yoyGrowthPercent: number | null;
  formattedYoYGrowth?: string;
  avgMonthlyRevenue: number;
  formattedAvgMonthly: string;
  topPerformingMonth: {
    month: string | null;
    revenue: number;
    formattedRevenue: string;
  };
}

export interface PeakHourSlot {
  hour: number;
  hourLabel: string; // e.g. "00:00", "06:00", "18:00", "23:59"
  intensity: number; // 0 to 100 percentage
  memberCount: number;
  loadLabel?: string;
}

export interface ActiveMemberMonthData {
  month: string;
  monthIndex: number;
  monthFull?: string;
  count: number;
  newJoiners?: number;
  renewals?: number;
}

export interface MemberHealthMetrics {
  monthlyRetentionPercent: number;
  newJoinersThisMonth: number;
  genderDistribution?: {
    gender: string;
    count: number;
  }[];
}

export interface AnalyticsSummaryPayload {
  attendanceWeek: {
    rangeText: string;
    totalCheckIns: number;
    avgDaily: number;
    days: AttendanceDayData[];
  };
  earningsYear: {
    year: string;
    totalEarnings: number;
    formattedTotal: string;
    months: MonthlyMetricData[];
    financialHighlights?: FinancialHighlights;
  };
  activeMembersYear: {
    year: string;
    totalActive: number;
    months: ActiveMemberMonthData[];
    memberHealth?: MemberHealthMetrics;
  };
  peakHoursWeek: {
    rangeText: string;
    morningPeak: string;
    eveningPeak: string;
    offPeak: string;
    hourlySlots: PeakHourSlot[];
  };
  recentRoster: AttendanceRosterItem[];
}

export interface BackendDashboardSummary {
  totalMembers: number;
  activeMembers: number;
  expiredMembers: number;
  todayAttendance: number;
  expiringThisWeek: number;
  pendingPaymentsCount: number;
  monthlyRevenue: number;
  monthlyTransactions: number;
  currency: string;
}

export interface BackendRevenueBreakdownItem {
  timeline: string;
  totalRevenue: number;
  totalTransactions: number;
  manualTransactions: number;
  onlineTransactions: number;
}

export interface BackendRevenueAnalytics {
  year: string;
  totalEarnings: number;
  formattedTotal: string;
  months: MonthlyMetricData[];
  financialHighlights: FinancialHighlights;
}

export interface BackendAttendanceAnalytics {
  attendanceWeek: {
    rangeText: string;
    totalCheckIns: number;
    avgDaily: number;
    days: AttendanceDayData[];
  };
  peakHoursWeek: {
    rangeText: string;
    morningPeak: string;
    eveningPeak: string;
    offPeak: string;
    hourlySlots: PeakHourSlot[];
  };
  recentRoster: AttendanceRosterItem[];
}

export interface BackendMemberAnalytics {
  year: string;
  totalActive: number;
  months: ActiveMemberMonthData[];
  memberHealth: MemberHealthMetrics;
}

export interface BackendPlanAnalytics {
  plans: {
    planId: string;
    planName: string;
    billingCycle: string;
    price: number;
    totalSold: number;
    totalRevenue: number;
    activeCount: number;
  }[];
}

export interface BackendCouponAnalytics {
  coupons: {
    _id: string;
    code: string;
    type: string;
    discountPercentage?: number;
    discountAmount?: number;
    usedCoupons: number;
    totalCoupons: number;
    expiresAt: string;
    status: string;
  }[];
}

export interface ListingConversionItem {
  id: string;
  title: string;
  totalViews: number;
  ticketsSold: number;
  conversionRate: number;
  revenue: number;
}

export interface ListingRepeatItem {
  id: string;
  title: string;
  totalParticipants: number;
  repeatParticipants: number;
  newParticipants: number;
  repeatRate: number;
}

export interface ListingAnalyticsPayload {
  conversionRate: {
    overallRate: number;
    totalViews: number;
    totalTicketsSold: number;
    totalRevenue: number;
    listings: ListingConversionItem[];
  };
  repeatUserRate: {
    overallRate: number;
    totalParticipants: number;
    repeatParticipants: number;
    newParticipants: number;
    listings: ListingRepeatItem[];
  };
}
