import {
  Business,
  MembershipPlan,
  Membership,
  Attendance,
  getISTDateString,
} from "../../gym-business/index.js";
import { StronEvent, StronParticipation } from "../../managed-events/index.js";
import { asPopulatedPlan, ConnectPlanItem, type ServiceParams } from "../../../types/service.util.js";
import { findGymMemberForScanner } from "./stronConnectGym.service.js";
import { EVENT_PRIORITY } from "../../../constants/index.js";


/**
 * Classify Smart QR view for the PDF matrix:
 * explore | plans | listings | plans_and_listings
 */
export const classifyCatalogView = (catalog: ServiceParams) => {
  const formattedPlans = (catalog.formattedPlans as ConnectPlanItem[] | undefined) || [];
  const formattedEvents = (catalog.formattedEvents as ServiceParams[] | undefined) || [];
  const realPlans = formattedPlans.filter((p: ConnectPlanItem) => !p.isServiceTag);
  const serviceRows = formattedPlans.filter((p: ConnectPlanItem) => p.isServiceTag);
  const hasPlans = realPlans.length > 0 || serviceRows.length > 0;
  const hasListings = formattedEvents.length > 0;

  if (!hasPlans && !hasListings) return "explore";
  if (hasPlans && hasListings) return "plans_and_listings";
  if (hasPlans) return "plans";
  return "listings";
};

const catalogHasOfferings = (catalog: ServiceParams) => classifyCatalogView(catalog) !== "explore";

/**
 * PDF priority for plans:
 * 1) Free trial (only if viewer has no purchased pack)
 * 2) Current / purchased pack
 * 3) Other packs price low → high
 * If no free trial exists but plans/services exist → treat top offer as Registration.
 */
const sortAndAnnotatePlans = ({
  plans,
  activeMembership,
  pendingMembership,
  hasFreeTrialPlan,
  trialEligible = true,
}: ServiceParams) => {
  const hasPurchasedPack = Boolean(activeMembership || pendingMembership);
  const activeMem = activeMembership as ServiceParams | null | undefined;
  const pendingMem = pendingMembership as ServiceParams | null | undefined;
  const annotated = (plans as ConnectPlanItem[]).map((p) => {
    const isCurrent =
      activeMem &&
      String(asPopulatedPlan(activeMem.planId)?._id || activeMem.planId) === String(p.id);
    const isPending =
      !isCurrent &&
      pendingMem &&
      String(asPopulatedPlan(pendingMem.planId)?._id || pendingMem.planId) === String(p.id);

    let actionText = isCurrent ? "Check In" : isPending ? "Check In to Activate" : "Choose Plan";
    let isRegistration = false;

    if (!isCurrent && !isPending && p.isFreeTrial && trialEligible && !hasPurchasedPack) {
      actionText = "Start Free Trial";
    } else if (!isCurrent && !isPending && p.isFreeTrial && !trialEligible) {
      actionText = "Choose Plan";
    } else if (!isCurrent && !isPending && !hasFreeTrialPlan && !p.isServiceTag) {
      actionText = "Register";
      isRegistration = true;
    } else if (!isCurrent && !isPending && p.isServiceTag) {
      actionText = "Register";
      isRegistration = true;
    }

    if (p.convertPayToContinue && !isCurrent) {
      actionText = "Pay to continue";
    }

    return {
      ...p,
      isBought: Boolean(isCurrent || isPending),
      isPendingActivation: Boolean(isPending),
      statusText: p.statusText
        ? p.statusText
        : isPending
          ? "Plan purchased. Check in at the gym to activate."
          : isCurrent
            ? p.isFreeTrial
              ? "Free trial active. Check in at the gym anytime."
              : "Active"
            : undefined,
      actionText,
      isRegistration,
      isFreeTrial: Boolean(p.isFreeTrial),
    };
  });

  annotated.sort((a: ConnectPlanItem, b: ConnectPlanItem) => {
    const aTrial = a.isFreeTrial && !hasPurchasedPack ? 0 : 1;
    const bTrial = b.isFreeTrial && !hasPurchasedPack ? 0 : 1;
    if (aTrial !== bTrial) return aTrial - bTrial;

    const aBought = a.isBought ? 0 : 1;
    const bBought = b.isBought ? 0 : 1;
    if (aBought !== bBought) return aBought - bBought;

    const aPrice = Number(String(a.price).replace(/[^\d.]/g, "")) || 0;
    const bPrice = Number(String(b.price).replace(/[^\d.]/g, "")) || 0;
    return aPrice - bPrice;
  });

  return annotated;
};

const sortEventsByPriority = (events: ServiceParams[]) =>
  [...events].sort((a, b) => {
    const pa = EVENT_PRIORITY[String(a.format || "")] ?? 9;
    const pb = EVENT_PRIORITY[String(b.format || "")] ?? 9;
    if (pa !== pb) return pa - pb;
    return String(a.title || "").localeCompare(String(b.title || ""));
  });

/**
 * Plans + events for a business owner, from the viewer's (scanner) point of view.
 * targetUser = catalog owner; scanner = person viewing that catalog.
 */
export const loadConnectCatalog = async ({
  targetUser,
  scannerUid,
  scanner,
  preResolvedBusiness,
}: ServiceParams) => {
  const target = targetUser as ServiceParams;
  const ownerUid = String(target?.uid || "");
  const [businessDoc, eventDocs] = await Promise.all([
    preResolvedBusiness
      ? Promise.resolve(preResolvedBusiness)
      : Business.findOne({
          ownerId: ownerUid,
          status: { $ne: "SUSPENDED" },
        })
          .select("businessName location logo ownerId status services")
          .lean(),
    StronEvent.find({
      organizerUid: ownerUid,
      isDeleted: { $ne: true },
      status: { $in: ["published", "live", "active", "PUBLISHED", "LIVE", "ACTIVE"] },
    })
      .select(
        "key title format status bannerName marathonMode destination ticketTypes listingType",
      )
      .lean(),
  ]);

  const memberUser = scanner;
  const participantUid = scannerUid;
  const eventKeys = eventDocs.map((e) => e.key).filter(Boolean);
  const biz = businessDoc as ServiceParams | null;
  const businessIdVariants = biz ? [biz._id, String(biz._id)] : [];

  const [plans, memberDoc, participations] = await Promise.all([
    biz
      ? MembershipPlan.find({
          businessId: { $in: businessIdVariants },
          isDeleted: { $ne: true },
          status: { $nin: ["STOPPED", "stopped", "DRAFT", "draft"] },
        })
          .select(
            "name billingCycle price perks duration durationUnit status isFreeTrial trialDuration",
          )
          .lean()
      : [],
    biz ? findGymMemberForScanner({ scanner: memberUser, businessId: biz._id }) : null,
    eventKeys.length
      ? StronParticipation.find({ eventKey: { $in: eventKeys }, uid: participantUid })
          .select("eventKey checkedInAt")
          .lean()
      : [],
  ]);

  let activeMembership = null;
  let pendingMembership = null;
  let alreadyCheckedInToday = false;
  let trialEligible = true;
  let convertPayPlanId = null;
  if (biz && memberDoc) {
    const now = new Date();
    const [membership, pending, existingAtt, priorMemberships, unpaidConvert] = await Promise.all([
      Membership.findOne({
        businessId: { $in: businessIdVariants },
        memberId: memberDoc._id,
        status: "ACTIVE",
        endDate: { $gte: now },
      })
        .populate("planId", "name price duration durationUnit isFreeTrial")
        .sort({ endDate: -1 })
        .lean(),
      Membership.findOne({
        businessId: { $in: businessIdVariants },
        memberId: memberDoc._id,
        status: "PENDING",
        purchasedAt: { $ne: null },
      })
        .populate("planId", "name price duration durationUnit")
        .sort({ purchasedAt: 1, createdAt: 1 })
        .lean(),
      Attendance.findOne({
        businessId: biz._id,
        memberId: memberDoc._id,
        attendanceDate: getISTDateString(now),
      })
        .select("_id")
        .lean(),
      Membership.find({
        businessId: { $in: businessIdVariants },
        memberId: memberDoc._id,
      })
        .populate("planId", "isFreeTrial")
        .select("planId finalAmount")
        .lean(),
      Membership.findOne({
        businessId: { $in: businessIdVariants },
        memberId: memberDoc._id,
        status: "PENDING",
        notes: { $regex: /TRIAL_CONVERT/ },
        purchasedAt: null,
      })
        .select("planId")
        .lean(),
    ]);
    activeMembership = membership;
    pendingMembership = pending;
    alreadyCheckedInToday = Boolean(existingAtt);
    const hadTrial = priorMemberships.some((m) =>
      Boolean(asPopulatedPlan(m.planId)?.isFreeTrial),
    );
    const hadPaid = priorMemberships.some(
      (m) => !asPopulatedPlan(m.planId)?.isFreeTrial && Number(m.finalAmount) > 0,
    );
    trialEligible = !hadTrial && !hadPaid;
    convertPayPlanId = unpaidConvert?.planId ? String(unpaidConvert.planId) : null;
  }

  const hasFreeTrialPlan = plans.some((p) => p.isFreeTrial);
  const bizId = biz ? String(biz._id) : "";

  let formattedPlans: ConnectPlanItem[] = plans.map((p) => {
    const isCurrentPlan =
      activeMembership &&
      String(activeMembership.planId?._id || activeMembership.planId) === String(p._id);
    const isPendingPlan =
      !isCurrentPlan &&
      pendingMembership &&
      String(pendingMembership.planId?._id || pendingMembership.planId) === String(p._id);

    let actionText = isCurrentPlan ? "Check In" : "Choose Plan";
    if (isPendingPlan) {
      actionText = "Check In to Activate";
    }

    const ownedMembership = isCurrentPlan
      ? activeMembership
      : isPendingPlan
        ? pendingMembership
        : null;

    return {
      id: String(p._id),
      businessId: bizId,
      name: p.name,
      billingText: p.isFreeTrial
        ? `Free trial · ${p.trialDuration || 0} days`
        : `Billed ${String(p.billingCycle || "Monthly").toLowerCase()}`,
      price: p.isFreeTrial ? "Free" : `₹${p.price}`,
      isBought: Boolean(isCurrentPlan || isPendingPlan),
      isPendingActivation: Boolean(isPendingPlan),
      statusText: isPendingPlan
        ? "Plan purchased. Check in at the gym to activate."
        : isCurrentPlan
          ? p.isFreeTrial
            ? "Free trial active. Check in at the gym anytime."
            : "Active"
          : p.isFreeTrial && !trialEligible
            ? "Free trial already used"
            : convertPayPlanId && String(p._id) === convertPayPlanId
              ? "Pay to continue after your trial"
              : undefined,
      isExpired:
        isCurrentPlan || isPendingPlan
          ? false
          : Boolean(p.isFreeTrial && !trialEligible),
      convertPayToContinue: Boolean(
        convertPayPlanId && String(p._id) === convertPayPlanId,
      ),
      tags: p.perks?.length ? p.perks : ["Gym Access", "Locker"],
      actionText,
      duration: p.isFreeTrial ? p.trialDuration : p.duration,
      durationUnit: p.isFreeTrial ? "DAYS" : p.durationUnit,
      isFreeTrial: Boolean(p.isFreeTrial),
      trialDuration: p.isFreeTrial ? Number(p.trialDuration) || 0 : undefined,
      billingCycle: p.billingCycle || null,
      membershipId: ownedMembership ? String(ownedMembership._id) : undefined,
      autoRenew: ownedMembership ? Boolean(ownedMembership.autoRenew) : undefined,
      endDate: ownedMembership?.endDate || undefined,
    };
  });

  const serviceTags = Array.isArray(biz?.services)
    ? biz.services.map((s: unknown) => String(s || "").trim()).filter(Boolean)
    : [];
  // Service tags fill empty plan lists (services listing in PDF priority).
  if (formattedPlans.length === 0 && serviceTags.length > 0) {
    for (let i = 0; i < serviceTags.length; i += 1) {
      formattedPlans.push({
        id: `service_${bizId}_${i}`,
        businessId: bizId,
        name: serviceTags[i],
        billingText: "Service offering",
        price: "—",
        isBought: false,
        tags: [serviceTags[i]],
        actionText: "Register",
        isServiceTag: true,
        isRegistration: true,
        isFreeTrial: false,
      });
    }
  }

  formattedPlans = sortAndAnnotatePlans({
    plans: formattedPlans,
    activeMembership,
    pendingMembership,
    hasFreeTrialPlan,
    trialEligible,
  });

  const partMap = new Map(
    participations.map((p) => [p.eventKey, p] as [string, (typeof participations)[number]]),
  );
  let formattedEvents = eventDocs.map((e, idx) => {
    const part = partMap.get(e.key);
    const minPrice = e.ticketTypes?.length
      ? Math.min(...e.ticketTypes.map((t) => Number(t.price) || 0))
      : null;
    const isExternal =
      e.listingType === "external" ||
      (e.format as string) === "in_person_listing";


    const format = String(e.format || "").toLowerCase();
    const isVirtual =
      format.includes("step") ||
      format.includes("face") ||
      format.includes("king") ||
      e.marathonMode === "virtual";

    let subtitle = "Event check-in";
    let mappedFormat = "marathon";
    if (isExternal) {
      subtitle = "External In-Person Event";
      mappedFormat = "marathon";
    } else if (
      format === "virtual_step_challenge" ||
      format.includes("step") ||
      (e.title || "").toLowerCase().includes("step")
    ) {
      subtitle = "Step challenge";
      mappedFormat = "virtual_step_challenge";
    } else if (format.includes("face") || format === "face_off") {
      subtitle = "Face-off";
      mappedFormat = "face_off";
    } else if (
      format.includes("king") ||
      format === "king_of_the_hill" ||
      (e.title || "").toLowerCase().includes("hill")
    ) {
      subtitle = "King of the hill";
      mappedFormat = "king_of_the_hill";
    } else if (!isVirtual) {
      subtitle = "In-Person Marathon Race";
      mappedFormat = "marathon";
    }

    return {
      id: e.key || `e_${idx}`,
      eventKey: e.key,
      title: e.title,
      subtitle,
      locationDetails: e.destination || biz?.location || "On-ground Venue",
      isEnrolled: Boolean(part),
      isCheckedIn: Boolean(part?.checkedInAt),
      priceText:
        minPrice != null
          ? minPrice === 0
            ? "Free"
            : `Starts from ₹${minPrice}`
          : undefined,
      format: mappedFormat,
      bannerName: e.bannerName || null,
      listingType: e.listingType || "stron_managed",
      marathonMode: e.marathonMode || (isVirtual ? "virtual" : "in_person"),
      destination: e.destination || null,
      actionText: part?.checkedInAt
        ? "Checked In"
        : part
          ? "Check In"
          : "Register",
    };
  });

  formattedEvents = sortEventsByPriority(formattedEvents as ServiceParams[]) as typeof formattedEvents;

  const isScannerProvider = Boolean(
    (biz && String(biz.ownerId) === String(scannerUid)) ||
      eventDocs.some((e) => String(e.organizerUid) === String(scannerUid)),
  );

  const viewMode = classifyCatalogView({ formattedPlans, formattedEvents });

  return {
    businessDoc,
    memberDoc,
    activeMembership,
    pendingMembership,
    alreadyCheckedInToday,
    formattedPlans,
    formattedEvents,
    isScannerProvider,
    serviceTags,
    viewMode,
    hasFreeTrialPlan,
  };
};

/**
 * Smart QR PDF matrix: each party sees the OTHER party's catalog.
 * - Scanner opens target's offerings (or Explore if target empty)
 * - Target (via poll) opens scanner's offerings (or Explore if scanner empty)
 */
export const resolveSmartQrPair = async ({
  scanner,
  targetUser,
  preResolvedBusiness = null,
}: ServiceParams) => {
  const scannerUser = scanner as ServiceParams;
  const target = targetUser as ServiceParams;
  const [catalogForScanner, catalogForTarget] = await Promise.all([
    loadConnectCatalog({
      targetUser,
      scannerUid: scannerUser.uid,
      scanner,
      preResolvedBusiness,
    }),
    loadConnectCatalog({
      targetUser: scanner,
      scannerUid: target.uid,
      scanner: targetUser,
      preResolvedBusiness: null,
    }),
  ]);

  return {
    catalogForScanner,
    catalogForTarget,
    viewModeForScanner: classifyCatalogView(catalogForScanner),
    viewModeForTarget: classifyCatalogView(catalogForTarget),
  };
};

/** @deprecated Prefer resolveSmartQrPair — kept for callers that need one provider catalog. */
export const resolveBusinessPartyCatalog = async ({
  scanner,
  targetUser,
  preResolvedBusiness = null,
}: ServiceParams) => {
  const scannerUser = scanner as ServiceParams;
  const target = targetUser as ServiceParams;
  const targetCatalog = await loadConnectCatalog({
    targetUser,
    scannerUid: scannerUser.uid,
    scanner,
    preResolvedBusiness,
  });
  if (catalogHasOfferings(targetCatalog)) {
    return {
      catalog: targetCatalog,
      providerUser: targetUser,
      customerUser: scanner,
      customerUid: scannerUser.uid,
    };
  }

  if (String(scannerUser.uid) !== String(target.uid)) {
    const scannerCatalog = await loadConnectCatalog({
      targetUser: scanner,
      scannerUid: target.uid,
      scanner: targetUser,
      preResolvedBusiness: null,
    });
    if (catalogHasOfferings(scannerCatalog)) {
      return {
        catalog: scannerCatalog,
        providerUser: scanner,
        customerUser: targetUser,
        customerUid: target.uid,
      };
    }
  }

  return {
    catalog: targetCatalog,
    providerUser: targetUser,
    customerUser: scanner,
    customerUid: scannerUser.uid,
  };
};

export default {
  loadConnectCatalog,
  resolveSmartQrPair,
  resolveBusinessPartyCatalog,
  classifyCatalogView,
};
