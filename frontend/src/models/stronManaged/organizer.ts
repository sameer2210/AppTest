export interface UpsertOrganizerPayload {
  fullName?: string;
  brandName?: string;
  organizationName?: string;
  contactEmail?: string;
  contactPhone?: string;
  supportEmail?: string;
  supportPhone?: string;
  website?: string;
  instagram?: string;
  accountType?: "individual" | "team";
  mobileNumber?: string;
}

export interface StronOrganizerResponse {
  success: boolean;
  organizer: Record<string, unknown>;
}
