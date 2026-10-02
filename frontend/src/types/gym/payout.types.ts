export type PayoutAccountType = "SAVINGS" | "CURRENT";
export type PayoutVerificationStatus = "PENDING" | "VERIFIED" | "FAILED";

export interface PayoutAccountInfo {
  _id?: string;
  businessId?: string;
  accountHolderName: string;
  panNumber?: string;
  accountNumber?: string;
  maskedAccountNumber: string;
  ifsc: string;
  bankName: string;
  accountType: PayoutAccountType;
  verificationStatus: PayoutVerificationStatus;
  verificationMessage?: string;
  verifiedAt?: string | null;
}

export interface SavePayoutAccountInput {
  panNumber?: string;
  accountHolderName: string;
  accountNumber: string;
  confirmAccountNumber?: string;
  ifsc: string;
  bankName?: string;
  accountType: PayoutAccountType;
}
