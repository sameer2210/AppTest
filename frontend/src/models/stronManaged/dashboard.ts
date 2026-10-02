export type StronEventDashboard = {
  event: {
    key: string;
    title: string;
    format: string;
    status: string;
    capacity?: number | null;
    registrationCount?: number;
    soldOut?: boolean;
    startDate?: string | null;
    endDate?: string | null;
    registrationEndDate?: string | null;
  };
  ticketSales: {
    id: string;
    label: string;
    price: number;
    soldCount: number;
  }[];
  totals: {
    participantCount?: number;
    grossTicketSales?: number;
    totalPlatformCommission?: number;
    netPayable?: number;
  };
  recentRegistrations?: {
    id: string;
    uid: string;
    name: string;
    email?: string | null;
    contactNo?: string | null;
    avatarUri?: string | null;
    ticketLabel?: string | null;
    ticketNumber?: string | null;
    ticketPrice?: number;
    enrolledAt?: string | null;
    status?: string;
    qrCode?: string | null;
    participantInfo?: { field: string; value: string }[];
    couponCode?: string | null;
  }[];
};

export interface StronEventDashboardResponse {
  success: boolean;
  event: StronEventDashboard["event"];
  ticketSales: StronEventDashboard["ticketSales"];
  totals: StronEventDashboard["totals"];
  recentRegistrations?: StronEventDashboard["recentRegistrations"];
}
