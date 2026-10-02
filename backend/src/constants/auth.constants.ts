export const MAX_STEPS_PER_MINUTE = 200;
export const MIN_SYNC_INCREASE_GRACE = 2_500;
export const POISON_DEMOTE_STREAK = 3;
export const LOCAL_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const ALLOWED_PROFILE_UPDATE_FIELDS = new Set<string>([
  "username",
  "receiverName",
  "gender",
  "dob",
  "weight",
  "height",
  "location",
  "shortBio",
  "about",
  "address",
  "addressLine1",
  "city",
  "state",
  "pinCode",
  "profileImageUrl",
  "stepGoal",
  "timezone",
  "DST",
  "interestAreas",
  "bankName",
  "bankAccountNumber",
  "bankIfscCode",
  "onboardingRole",
  "onboardingBusinessName",
  "onboardingBusinessOffers",
  "onboardingBusinessFeatures",
  "lastKnownCountryCode",
  "lastKnownCountryUpdatedAt",
]);

export const APITXT_SEND_OTP_URL = "https://apitxt.com/api/sendOTP";
