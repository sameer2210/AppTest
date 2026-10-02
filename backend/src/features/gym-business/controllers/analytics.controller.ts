import { sendError } from "../../../utils/stronHttpError.util.js";
import type { Request, Response } from "express";
import gymAnalyticsService from "../services/gymAnalytics.service.js";
import {
  createStatic12MemberMonths,
  createStatic12RevenueMonths,
  createStatic7Days,
  STATIC_HOURLY_SLOTS,
} from "../../../constants/gymAnalytics.constants.js";

const EMPTY_DASHBOARD = {
  totalMembers: 0,
  activeMembers: 0,
  expiredMembers: 0,
  todayAttendance: 0,
  expiringThisWeek: 0,
  pendingPaymentsCount: 0,
  monthlyRevenue: 0,
  monthlyTransactions: 0,
  currency: "INR",
  weeklyRevenue: [
    { label: "week 1", value: 0 },
    { label: "week 2", value: 0 },
    { label: "week 3", value: 0 },
    { label: "week 4", value: 0 },
  ],
  brandPageVisitsThisMonth: 0,
  brandPage: {
    visits: 0,
    freeTrialPercent: 0,
    purchaseAttemptPercent: 0,
    offerClaimRatePercent: 0,
  },
};

const EMPTY_BRAND_PAGE = {
  visits: 0,
  freeTrialCount: 0,
  purchaseAttemptCount: 0,
  offerClaimCount: 0,
  freeTrialPercent: 0,
  purchaseAttemptPercent: 0,
  offerClaimRatePercent: 0,
  dailyVisits: [] as unknown[],
  people: {
    visits: [] as unknown[],
    trials: [] as unknown[],
    purchases: [] as unknown[],
    claims: [] as unknown[],
  },
};

const EMPTY_LISTING = {
  conversionRate: {
    overallRate: 0,
    totalViews: 0,
    totalTicketsSold: 0,
    totalRevenue: 0,
    listings: [] as unknown[],
  },
  repeatUserRate: {
    overallRate: 0,
    totalParticipants: 0,
    repeatParticipants: 0,
    newParticipants: 0,
    listings: [] as unknown[],
  },
};

export const getDashboardSummary = async (req: Request, res: Response) => {
  try {
    if (!req.businessId) {
      return res.status(200).json({ success: true, data: EMPTY_DASHBOARD });
    }
    const data = await gymAnalyticsService.getDashboardSummary({
      businessId: req.businessId,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getRevenueAnalytics = async (req: Request, res: Response) => {
  try {
    if (!req.businessId) {
      const year = String(req.query?.year || new Date().getFullYear());
      return res.status(200).json({
        success: true,
        data: {
          year,
          totalEarnings: 0,
          formattedTotal: "₹0",
          months: createStatic12RevenueMonths(year),
          financialHighlights: {
            yoyGrowthPercent: 0,
            avgMonthlyRevenue: 0,
            formattedAvgMonthly: "₹0",
            topPerformingMonth: { month: null, revenue: 0, formattedRevenue: "₹0" },
          },
        },
      });
    }
    const data = await gymAnalyticsService.getRevenueAnalytics({
      businessId: req.businessId,
      queryParams: req.query,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getAttendanceAnalytics = async (req: Request, res: Response) => {
  try {
    if (!req.businessId) {
      const staticDays = createStatic7Days();
      const rangeText = `${staticDays[0].formattedDate} - ${staticDays[staticDays.length - 1].formattedDate}`;
      return res.status(200).json({
        success: true,
        data: {
          attendanceWeek: {
            rangeText,
            totalCheckIns: 0,
            avgDaily: 0,
            days: staticDays,
          },
          peakHoursWeek: {
            rangeText,
            morningPeak: "06:00 AM - 09:00 AM",
            eveningPeak: "05:00 PM - 09:00 PM",
            offPeak: "01:00 PM - 04:00 PM",
            hourlySlots: STATIC_HOURLY_SLOTS,
          },
          recentRoster: [],
        },
      });
    }
    const data = await gymAnalyticsService.getAttendanceAnalytics({
      businessId: req.businessId,
      queryParams: req.query,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getMemberAnalytics = async (req: Request, res: Response) => {
  try {
    if (!req.businessId) {
      const year = String(req.query?.year || new Date().getFullYear());
      return res.status(200).json({
        success: true,
        data: {
          year,
          totalActive: 0,
          months: createStatic12MemberMonths(),
          genderDistribution: [],
          memberHealth: {
            monthlyRetentionPercent: 0,
            newJoinersThisMonth: 0,
            genderDistribution: [],
          },
        },
      });
    }
    const data = await gymAnalyticsService.getMemberAnalytics({
      businessId: req.businessId,
      queryParams: req.query,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getPlanAnalytics = async (req: Request, res: Response) => {
  try {
    if (!req.businessId) {
      return res.status(200).json({ success: true, data: { plans: [] } });
    }
    const data = await gymAnalyticsService.getPlanAnalytics({
      businessId: req.businessId,
      queryParams: req.query,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getCouponAnalytics = async (req: Request, res: Response) => {
  try {
    if (!req.businessId) {
      return res.status(200).json({ success: true, data: { coupons: [] } });
    }
    const data = await gymAnalyticsService.getCouponAnalytics({
      businessId: req.businessId,
      queryParams: req.query,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getListingAnalytics = async (req: Request, res: Response) => {
  try {
    if (!req.businessId) {
      return res.status(200).json({ success: true, data: EMPTY_LISTING });
    }
    const data = await gymAnalyticsService.getListingAnalytics({
      businessId: req.businessId,
      queryParams: req.query,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getBrandPageAnalytics = async (req: Request, res: Response) => {
  try {
    if (!req.businessId) {
      return res.status(200).json({ success: true, data: EMPTY_BRAND_PAGE });
    }
    const data = await gymAnalyticsService.getBrandPageAnalytics({
      businessId: req.businessId,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export default {
  getDashboardSummary,
  getRevenueAnalytics,
  getAttendanceAnalytics,
  getMemberAnalytics,
  getPlanAnalytics,
  getCouponAnalytics,
  getListingAnalytics,
  getBrandPageAnalytics,
};
