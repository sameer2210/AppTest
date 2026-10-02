import type { StronMedalTier } from "./reward";

export interface ActivityTicketTypeDto {
  id?: string;
  label?: string;
  price?: number;
}

export interface MyActivityDto {
  id: string;
  role: "participant" | "organizer";
  eventKey: string;
  title: string;
  tag: string;
  format: string;
  eventStatus: string;
  participationStatus?: string | null;
  date: string;
  dateIso?: string | null;
  completedAt?: string | null;
  endDate?: string | null;
  bannerName?: string | null;
  listingType?: string | null;
  destination?: string | null;
  marathonMode?: "virtual" | "in_person" | string | null;
  startDate?: string | null;
  registrationCount?: number;
  totalEarnings?: number;
  ticketTypes?: ActivityTicketTypeDto[];
  actionLabel: string;
  iconCount: number;
  progressPercent?: number | null;
  progressLabel?: string | null;
  coveredSteps?: number | null;
  targetSteps?: number | null;
  successfulDays?: number | null;
  requiredDays?: number | null;
  dailyStepTarget?: number | null;
  totalWins?: number | null;
  totalKingSeconds?: number | null;
  kingTime?: string | null;
  resultRank?: number | null;
  rank?: number | null;
  ticketTypeId?: string | null;
  rewardKind?: "medal" | "certificate" | null;
  medalTier?: StronMedalTier | "gold" | "silver" | "bronze" | null;
  rewardFormat?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  organizerPhone?: string | null;
  organizerEmail?: string | null;
  supportPhone?: string | null;
  supportEmail?: string | null;
  contactNumber?: string | null;
  email?: string | null;
  phone?: string | null;
  organizerUid?: string | null;
  organizerId?: string | null;
  creatorUid?: string | null;
  creatorId?: string | null;
  userId?: string | null;
}

export interface MyActivityResponse {
  success: boolean;
  activity: MyActivityDto[];
}
