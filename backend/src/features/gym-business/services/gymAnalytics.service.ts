import mongoose from "mongoose";
import Member from "../models/member.model.js";
import Membership from "../models/membership.model.js";
import MembershipPlan from "../models/membershipPlan.model.js";
import Payment from "../models/payment.model.js";
import Attendance from "../models/attendance.model.js";
import Coupon from "../models/coupon.model.js";
import Business from "../models/business.model.js";
import BrandPageVisit from "../models/brandPageVisit.model.js";
import {
  StronEvent,
  StronParticipation,
  ACTIVE_LISTING_STATUSES,
} from "../../managed-events/index.js";
import {
  asPopulatedMember,
  PaginationQuery,
  ServiceParams,
} from "../../../types/service.util.js";
import {
  MONTH_NAMES,
  FULL_MONTH_NAMES,
  DAY_NAMES_SHORT,
  DAY_NAMES_FULL,
} from "../../../constants/index.js";

const toObjectId = (id: unknown) =>
  typeof id === "string" ? new mongoose.Types.ObjectId(id) : id;

const buildPaymentMethodPercents = (
  rows: Array<{ _id?: string | null; count?: number }>,
) => {
  const total = rows.reduce((sum, row) => sum + Number(row.count || 0), 0);
  const countFor = (methods: string[]) =>
    rows
      .filter((row) => methods.includes(String(row._id || "").toUpperCase()))
      .reduce((sum, row) => sum + Number(row.count || 0), 0);
  if (total <= 0) {
    return { cashPercent: 0, cardPercent: 0, upiPercent: 0, otherPercent: 0 };
  }
  const cashPercent = Math.round((countFor(["CASH"]) / total) * 100);
  const cardPercent = Math.round((countFor(["CARD"]) / total) * 100);
  const upiPercent = Math.round((countFor(["UPI", "ONLINE"]) / total) * 100);
  const otherPercent = Math.max(0, 100 - cashPercent - cardPercent - upiPercent);
  return { cashPercent, cardPercent, upiPercent, otherPercent };
};

const formatCurrencyLakhs = (amount: number) => {

  if (!amount || amount === 0) return "₹0";
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} L`;
  }
  if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}k`;
  }
  return `₹${amount.toLocaleString("en-IN")}`;
};

const getISTDateString = (date = new Date()) => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
};

const toPercent = (count: number, visits: number) =>
  visits > 0 ? Math.round((count / visits) * 100) : 0;

const previousMonthWindowIST = (now = new Date()) => {
  const { monthPrefix, startOfMonth } = monthWindowIST(now);
  const [year, month] = monthPrefix.split("-").map(Number);
  const prevYear = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevPrefix = `${prevYear}-${String(prevMonth).padStart(2, "0")}`;
  const prevEnd = new Date(startOfMonth.getTime() - 1);
  return {
    monthPrefix: prevPrefix,
    start: new Date(`${prevPrefix}-01T00:00:00+05:30`),
    end: prevEnd,
    dateGte: `${prevPrefix}-01`,
    dateLte: getISTDateString(prevEnd),
  };
};

const vsLastMonthPercent = (current: number, previous: number): number | null => {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 100);
};

type BrandPagePerson = {
  id: string;
  name: string;
  date: string;
  subtitle: string;
  status?: string;
  phone?: string | null;
  email?: string | null;
  profileImage?: string | null;
  amount?: number | null;
};

const formatPersonDate = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime()) && typeof value === "string") {
    const parsed = new Date(`${value}T00:00:00+05:30`);
    if (!Number.isNaN(parsed.getTime())) {
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "Asia/Kolkata",
      }).format(parsed);
    }
    return String(value);
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(date);
};

const monthWindowIST = (now = new Date()) => {
  const today = getISTDateString(now);
  const monthPrefix = today.slice(0, 7);
  return {
    today,
    monthPrefix,
    startOfMonth: new Date(`${monthPrefix}-01T00:00:00+05:30`),
  };
};

const emptyWeeklyRevenue = () => [
  { label: "week 1", value: 0 },
  { label: "week 2", value: 0 },
  { label: "week 3", value: 0 },
  { label: "week 4", value: 0 },
];

const fillDailyVisits = (
  docs: Array<{ dateIST: string; count?: number }>,
  monthPrefix: string,
) => {
  const byDate = new Map(docs.map((doc) => [doc.dateIST, Number(doc.count || 0)]));
  const year = Number(monthPrefix.slice(0, 4));
  const month = Number(monthPrefix.slice(5, 7));
  const daysInMonth = new Date(year, month, 0).getDate();
  const rows: Array<{ date: string; count: number }> = [];
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${monthPrefix}-${String(day).padStart(2, "0")}`;
    rows.push({ date, count: byDate.get(date) || 0 });
  }
  return rows;
};

export const getWeeklyRevenueThisMonth = async (businessId: unknown) => {
  const bId = toObjectId(businessId);
  const { startOfMonth } = monthWindowIST();
  const weekAgg = await Payment.aggregate([
    {
      $match: {
        businessId: bId,
        status: "SUCCESS",
        createdAt: { $gte: startOfMonth },
      },
    },
    {
      $addFields: {
        week: {
          $min: [
            4,
            {
              $ceil: {
                $divide: [
                  {
                    $dayOfMonth: {
                      date: "$createdAt",
                      timezone: "Asia/Kolkata",
                    },
                  },
                  7,
                ],
              },
            },
          ],
        },
      },
    },
    { $group: { _id: "$week", total: { $sum: "$finalAmount" } } },
  ]);
  return emptyWeeklyRevenue().map((row, index) => {
    const week = index + 1;
    const match = weekAgg.find((item) => Number(item._id) === week);
    return { label: row.label, value: Number(match?.total || 0) };
  });
};

const memberDisplayName = (member: { name?: string | null } | null | undefined) =>
  String(member?.name || "Member").trim() || "Member";

/**
 * Brand-page funnel for the current IST month.
 * Percents are unique/count over visits; 0 when there are no visits.
 */
export const getBrandPageAnalytics = async ({ businessId }: ServiceParams) => {
  const bId = toObjectId(businessId);
  const { today, monthPrefix, startOfMonth } = monthWindowIST();
  const prev = previousMonthWindowIST();

  const [visitDocs, prevVisitDocs, trialMemberships, payments, prevPayments] =
    await Promise.all([
    BrandPageVisit.find({
      businessId: bId,
      dateIST: { $gte: `${monthPrefix}-01`, $lte: today },
    })
      .select("dateIST count uniqueVisitorHashes memberIds")
      .lean(),
    BrandPageVisit.find({
      businessId: bId,
      dateIST: { $gte: prev.dateGte, $lte: prev.dateLte },
    })
      .select("count")
      .lean(),
    Membership.aggregate([
      {
        $match: {
          businessId: bId,
          $or: [{ startDate: { $gte: startOfMonth } }, { createdAt: { $gte: startOfMonth } }],
        },
      },
      {
        $lookup: {
          from: "membershipplans",
          localField: "planId",
          foreignField: "_id",
          as: "plan",
        },
      },
      { $unwind: { path: "$plan", preserveNullAndEmptyArrays: true } },
      { $match: { "plan.isFreeTrial": true } },
      {
        $lookup: {
          from: "members",
          localField: "memberId",
          foreignField: "_id",
          as: "member",
        },
      },
      { $unwind: { path: "$member", preserveNullAndEmptyArrays: true } },
    ]),
    Payment.find({
      businessId: bId,
      status: { $ne: "CANCELLED" },
      createdAt: { $gte: startOfMonth },
    })
      .populate("memberId", "name phone email profileImage")
      .populate("couponId", "code")
      .populate("planId", "name isFreeTrial")
      .sort({ createdAt: -1 })
      .lean(),
    Payment.find({
      businessId: bId,
      status: { $ne: "CANCELLED" },
      createdAt: { $gte: prev.start, $lt: startOfMonth },
    })
      .select("status couponId")
      .lean(),
  ]);

  const visits = visitDocs.reduce((sum, doc) => sum + Number(doc.count || 0), 0);
  const prevVisits = prevVisitDocs.reduce((sum, doc) => sum + Number(doc.count || 0), 0);

  const trialMemberIds = new Set<string>();
  const trialPeople: BrandPagePerson[] = [];

  for (const row of trialMemberships) {
    const member = row.member as
      | { _id?: unknown; name?: string; phone?: string; email?: string; profileImage?: string }
      | undefined;
    const plan = row.plan as { trialDuration?: number; duration?: number; durationUnit?: string; isFreeTrial?: boolean } | undefined;
    const trialDays = Number(plan?.trialDuration || (plan?.durationUnit === "DAYS" ? plan?.duration : 0) || 14);
    if (!plan?.isFreeTrial && trialDays <= 0) continue;
    const id = String(member?._id || row.memberId);
    if (trialMemberIds.has(id)) continue;
    trialMemberIds.add(id);
    const when = (row.startDate || row.createdAt) as Date;
    trialPeople.push({
      id,
      name: memberDisplayName(member),
      date: String(when || ""),
      subtitle: `Free trial started ${formatPersonDate(when)} · ${trialDays || 14} days`,
      status: row.status === "ACTIVE" ? "Active" : String(row.status || "Trial"),
      phone: member?.phone || null,
      email: member?.email || null,
      profileImage: member?.profileImage || null,
    });
  }

  const planLabel = (payment: {
    planId?: unknown;
    planName?: string | null;
    eventName?: string | null;
  }) => {
    const plan = payment.planId as { name?: string; isFreeTrial?: boolean } | string | null;
    if (plan && typeof plan === "object" && plan.name) {
      return plan.isFreeTrial ? `Free trial · ${plan.name}` : plan.name;
    }
    return payment.planName || payment.eventName || "Plan";
  };

  const purchasePeople: BrandPagePerson[] = payments.map((payment) => {
    const member = asPopulatedMember(payment.memberId);
    const when = (payment.createdAt || payment.paidAt) as Date;
    const amount = Number(payment.finalAmount || payment.amount || 0);
    const completed = String(payment.status) === "SUCCESS";
    return {
      id: String(payment._id),
      name: memberDisplayName(member),
      date: String(when || ""),
      subtitle: `Attempted ${formatPersonDate(when)} · Cart value ₹${amount.toLocaleString("en-IN")}`,
      status: completed ? "Completed" : "Abandoned",
      phone: member?.phone || null,
      email: member?.email || null,
      profileImage: member?.profileImage || null,
      amount,
    };
  });

  const claimPeople: BrandPagePerson[] = payments
    .filter((payment) => Boolean(payment.couponId))
    .map((payment) => {
      const member = asPopulatedMember(payment.memberId);
      const coupon = payment.couponId as { code?: string } | null;
      const code = coupon && typeof coupon === "object" ? coupon.code : null;
      const when = (payment.createdAt || payment.paidAt) as Date;
      return {
        id: String(payment._id),
        name: memberDisplayName(member),
        date: String(when || ""),
        subtitle: `Claimed ${formatPersonDate(when)}${code ? ` · Code ${code}` : ""}`,
        status: payment.status === "SUCCESS" ? "Redeemed" : "Not yet used",
        phone: member?.phone || null,
        email: member?.email || null,
        profileImage: member?.profileImage || null,
      };
    });

  const successPeople: BrandPagePerson[] = payments
    .filter((payment) => String(payment.status) === "SUCCESS")
    .map((payment) => {
      const member = asPopulatedMember(payment.memberId);
      const when = (payment.createdAt || payment.paidAt) as Date;
      const amount = Number(payment.finalAmount || payment.amount || 0);
      return {
        id: String(payment._id),
        name: memberDisplayName(member),
        date: String(when || ""),
        subtitle: `Registered ${formatPersonDate(when)} · ${planLabel(payment)}`,
        status: "Paid",
        phone: member?.phone || null,
        email: member?.email || null,
        profileImage: member?.profileImage || null,
        amount,
      };
    });

  const latestVisitByMember = new Map<string, string>();
  for (const doc of visitDocs) {
    const ids = Array.isArray(doc.memberIds) ? doc.memberIds : [];
    for (const rawId of ids) {
      const id = String(rawId);
      const existing = latestVisitByMember.get(id);
      if (!existing || doc.dateIST > existing) {
        latestVisitByMember.set(id, doc.dateIST);
      }
    }
  }

  const namedMembers = latestVisitByMember.size
    ? await Member.find({
        _id: { $in: [...latestVisitByMember.keys()].map((id) => toObjectId(id)) },
        isDeleted: { $ne: true },
      })
        .select("name phone email profileImage")
        .lean()
    : [];

  const visitPeople: BrandPagePerson[] = namedMembers
    .filter((member) => String(member.name || "").trim())
    .map((member) => {
      const dateIST = latestVisitByMember.get(String(member._id)) || today;
      return {
        id: String(member._id),
        name: String(member.name).trim(),
        date: dateIST,
        subtitle: `Visited ${formatPersonDate(dateIST)}`,
        phone: member.phone || null,
        email: member.email || null,
        profileImage: member.profileImage || null,
      };
    });

  const freeTrialCount = trialMemberIds.size;
  const purchaseAttemptCount = payments.length;
  const offerClaimCount = claimPeople.length;
  const purchaseSuccessCount = successPeople.length;
  const prevPurchaseAttemptCount = prevPayments.length;
  const prevOfferClaimCount = prevPayments.filter((payment) => Boolean(payment.couponId)).length;
  const prevPurchaseSuccessCount = prevPayments.filter(
    (payment) => String(payment.status) === "SUCCESS",
  ).length;

  return {
    visits,
    visitsVsLastMonthPercent: vsLastMonthPercent(visits, prevVisits),
    freeTrialCount,
    purchaseAttemptCount,
    purchaseAttemptVsLastMonthPercent: vsLastMonthPercent(
      purchaseAttemptCount,
      prevPurchaseAttemptCount,
    ),
    offerClaimCount,
    offerClaimVsLastMonthPercent: vsLastMonthPercent(offerClaimCount, prevOfferClaimCount),
    purchaseSuccessCount,
    purchaseSuccessVsLastMonthPercent: vsLastMonthPercent(
      purchaseSuccessCount,
      prevPurchaseSuccessCount,
    ),
    freeTrialPercent: toPercent(freeTrialCount, visits),
    purchaseAttemptPercent: toPercent(purchaseAttemptCount, visits),
    offerClaimRatePercent: toPercent(offerClaimCount, visits),
    dailyVisits: fillDailyVisits(visitDocs, monthPrefix),
    people: {
      visits: visitPeople,
      trials: trialPeople,
      purchases: purchasePeople,
      claims: claimPeople,
      successes: successPeople,
    },
  };
};

/**
 * Get comprehensive gym dashboard summary metrics
 */
export const getDashboardSummary = async ({ businessId }: ServiceParams) => {
  const bId = toObjectId(businessId);
  const now = new Date();
  const { today, startOfMonth } = monthWindowIST(now);
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    totalMembers,
    activeMembers,
    todayAttendance,
    expiringThisWeek,
    pendingPaymentsCount,
    revenueAgg,
    visitsThisMonth,
    methodAgg,
    weeklyRevenue,
    brandPage,
  ] = await Promise.all([
    Member.countDocuments({ businessId: bId, isDeleted: false }),
    Membership.countDocuments({
      businessId: bId,
      status: "ACTIVE",
      endDate: { $gte: now },
    }),
    Attendance.countDocuments({ businessId: bId, attendanceDate: today }),
    Membership.countDocuments({
      businessId: bId,
      status: "ACTIVE",
      endDate: { $gte: now, $lte: in7Days },
    }),
    Payment.countDocuments({ businessId: bId, status: "PENDING" }),
    Payment.aggregate([
      {
        $match: {
          businessId: bId,
          status: "SUCCESS",
          createdAt: { $gte: startOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$finalAmount" },
          count: { $sum: 1 },
        },
      },
    ]),
    Attendance.countDocuments({
      businessId: bId,
      attendanceDate: { $gte: `${today.slice(0, 7)}-01`, $lte: today },
    }),
    Payment.aggregate([
      {
        $match: {
          businessId: bId,
          status: "SUCCESS",
          createdAt: { $gte: startOfMonth },
        },
      },
      { $group: { _id: "$method", count: { $sum: 1 } } },
    ]),
    getWeeklyRevenueThisMonth(bId),
    getBrandPageAnalytics({ businessId: bId }),
  ]);

  const monthlyRevenue = revenueAgg[0]?.total || 0;
  const monthlyTransactions = revenueAgg[0]?.count || 0;
  const paymentMethods = buildPaymentMethodPercents(methodAgg);
  const brandPageVisitsThisMonth = Number(brandPage.visits || 0);

  return {
    totalMembers,
    activeMembers,
    expiredMembers: Math.max(0, totalMembers - activeMembers),
    todayAttendance,
    expiringThisWeek,
    pendingPaymentsCount,
    monthlyRevenue,
    monthlyTransactions,
    visitsThisMonth,
    currency: "INR",
    paymentMethods,
    weeklyRevenue,
    brandPageVisitsThisMonth,
    brandPage: {
      visits: brandPageVisitsThisMonth,
      visitsVsLastMonthPercent: brandPage.visitsVsLastMonthPercent ?? null,
      offerClaimCount: brandPage.offerClaimCount ?? 0,
      offerClaimVsLastMonthPercent: brandPage.offerClaimVsLastMonthPercent ?? null,
      purchaseAttemptCount: brandPage.purchaseAttemptCount ?? 0,
      purchaseAttemptVsLastMonthPercent: brandPage.purchaseAttemptVsLastMonthPercent ?? null,
      purchaseSuccessCount: brandPage.purchaseSuccessCount ?? 0,
      purchaseSuccessVsLastMonthPercent: brandPage.purchaseSuccessVsLastMonthPercent ?? null,
      freeTrialPercent: brandPage.freeTrialPercent,
      purchaseAttemptPercent: brandPage.purchaseAttemptPercent,
      offerClaimRatePercent: brandPage.offerClaimRatePercent,
    },
  };
};

/**
 * Revenue analytics aggregated by 12 months with rich highlights
 */
export const getRevenueAnalytics = async ({
  businessId,
  queryParams = {},
}: {
  businessId: unknown;
  queryParams?: PaginationQuery;
}) => {
  const bId = toObjectId(businessId);
  const selectedYear = parseInt(String(queryParams.year ?? new Date().getFullYear()), 10);
  const startOfYear = new Date(selectedYear, 0, 1);
  const endOfYear = new Date(selectedYear, 11, 31, 23, 59, 59, 999);

  const match = {
    businessId: bId,
    status: "SUCCESS",
    createdAt: { $gte: startOfYear, $lte: endOfYear },
  };

  const [monthlyAgg, methodAgg] = await Promise.all([
    Payment.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $month: "$createdAt" }, // 1 to 12
          totalRevenue: { $sum: "$finalAmount" },
          totalTransactions: { $sum: 1 },
          manualCount: {
            $sum: { $cond: [{ $eq: ["$source", "MANUAL"] }, 1, 0] },
          },
          onlineCount: {
            $sum: { $cond: [{ $eq: ["$source", "GATEWAY"] }, 1, 0] },
          },
        },
      },
    ]),
    Payment.aggregate([
      { $match: match },
      { $group: { _id: "$method", count: { $sum: 1 } } },
    ]),
  ]);

  const revenueMap = new Map();
  for (const item of monthlyAgg) {
    revenueMap.set(item._id, item);
  }

  let totalEarnings = 0;
  let topMonthRevenue = 0;
  let topMonthName = "December";

  const months = MONTH_NAMES.map((name, index) => {
    const monthNumber = index + 1;
    const agg = revenueMap.get(monthNumber);
    const value = agg?.totalRevenue || 0;
    const transactions = agg?.totalTransactions || 0;
    const manualCount = agg?.manualCount || 0;
    const onlineCount = agg?.onlineCount || 0;

    totalEarnings += value;
    if (value > topMonthRevenue) {
      topMonthRevenue = value;
      topMonthName = FULL_MONTH_NAMES[index];
    }

    return {
      month: name,
      monthIndex: index,
      monthFull: FULL_MONTH_NAMES[index],
      year: String(selectedYear),
      value,
      formattedValue: formatCurrencyLakhs(value),
      transactions,
      manualTransactions: manualCount,
      onlineTransactions: onlineCount,
    };
  });

  const activeMonthsCount = months.filter((m) => m.value > 0).length || 1;
  const avgMonthlyRevenue = Math.round(totalEarnings / Math.max(activeMonthsCount, 1));

  return {
    year: String(selectedYear),
    totalEarnings,
    formattedTotal: formatCurrencyLakhs(totalEarnings),
    months,
    paymentMethods: buildPaymentMethodPercents(methodAgg),
    financialHighlights: {
      yoyGrowthPercent: 0,
      avgMonthlyRevenue,
      formattedAvgMonthly: formatCurrencyLakhs(avgMonthlyRevenue),
      topPerformingMonth: {
        month: topMonthName,
        revenue: topMonthRevenue,
        formattedRevenue: formatCurrencyLakhs(topMonthRevenue),
      },
    },
  };
};

/**
 * Attendance analytics (trends, 24-hr peak distribution, & recent roster with in/out times)
 */
export const getAttendanceAnalytics = async ({
  businessId,
  queryParams = {},
}: {
  businessId: unknown;
  queryParams?: ServiceParams;
}) => {
  const bId = toObjectId(businessId);
  const now = new Date();

  // 1. Generate 7-day window
  const daysArray = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = getISTDateString(d);
    const dayOfWeek = d.getDay();
    daysArray.push({
      dateStr,
      dayShort: DAY_NAMES_SHORT[dayOfWeek],
      dayLabel: DAY_NAMES_FULL[dayOfWeek],
      formattedDate: `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`,
    });
  }

  const startDateStr = daysArray[0].dateStr;
  const endDateStr = daysArray[daysArray.length - 1].dateStr;

  // 2. Fetch daily attendance counts for the 7 days
  const dailyCounts = await Attendance.aggregate([
    {
      $match: {
        businessId: bId,
        attendanceDate: { $gte: startDateStr, $lte: endDateStr },
      },
    },
    {
      $group: {
        _id: "$attendanceDate",
        count: { $sum: 1 },
      },
    },
  ]);

  const countMap = new Map();
  for (const item of dailyCounts) {
    countMap.set(item._id, item.count);
  }

  let totalCheckIns = 0;
  let maxDayCount = 10;

  for (const item of dailyCounts) {
    if (item.count > maxDayCount) maxDayCount = item.count;
  }

  const days = daysArray.map((day) => {
    const count = countMap.get(day.dateStr) || 0;
    totalCheckIns += count;
    return {
      dayLabel: day.dayLabel,
      dayShort: day.dayShort,
      count,
      maxCount: Math.max(maxDayCount, 50),
      date: day.dateStr,
      formattedDate: day.formattedDate,
    };
  });

  const avgDaily = Math.round(totalCheckIns / 7);
  const rangeText = `${daysArray[0].formattedDate} - ${daysArray[daysArray.length - 1].formattedDate}`;

  // 3. Hourly check-in aggregation (24-hour distribution in IST Timezone)
  const hourlyAgg = await Attendance.aggregate([
    {
      $match: {
        businessId: bId,
        attendanceDate: { $gte: startDateStr, $lte: endDateStr },
      },
    },
    {
      $group: {
        _id: { $hour: { date: "$checkedInAt", timezone: "+05:30" } },
        count: { $sum: 1 },
      },
    },
  ]);

  const hourlyMap = new Map();
  for (const h of hourlyAgg) {
    hourlyMap.set(h._id, h.count);
  }

  const slotDefinitions = [
    { hour: 0, hourLabel: "00:00", hours: [23, 0, 1] },
    { hour: 2, hourLabel: "02:00", hours: [2, 3] },
    { hour: 4, hourLabel: "04:00", hours: [4, 5] },
    { hour: 6, hourLabel: "06:00", hours: [6, 7] },
    { hour: 8, hourLabel: "08:00", hours: [8, 9] },
    { hour: 10, hourLabel: "10:00", hours: [10, 11] },
    { hour: 12, hourLabel: "12:00", hours: [12] },
    { hour: 14, hourLabel: "14:00", hours: [13, 14] },
    { hour: 16, hourLabel: "16:00", hours: [15, 16] },
    { hour: 18, hourLabel: "18:00", hours: [17, 18] },
    { hour: 20, hourLabel: "20:00", hours: [19, 20] },
    { hour: 22, hourLabel: "22:00", hours: [21, 22] },
    { hour: 23, hourLabel: "23:59", hours: [23] },
  ];

  let maxSlotCount = 1;
  const rawHourlySlots = slotDefinitions.map((def) => {
    const totalInSlot = def.hours.reduce((sum, h) => sum + (hourlyMap.get(h) || 0), 0);
    if (totalInSlot > maxSlotCount) maxSlotCount = totalInSlot;
    return {
      hour: def.hour,
      hourLabel: def.hourLabel,
      memberCount: totalInSlot,
    };
  });

  const hourlySlots = rawHourlySlots.map((s) => {
    const intensity = Math.min(100, Math.round((s.memberCount / Math.max(maxSlotCount, 1)) * 100));
    let loadLabel = "Quiet (10%)";
    if (intensity >= 85) loadLabel = "Evening Rush (98%)";
    else if (intensity >= 65) loadLabel = "Morning Peak (80%)";
    else if (intensity >= 40) loadLabel = "Moderate (50%)";
    else if (intensity >= 15) loadLabel = "Light (25%)";

    return {
      hour: s.hour,
      hourLabel: s.hourLabel,
      memberCount: s.memberCount,
      intensity: Math.max(5, intensity),
      loadLabel,
    };
  });

  // 4. Fetch populated Recent Attendance Roster with In/Out times & Member details
  const recentAttendance = await Attendance.find({ businessId: bId })
    .populate("memberId", "name phone email profileImage gender status")
    .sort({ checkedInAt: -1 })
    .limit(30)
    .lean();

  const memberIds = recentAttendance.map((a) => a.memberId?._id).filter(Boolean);
  const activeMemberships = await Membership.find({
    businessId: bId,
    memberId: { $in: memberIds },
    status: "ACTIVE",
  })
    .populate("planId", "name billingCycle")
    .sort({ endDate: -1 })
    .lean();

  const membershipMap = new Map();
  for (const ms of activeMemberships) {
    if (!membershipMap.has(String(ms.memberId))) {
      membershipMap.set(String(ms.memberId), ms);
    }
  }

  const recentRoster = recentAttendance
    .filter((a) => a.memberId)
    .map((a) => {
      const ms = membershipMap.get(String(a.memberId._id));
      let statusText = "Active Member";

      if (ms) {
        const diffMs = new Date(ms.endDate).getTime() - now.getTime();
        const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (daysLeft > 0) {
          statusText = `${ms.planId?.name || "Active"} · ${daysLeft}d left`;
        } else {
          statusText = `Expired ${Math.abs(daysLeft)}d ago`;
        }
      } else {
        statusText = "No Active Plan";
      }

      const inTime =
        a.inTime ||
        (a.checkedInAt
          ? new Date(a.checkedInAt).toLocaleTimeString("en-IN", {
              timeZone: "Asia/Kolkata",
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })
          : "--:--");

      const outTime =
        a.outTime ||
        (a.checkedOutAt
          ? new Date(a.checkedOutAt).toLocaleTimeString("en-IN", {
              timeZone: "Asia/Kolkata",
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })
          : null);

      let duration = null;
      if (a.checkedInAt && a.checkedOutAt) {
        const diffMins = Math.round(
          (new Date(a.checkedOutAt).getTime() - new Date(a.checkedInAt).getTime()) /
            (1000 * 60),
        );
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        duration = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
      }

      const member = asPopulatedMember(a.memberId);
      return {
        _id: a._id,
        memberId: {
          _id: member?._id ?? a.memberId,
          name: member?.name,
          phone: member?.phone,
          email: member?.email,
          profileImage: member?.profileImage,
          status: member?.status,
        },
        attendanceDate: a.attendanceDate,
        checkedInAt: a.checkedInAt,
        checkedOutAt: a.checkedOutAt,
        inTime,
        outTime: outTime || "In Gym",
        isActiveNow: !a.checkedOutAt,
        duration: duration || (a.checkedOutAt ? "--" : "In Gym"),
        membershipStatus: statusText,
        source: a.source,
      };
    });

  let bestMorningHour = 6;
  let maxMorningCount = 0;
  for (let hour = 5; hour <= 11; hour += 1) {
    const count = Number(hourlyMap.get(hour) || 0);
    if (count > maxMorningCount) {
      maxMorningCount = count;
      bestMorningHour = hour;
    }
  }

  let bestEveningHour = 18;
  let maxEveningCount = 0;
  for (let hour = 16; hour <= 22; hour += 1) {
    const count = Number(hourlyMap.get(hour) || 0);
    if (count > maxEveningCount) {
      maxEveningCount = count;
      bestEveningHour = hour;
    }
  }

  const formatHourLabel = (hour: number) => {
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${String(displayHour).padStart(2, "0")}:00 ${period}`;
  };
  const formatHourRange = (startHour: number) =>
    `${formatHourLabel(startHour)} - ${formatHourLabel((startHour + 2) % 24)}`;

  const morningPeak =
    maxMorningCount > 0 ? formatHourRange(bestMorningHour) : "06:00 AM - 09:00 AM";
  const eveningPeak =
    maxEveningCount > 0 ? formatHourRange(bestEveningHour) : "05:00 PM - 09:00 PM";

  return {
    attendanceWeek: {
      rangeText,
      totalCheckIns,
      avgDaily,
      days,
    },
    peakHoursWeek: {
      rangeText,
      morningPeak,
      eveningPeak,
      offPeak: "01:00 PM - 04:00 PM",
      hourlySlots,
    },
    recentRoster,
  };
};

/**
 * Member sign-up growth trend, active subscriptions per month & retention health
 */
export const getMemberAnalytics = async ({
  businessId,
  queryParams = {},
}: {
  businessId: unknown;
  queryParams?: PaginationQuery;
}) => {
  const bId = toObjectId(businessId);
  const selectedYear = parseInt(String(queryParams.year ?? new Date().getFullYear()), 10);
  const startOfYear = new Date(selectedYear, 0, 1);
  const endOfYear = new Date(selectedYear, 11, 31, 23, 59, 59, 999);

  const [growthAgg, activeMembershipsAgg, totalActiveNow, genderBreakdown] =
    await Promise.all([
      Member.aggregate([
        {
          $match: {
            businessId: bId,
            isDeleted: false,
            createdAt: { $gte: startOfYear, $lte: endOfYear },
          },
        },
        {
          $group: {
            _id: { $month: "$createdAt" },
            newMembers: { $sum: 1 },
          },
        },
      ]),
      Membership.aggregate([
        {
          $match: {
            businessId: bId,
            startDate: { $lte: endOfYear },
            endDate: { $gte: startOfYear },
          },
        },
        {
          $group: {
            _id: { $month: "$startDate" },
            activeCount: { $sum: 1 },
          },
        },
      ]),
      Membership.countDocuments({
        businessId: bId,
        status: "ACTIVE",
        endDate: { $gte: new Date() },
      }),
      Member.aggregate([
        { $match: { businessId: bId, isDeleted: false } },
        {
          $group: {
            _id: { $ifNull: ["$gender", "OTHER"] },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

  const growthMap = new Map();
  for (const item of growthAgg) {
    growthMap.set(item._id, item.newMembers);
  }

  const activeMap = new Map();
  for (const item of activeMembershipsAgg) {
    activeMap.set(item._id, item.activeCount);
  }

  const months = MONTH_NAMES.map((name, index) => {
    const monthNum = index + 1;
    const newJoiners = growthMap.get(monthNum) || 0;
    const count = activeMap.get(monthNum) || (newJoiners > 0 ? newJoiners * 3 : 0);

    return {
      month: name,
      monthIndex: index,
      monthFull: FULL_MONTH_NAMES[index],
      count,
      newJoiners,
      renewals: Math.max(0, count - newJoiners),
    };
  });

  const genderDistribution = genderBreakdown.map((g) => ({
    gender: g._id,
    count: g.count,
  }));

  const currentMonthNum = new Date().getMonth() + 1;
  const newJoinersThisMonth = growthMap.get(currentMonthNum) || 0;
  const thisMonthActive = activeMap.get(currentMonthNum) || 0;
  const monthlyRetentionPercent =
    thisMonthActive > 0
      ? Number((((thisMonthActive - newJoinersThisMonth) / thisMonthActive) * 100).toFixed(1))
      : 0;

  return {
    year: String(selectedYear),
    totalActive: totalActiveNow,
    months,
    genderDistribution,
    memberHealth: {
      monthlyRetentionPercent: Math.max(0, monthlyRetentionPercent),
      newJoinersThisMonth,
      genderDistribution,
    },
  };
};

/**
 * Membership plan conversion and revenue distribution
 */
export const getPlanAnalytics = async ({
  businessId,
  queryParams = {},
}: {
  businessId: unknown;
  queryParams?: ServiceParams;
}) => {
  const bId = toObjectId(businessId);

  const planStats = await Membership.aggregate([
    { $match: { businessId: bId } },
    {
      $group: {
        _id: "$planId",
        totalSold: { $sum: 1 },
        totalRevenue: { $sum: "$finalAmount" },
        activeCount: {
          $sum: { $cond: [{ $eq: ["$status", "ACTIVE"] }, 1, 0] },
        },
      },
    },
    {
      $lookup: {
        from: "membershipplans",
        localField: "_id",
        foreignField: "_id",
        as: "plan",
      },
    },
    { $unwind: { path: "$plan", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        planId: "$_id",
        planName: "$plan.name",
        billingCycle: "$plan.billingCycle",
        price: "$plan.price",
        totalSold: 1,
        totalRevenue: 1,
        activeCount: 1,
      },
    },
  ]);

  return {
    plans: planStats,
  };
};

/**
 * Coupon usage and discount summary
 */
export const getCouponAnalytics = async ({
  businessId,
  queryParams = {},
}: {
  businessId: unknown;
  queryParams?: ServiceParams;
}) => {
  const coupons = await Coupon.find({ businessId, isDeleted: false })
    .select(
      "code type discountPercentage discountAmount usedCoupons totalCoupons expiresAt status",
    )
    .lean();

  return {
    coupons,
  };
};

/**
 * Listing Customers Analytics (Conversion Rate & Repeat User Rate)
 */
export const getListingAnalytics = async ({
  businessId,
  tab,
  page,
  limit,
  queryParams = {},
}: {
  businessId: unknown;
  tab?: unknown;
  page?: number;
  limit?: number;
  queryParams?: ServiceParams;
}) => {
  const resolvedTab = tab ?? queryParams.tab;
  const resolvedPage = page ?? (queryParams.page ? Number(queryParams.page) : 1);
  const resolvedLimit = limit ?? (queryParams.limit ? Number(queryParams.limit) : 20);
  const bId = toObjectId(businessId);
  const business = await Business.findById(bId).lean();
  const organizerUid = business?.ownerId ? String(business.ownerId) : null;

  // 1. Fetch plans for this gym
  const plans = await MembershipPlan.find({ businessId: bId, isDeleted: { $ne: true } }).lean();
  const planIds = plans.map((p) => p._id);

  const membershipStats = planIds.length > 0
    ? await Membership.aggregate([
        { $match: { businessId: bId, planId: { $in: planIds } } },
        {
          $group: {
            _id: "$planId",
            soldCount: { $sum: 1 },
            revenue: { $sum: { $ifNull: ["$finalAmount", "$price", 0] } },
            memberIds: { $addToSet: "$memberId" },
          },
        },
      ])
    : [];

  const planStatsMap = new Map();
  for (const s of membershipStats) {
    planStatsMap.set(String(s._id), s);
  }

  // 2. Fetch events associated with this gym organizer
  const events = organizerUid
    ? await StronEvent.find({ organizerUid }).lean()
    : [];
  const eventKeys = events.map((e) => e.key);

  const participationStats = eventKeys.length > 0
    ? await StronParticipation.aggregate([
        { $match: { eventKey: { $in: eventKeys }, status: { $ne: "cancelled" } } },
        {
          $group: {
            _id: "$eventKey",
            soldCount: { $sum: 1 },
            revenue: { $sum: { $ifNull: ["$totalCharged", "$ticketPrice", 0] } },
            uids: { $addToSet: "$uid" },
          },
        },
      ])
    : [];

  const eventStatsMap = new Map();
  for (const s of participationStats) {
    eventStatsMap.set(String(s._id), s);
  }

  const conversionListings = [];
  const repeatListings = [];

  for (const plan of plans) {
    const stats = planStatsMap.get(String(plan._id));
    const soldCount = stats ? stats.soldCount : 0;
    const revenue = stats ? stats.revenue : 0;
    const views =
      (plan as ServiceParams).viewsCount != null
        ? Number((plan as ServiceParams).viewsCount)
        : Math.max(soldCount, 1);
    const convRate = views > 0 ? Number(((soldCount / views) * 100).toFixed(1)) : 0;

    conversionListings.push({
      id: String(plan._id),
      title: `${plan.name} (${plan.billingCycle})`,
      totalViews: views,
      ticketsSold: soldCount,
      conversionRate: convRate,
      revenue,
    });

    const uniqueMembers = stats?.memberIds?.length || 0;
    const repeatCount = Math.max(0, soldCount - uniqueMembers);
    const newCount = uniqueMembers;
    const repRate = soldCount > 0 ? Number(((repeatCount / soldCount) * 100).toFixed(1)) : 0;

    repeatListings.push({
      id: String(plan._id),
      title: `${plan.name} (${plan.billingCycle})`,
      totalParticipants: soldCount,
      repeatParticipants: repeatCount,
      newParticipants: newCount,
      repeatRate: repRate,
    });
  }

  let eventViews = 0;
  let eventTickets = 0;
  let activeEventCount = 0;

  for (const event of events) {
    const stats = eventStatsMap.get(event.key);
    const soldCount = stats ? stats.soldCount : event.registrationCount || 0;
    const revenue = stats ? stats.revenue : 0;
    const rawViews = Number((event as ServiceParams).viewsCount);
    const views = Number.isFinite(rawViews) && rawViews > 0 ? rawViews : soldCount;
    const convRate = views > 0 ? Number(((soldCount / views) * 100).toFixed(1)) : 0;
    const status = String((event as ServiceParams).status || "").toLowerCase();
    const isActiveListing = (ACTIVE_LISTING_STATUSES as readonly string[]).includes(
      status,
    );

    conversionListings.push({
      id: String(event._id || event.key),
      title: event.title || event.description || "STRON Fitness Event",
      totalViews: views,
      ticketsSold: soldCount,
      conversionRate: convRate,
      revenue,
    });

    const uniqueUids = stats?.uids?.length || (soldCount > 0 ? 1 : 0);
    const repeatCount = Math.max(0, soldCount - uniqueUids);
    const newCount = uniqueUids;
    const repRate = soldCount > 0 ? Number(((repeatCount / soldCount) * 100).toFixed(1)) : 0;

    repeatListings.push({
      id: String(event._id || event.key),
      title: event.title || event.description || "STRON Fitness Event",
      totalParticipants: soldCount,
      repeatParticipants: repeatCount,
      newParticipants: newCount,
      repeatRate: repRate,
    });

    if (isActiveListing) {
      activeEventCount += 1;
      eventViews += views;
      eventTickets += soldCount;
    }
  }

  const totalViews = conversionListings.reduce((acc, l) => acc + l.totalViews, 0);
  const totalTickets = conversionListings.reduce((acc, l) => acc + l.ticketsSold, 0);
  const totalRev = conversionListings.reduce((acc, l) => acc + l.revenue, 0);
  const overallConversion = totalViews > 0 ? Number(((totalTickets / totalViews) * 100).toFixed(1)) : 0;

  const totalParts = repeatListings.reduce((acc, l) => acc + l.totalParticipants, 0);
  const totalRepeats = repeatListings.reduce((acc, l) => acc + l.repeatParticipants, 0);
  const totalNew = repeatListings.reduce((acc, l) => acc + l.newParticipants, 0);
  const overallRepeat = totalParts > 0 ? Number(((totalRepeats / totalParts) * 100).toFixed(1)) : 0;

  const { startOfMonth } = monthWindowIST();
  const prev = previousMonthWindowIST();
  const [thisMonthSold, lastMonthSold, thisMonthRepeatMembers, lastMonthRepeatMembers] =
    await Promise.all([
      Membership.countDocuments({ businessId: bId, createdAt: { $gte: startOfMonth } }),
      Membership.countDocuments({
        businessId: bId,
        createdAt: { $gte: prev.start, $lt: startOfMonth },
      }),
      Membership.countDocuments({
        businessId: bId,
        createdAt: { $gte: startOfMonth },
        $expr: { $gt: ["$createdAt", "$startDate"] },
      }).catch(() => 0),
      Membership.countDocuments({
        businessId: bId,
        createdAt: { $gte: prev.start, $lt: startOfMonth },
        $expr: { $gt: ["$createdAt", "$startDate"] },
      }).catch(() => 0),
    ]);

  return {
    conversionRate: {
      overallRate: overallConversion,
      totalViews,
      totalTicketsSold: totalTickets,
      totalRevenue: totalRev,
      listings: conversionListings,
      vsLastMonthPercent: vsLastMonthPercent(thisMonthSold, lastMonthSold),
    },
    repeatUserRate: {
      overallRate: overallRepeat,
      totalParticipants: totalParts,
      repeatParticipants: totalRepeats,
      newParticipants: totalNew,
      listings: repeatListings,
      vsLastMonthPercent: vsLastMonthPercent(thisMonthRepeatMembers, lastMonthRepeatMembers),
    },
    summary: {
      totalViews: eventViews,
      totalCustomers: eventTickets,
      listingCount: activeEventCount,
      customersPerListing:
        activeEventCount > 0 ? Math.round(eventTickets / activeEventCount) : 0,
      averageRating: null,
    },
  };
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
  getWeeklyRevenueThisMonth,
};
