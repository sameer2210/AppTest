export type PurchasedPlan = {
  id: string;
  planId?: string | null;
  planName: string;
  price: number;
  billingCycle: "Monthly" | "Quarterly" | "Yearly" | "Weekly" | "One-time" | string;
  status: "ACTIVE" | "EXPIRED" | "CANCELLED" | "PENDING";
  startDate?: string | null;
  endDate?: string | null;
  autoRenew?: boolean;
  isFreeTrial?: boolean;
  perks?: string[];
  validityDays?: number | null;
  duration?: number;
  durationUnit?: string;
  trialDuration?: number;
  gym: {
    id?: string;
    name: string;
    phone: string;
    email: string;
    address?: string;
    mapLink?: string;
    coverImage?: string;
    avatarImage?: string;
    services?: string[];
    openingHours?: {
      day: string;
      opens: string;
      closes: string;
      isAvailable: boolean;
    }[];
  };
};
