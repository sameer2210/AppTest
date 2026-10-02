import { Router } from "express";
import businessRoutes from "../features/gym-business/routes/business.route.js";
import brandPagePublicRoutes from "../features/gym-business/routes/brandPage.public.route.js";
import staffRoutes from "../features/gym-business/routes/staff.route.js";
import whatsappRoutes from "../features/gym-business/routes/whatsapp.route.js";
import whatsappWebhookRoutes from "../features/gym-business/routes/whatsappWebhook.route.js";
import memberRoutes from "../features/gym-business/routes/member.route.js";
import membershipPlanRoutes from "../features/gym-business/routes/membershipPlan.route.js";
import membershipRoutes from "../features/gym-business/routes/membership.route.js";
import couponRoutes from "../features/gym-business/routes/coupon.route.js";
import gymPaymentRoutes from "../features/gym-business/routes/gymPayment.route.js";
import payoutAccountRoutes from "../features/gym-business/routes/payoutAccount.route.js";
import attendanceRoutes from "../features/gym-business/routes/attendance.route.js";
import analyticsRoutes from "../features/gym-business/routes/analytics.route.js";
import proSubscriptionRoutes from "../features/gym-business/routes/proSubscription.route.js";
import stronConnectRoutes from "../features/stron-connect/routes/stronConnect.route.js";

const router = Router();

// Gym Business Core Modules (Part 1)
router.use("/business", businessRoutes);
router.use("/brand", brandPagePublicRoutes);
router.use("/staff", staffRoutes);
router.use("/whatsapp", whatsappRoutes);
router.use("/webhooks/whatsapp", whatsappWebhookRoutes);
router.use("/members", memberRoutes);
router.use("/membership-plans", membershipPlanRoutes);
router.use("/memberships", membershipRoutes);

// Monetization, Billing & Operations (Part 2)
router.use("/coupons", couponRoutes);
router.use("/payments", gymPaymentRoutes);
router.use("/payout-account", payoutAccountRoutes);
router.use("/attendance", attendanceRoutes);

// Analytics, Platform SaaS & Entitlements (Part 3)
router.use("/analytics", analyticsRoutes);
router.use("/subscriptions", proSubscriptionRoutes); // Canonical V1 route
router.use("/pro", proSubscriptionRoutes); // Backward-compatible alias for mobile client
router.use("/connect", stronConnectRoutes);

export default router;
