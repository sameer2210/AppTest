import { apiClient } from "@/services/core/apiClient.service";
import type {
  AnalyticsSummaryPayload,
  BackendDashboardSummary,
  BackendRevenueAnalytics,
  BackendAttendanceAnalytics,
  BackendMemberAnalytics,
  BackendPlanAnalytics,
  BackendCouponAnalytics,
  ListingAnalyticsPayload,
} from "@/types/gym/analytics.types";
import {
  createStatic12Months,
  createStaticActiveMemberMonths,
  createStatic7Days,
  STATIC_HOURLY_SLOTS,
} from "@/constants/gymAnalytics.constants";

const currentYearStr = String(new Date().getFullYear());
const initialStaticDays = createStatic7Days();
const initialStaticRange = `${initialStaticDays[0].formattedDate} - ${initialStaticDays[initialStaticDays.length - 1].formattedDate}`;

export const DEFAULT_ANALYTICS_DATA: AnalyticsSummaryPayload = {
  attendanceWeek: {
    rangeText: initialStaticRange,
    totalCheckIns: 0,
    avgDaily: 0,
    days: initialStaticDays,
  },
  earningsYear: {
    year: currentYearStr,
    totalEarnings: 0,
    formattedTotal: "₹0",
    months: createStatic12Months(currentYearStr),
    financialHighlights: {
      yoyGrowthPercent: 0,
      formattedYoYGrowth: "0%",
      avgMonthlyRevenue: 0,
      formattedAvgMonthly: "₹0",
      topPerformingMonth: {
        month: null,
        revenue: 0,
        formattedRevenue: "₹0",
      },
    },
  },
  activeMembersYear: {
    year: currentYearStr,
    totalActive: 0,
    months: createStaticActiveMemberMonths(),
    memberHealth: {
      monthlyRetentionPercent: 0,
      newJoinersThisMonth: 0,
    },
  },
  peakHoursWeek: {
    rangeText: initialStaticRange,
    morningPeak: "06:00 AM - 09:00 AM",
    eveningPeak: "05:00 PM - 09:00 PM",
    offPeak: "01:00 PM - 04:00 PM",
    hourlySlots: STATIC_HOURLY_SLOTS,
  },
  recentRoster: [],
};

const EMPTY_LISTING_ANALYTICS: ListingAnalyticsPayload = {
  conversionRate: {
    overallRate: 0,
    totalViews: 0,
    totalTicketsSold: 0,
    totalRevenue: 0,
    listings: [],
  },
  repeatUserRate: {
    overallRate: 0,
    totalParticipants: 0,
    repeatParticipants: 0,
    newParticipants: 0,
    listings: [],
  },
};

export const analyticsApiService = {
  /**
   * Get all gym analytics data from live backend
   */
  async getAnalytics(params?: { year?: string }): Promise<{
    success: boolean;
    data: AnalyticsSummaryPayload;
  }> {
    const selectedYear = params?.year || currentYearStr;
    try {
      const [attRes, revRes, memRes] = await Promise.allSettled([
        apiClient.get<any>("/api/v1/analytics/attendance"),
        apiClient.get<any>("/api/v1/analytics/revenue", { params }),
        apiClient.get<any>("/api/v1/analytics/members", { params }),
      ]);

      const attData =
        attRes.status === "fulfilled" ? attRes.value.data?.data || attRes.value.data : null;
      const revData =
        revRes.status === "fulfilled" ? revRes.value.data?.data || revRes.value.data : null;
      const memData =
        memRes.status === "fulfilled" ? memRes.value.data?.data || memRes.value.data : null;

      const payload: AnalyticsSummaryPayload = {
        attendanceWeek: {
          rangeText: attData?.attendanceWeek?.rangeText || initialStaticRange,
          totalCheckIns: attData?.attendanceWeek?.totalCheckIns || 0,
          avgDaily: attData?.attendanceWeek?.avgDaily || 0,
          days:
            Array.isArray(attData?.attendanceWeek?.days) && attData.attendanceWeek.days.length > 0
              ? attData.attendanceWeek.days
              : createStatic7Days(),
        },
        peakHoursWeek: {
          rangeText: attData?.peakHoursWeek?.rangeText || initialStaticRange,
          morningPeak: attData?.peakHoursWeek?.morningPeak || "06:00 AM - 09:00 AM",
          eveningPeak: attData?.peakHoursWeek?.eveningPeak || "05:00 PM - 09:00 PM",
          offPeak: attData?.peakHoursWeek?.offPeak || "01:00 PM - 04:00 PM",
          hourlySlots:
            Array.isArray(attData?.peakHoursWeek?.hourlySlots) &&
            attData.peakHoursWeek.hourlySlots.length > 0
              ? attData.peakHoursWeek.hourlySlots
              : STATIC_HOURLY_SLOTS,
        },
        recentRoster: Array.isArray(attData?.recentRoster) ? attData.recentRoster : [],
        earningsYear: revData
          ? {
              year: revData.year || selectedYear,
              totalEarnings: revData.totalEarnings || 0,
              formattedTotal: revData.formattedTotal || "₹0",
              months:
                Array.isArray(revData.months) && revData.months.length > 0
                  ? revData.months
                  : createStatic12Months(revData.year || selectedYear),
              financialHighlights: revData.financialHighlights,
            }
          : {
              ...DEFAULT_ANALYTICS_DATA.earningsYear,
              year: selectedYear,
              months: createStatic12Months(selectedYear),
            },
        activeMembersYear: memData
          ? {
              year: memData.year || selectedYear,
              totalActive: memData.totalActive || 0,
              months:
                Array.isArray(memData.months) && memData.months.length > 0
                  ? memData.months
                  : createStaticActiveMemberMonths(),
              memberHealth: memData.memberHealth,
            }
          : {
              ...DEFAULT_ANALYTICS_DATA.activeMembersYear,
              year: selectedYear,
            },
      };

      return {
        success: true,
        data: payload,
      };
    } catch {
      return {
        success: true,
        data: DEFAULT_ANALYTICS_DATA,
      };
    }
  },

  /**
   * GET /api/v1/analytics/dashboard
   */
  async getDashboardSummary(): Promise<{
    success: boolean;
    data: BackendDashboardSummary;
  }> {
    const response = await apiClient.get<any>("/api/v1/analytics/dashboard");
    return {
      success: true,
      data: response.data?.data || response.data,
    };
  },

  /**
   * GET /api/v1/analytics/revenue
   */
  async getRevenueAnalytics(params?: {
    period?: "month" | "day";
    from?: string;
    to?: string;
    year?: string;
  }): Promise<{
    success: boolean;
    data: BackendRevenueAnalytics;
  }> {
    const response = await apiClient.get<any>("/api/v1/analytics/revenue", { params });
    return {
      success: true,
      data: response.data?.data || response.data,
    };
  },

  /**
   * GET /api/v1/analytics/attendance
   */
  async getAttendanceAnalytics(params?: { from?: string; to?: string }): Promise<{
    success: boolean;
    data: BackendAttendanceAnalytics;
  }> {
    const response = await apiClient.get<any>("/api/v1/analytics/attendance", { params });
    return {
      success: true,
      data: response.data?.data || response.data,
    };
  },

  /**
   * GET /api/v1/analytics/members
   */
  async getMemberAnalytics(params?: { year?: string }): Promise<{
    success: boolean;
    data: BackendMemberAnalytics;
  }> {
    const response = await apiClient.get<any>("/api/v1/analytics/members", { params });
    return {
      success: true,
      data: response.data?.data || response.data,
    };
  },

  /**
   * GET /api/v1/analytics/plans
   */
  async getPlanAnalytics(): Promise<{
    success: boolean;
    data: BackendPlanAnalytics;
  }> {
    const response = await apiClient.get<any>("/api/v1/analytics/plans");
    return {
      success: true,
      data: response.data?.data || response.data,
    };
  },

  /**
   * GET /api/v1/analytics/coupons
   */
  async getCouponAnalytics(): Promise<{
    success: boolean;
    data: BackendCouponAnalytics;
  }> {
    const response = await apiClient.get<any>("/api/v1/analytics/coupons");
    return {
      success: true,
      data: response.data?.data || response.data,
    };
  },

  /**
   * GET /api/v1/analytics/listings (Conversion Rate & Repeat User Rate)
   */
  async getListingAnalytics(): Promise<{
    success: boolean;
    data: ListingAnalyticsPayload;
  }> {
    try {
      const response = await apiClient.get<any>("/api/v1/analytics/listings");
      return {
        success: true,
        data: response.data?.data || response.data || EMPTY_LISTING_ANALYTICS,
      };
    } catch {
      return {
        success: false,
        data: EMPTY_LISTING_ANALYTICS,
      };
    }
  },
};

export default analyticsApiService;
