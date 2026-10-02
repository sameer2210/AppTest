import {
  analyticsApiService,
  businessApiService,
  couponApiService,
  memberApiService,
  membershipApiService,
  paymentApiService,
  payoutApiService,
  planApiService,
  proSubscriptionApiService,
} from "@/services/gym";
import { DEFAULT_ANALYTICS_DATA } from "@/services/gym/analytics.service";
import { apiClient } from "@/services/core/apiClient.service";
import { generateMemberWhatsAppText } from "@/services/gym/member.service";
import { AppInstallTracker } from "@/services/app/appInstallTracker.service";

export const GymBusinessApi = {
  businessApiService,
  planApiService,
  membershipApiService,
  memberApiService,
  paymentApiService,
  payoutApiService,
  analyticsApiService,
  couponApiService,
  proSubscriptionApiService,
  DEFAULT_ANALYTICS_DATA,
  AppInstallTracker,
  listMembersPreview: (limit = 100) => apiClient.get(`/api/v1/members?limit=${limit}`),
};

export {
  analyticsApiService,
  businessApiService,
  couponApiService,
  memberApiService,
  membershipApiService,
  paymentApiService,
  payoutApiService,
  planApiService,
  proSubscriptionApiService,
  DEFAULT_ANALYTICS_DATA,
  generateMemberWhatsAppText,
  AppInstallTracker,
};
export default GymBusinessApi;
