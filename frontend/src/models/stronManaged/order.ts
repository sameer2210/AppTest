export interface CreateParticipationOrderExtras {
  participantInfo?: { field: string; value: string }[];
  couponCode?: string | null;
}

export interface CreateParticipationOrderPayload {
  ticketTypeId: string;
  currentStepCount?: number;
  participantInfo?: { field: string; value: string }[];
  couponCode?: string;
}

export interface CreateParticipationOrderResultDto {
  free?: boolean;
  orderId: string | null;
  amount: number;
  currency: string;
  key: string;
  eventKey: string;
  ticketTypeId: string;
  breakdown?: Record<string, number>;
  participation?: Record<string, unknown> | null;
  ticketNumber?: string | null;
  couponCode?: string | null;
}

export interface CreateParticipationOrderResponse {
  success: boolean;
  free?: boolean;
  orderId?: string | null;
  amount: number;
  currency: string;
  key: string;
  eventKey: string;
  ticketTypeId: string;
  breakdown?: Record<string, number>;
  participation?: Record<string, unknown> | null;
  ticketNumber?: string | null;
  couponCode?: string | null;
  message?: string;
}

export interface ValidateRegistrationCouponResultDto {
  couponCode: string;
  discountRupees: number;
  discountPercent: number;
  breakdown?: Record<string, number>;
}

export interface ValidateRegistrationCouponResponse {
  success: boolean;
  couponCode?: string;
  discountRupees?: number;
  discountPercent?: number;
  breakdown?: Record<string, number>;
  message?: string;
}

export interface ParticipantInfoPrefillItem {
  field: string;
  value: string;
}

export interface ParticipantInfoPrefillResponse {
  success: boolean;
  participantInfo?: { field?: string; value?: string }[];
}
