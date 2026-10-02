import { apiClient } from "../core/apiClient.service";

export type ConnectQrMe = {
  uid: string;
  username: string | null;
  profileImageUrl: string | null;
  displayCode: string;
  qrPayload: string;
  latestIncomingScan?: {
    scanId: string;
    scannerUid: string;
    scannerName: string;
    scannedAt: string;
    hasMultiple?: boolean;
    providerUid?: string;
    openExplore?: boolean;
    viewMode?: "explore" | "plans" | "listings" | "plans_and_listings";
    entityName?: string;
    businessId?: string | null;
    plansJson?: string | null;
    eventsJson?: string | null;
  } | null;
};

export type ConnectUserCard = {
  uid: string;
  username: string | null;
  profileImageUrl: string | null;
  displayCode: string | null;
};

export type ConnectScanResult =
  | {
      kind: "user_connect";
      scanId: string;
      targetUid?: string;
      providerUid?: string;
      customerUid?: string;
      /** True only for the customer device — providers must not open their own catalog after scanning a member. */
      openCatalogForScanner?: boolean;
      me?: ConnectUserCard;
      user: ConnectUserCard;
      provider?: ConnectUserCard;
      message: string;
      isSelfListing?: boolean;
      hasMultiple?: boolean;
      openExploreForScanner?: boolean;
      viewMode?: "explore" | "plans" | "listings" | "plans_and_listings";
      isProviderScan?: boolean;
      checkedIn?: boolean;
      alreadyCheckedIn?: boolean;
      entityName?: string;
      business?: {
        id: string;
        businessName: string;
        location?: string | null;
        logo?: string | null;
        services?: string[];
      } | null;
      member?: {
        id: string;
        name: string;
        status: string;
        hasActiveMembership: boolean;
        activePlanName?: string | null;
        activeMembershipEndDate?: string | null;
        alreadyCheckedInToday?: boolean;
      } | null;
      plans?: {
        id: string;
        businessId: string;
        name: string;
        billingText: string;
        price: string;
        isBought: boolean;
        isExpired?: boolean;
        tags: string[];
        actionText: string;
        billingCycle?: string | null;
        membershipId?: string;
        autoRenew?: boolean;
        endDate?: string;
        isFreeTrial?: boolean;
        isServiceTag?: boolean;
        trialDuration?: number;
        statusText?: string;
      }[];
      events?: {
        id: string;
        eventKey: string;
        title: string;
        subtitle: string;
        locationDetails: string;
        isEnrolled: boolean;
        isCheckedIn?: boolean;
        priceText?: string;
        format: string;
        bannerName?: string | null;
        listingType?: string;
        marathonMode?: string;
        destination?: string | null;
      }[];
      plansJson?: string;
      eventsJson?: string;
      organizerEvents?: {
        key: string;
        title: string;
        format?: string;
        status?: string;
        bannerName?: string | null;
        marathonMode?: string | null;
        destination?: string | null;
      }[];
    }
  | {
      kind: "event_check_in";
      alreadyCheckedIn: boolean;
      eventKey: string;
      eventTitle: string;
      ticketNumber: string | null;
      checkedInAt: string;
      participant: ConnectUserCard;
      message: string;
      hasMultiple?: false;
    }
  | {
      kind: "gym_check_in";
      alreadyCheckedIn: boolean;
      gymId?: string;
      gymName: string;
      checkedInAt: string;
      message: string;
      hasMultiple?: false;
    }
  | {
      kind: "station_check_in";
      alreadyCheckedIn: boolean;
      entityType: string;
      entityId: string;
      entityName: string;
      checkedInAt: string;
      message: string;
      hasMultiple?: false;
    }
  | {
      kind: "multi_selection";
      hasMultiple: true;
      multipleEnrollments?: boolean;
      entityName?: string;
      gymName?: string;
      plansJson?: string;
      eventsJson?: string;
    };

export type ConnectScanItem = {
  id: string;
  kind: string;
  createdAt: string;
  eventKey: string | null;
  ticketNumber: string | null;
  user: {
    uid: string;
    username: string;
    profileImageUrl: string | null;
  } | null;
};

export const ConnectQrService = {
  async getMyQr(refresh = false): Promise<ConnectQrMe> {
    const url = refresh ? "/api/stron/connect/me?refresh=true" : "/api/stron/connect/me";
    const { data } = await apiClient.get<{ success?: boolean; qr?: ConnectQrMe }>(url);
    if (!data?.qr?.qrPayload) {
      throw new Error("Could not load your connect QR.");
    }
    return data.qr;
  },

  async getTodayCheckIns(): Promise<ConnectScanItem[]> {
    try {
      const { data } = await apiClient.get<{ success?: boolean; scans?: ConnectScanItem[] }>(
        "/api/stron/connect/scans",
      );
      return data?.scans || [];
    } catch {
      return [];
    }
  },

  async getCatalog(opts: { scanId?: string; targetUid?: string; businessId?: string }): Promise<{
    scanId?: string | null;
    targetUid?: string;
    entityName: string;
    hasMultiple: boolean;
    business?: {
      id: string;
      businessName?: string;
      location?: string | null;
      logo?: string | null;
      services?: string[];
    } | null;
    plans: NonNullable<Extract<ConnectScanResult, { kind: "user_connect" }>["plans"]>;
    events: NonNullable<Extract<ConnectScanResult, { kind: "user_connect" }>["events"]>;
  }> {
    const { data } = await apiClient.get<{
      success?: boolean;
      catalog?: {
        scanId?: string | null;
        targetUid?: string;
        entityName: string;
        hasMultiple: boolean;
        business?: {
          id: string;
          businessName?: string;
          location?: string | null;
          logo?: string | null;
          services?: string[];
        } | null;
        plans?: Extract<ConnectScanResult, { kind: "user_connect" }>["plans"];
        events?: Extract<ConnectScanResult, { kind: "user_connect" }>["events"];
      };
      message?: string;
    }>("/api/stron/connect/catalog", { params: opts });
    if (!data?.catalog) {
      throw new Error(data?.message || "Could not load partner services.");
    }
    return {
      scanId: data.catalog.scanId,
      targetUid: data.catalog.targetUid,
      entityName: data.catalog.entityName,
      hasMultiple: Boolean(data.catalog.hasMultiple),
      business: data.catalog.business ?? null,
      plans: data.catalog.plans || [],
      events: data.catalog.events || [],
    };
  },

  async scan(payload: string): Promise<ConnectScanResult> {
    try {
      const { data } = await apiClient.post<{
        success?: boolean;
        result?: ConnectScanResult;
        message?: string;
      }>("/api/stron/connect/scan", { payload });
      if (!data?.result) {
        throw new Error(data?.message || "Scan failed.");
      }
      return data.result;
    } catch (error) {
      const axiosMessage = (error as { response?: { data?: { message?: string } } })?.response?.data
        ?.message;
      if (axiosMessage) throw new Error(axiosMessage);
      throw error instanceof Error ? error : new Error("Scan failed.");
    }
  },

  async checkIn({
    type,
    eventKey,
    businessId,
    planId,
    memberId,
  }: {
    type: "event" | "gym" | "plan";
    eventKey?: string;
    businessId?: string;
    planId?: string;
    memberId?: string;
  }): Promise<{
    success: boolean;
    kind: string;
    message: string;
    alreadyCheckedIn?: boolean;
    checkedInAt?: string;
    title?: string;
    gymName?: string;
  }> {
    try {
      const { data } = await apiClient.post<{
        success: boolean;
        kind: string;
        message: string;
        alreadyCheckedIn?: boolean;
        checkedInAt?: string;
        title?: string;
        gymName?: string;
      }>("/api/stron/connect/checkin", {
        type,
        eventKey,
        businessId,
        planId,
        memberId,
      });
      return data;
    } catch (error) {
      const axiosMessage = (error as { response?: { data?: { message?: string } } })?.response?.data
        ?.message;
      if (axiosMessage) throw new Error(axiosMessage);
      throw error instanceof Error ? error : new Error("Check-in failed.");
    }
  },
};
