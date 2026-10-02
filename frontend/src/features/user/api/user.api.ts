import { UserService } from "@/services/user/user.service";
import { submitUserFeedback } from "@/services/user/userFeedback.service";
import { InterestService } from "@/services/user/interest.service";
import {
  OpinionService,
  formatOpinionVoteLabel,
  type OpinionPollData,
  type OpinionOption,
  type OpinionFetchResult,
} from "@/services/opinion/opinion.service";

export const UserApi = {
  user: UserService,
  feedback: { submitUserFeedback },
  interest: InterestService,
  opinion: OpinionService,
};

export {
  UserService,
  InterestService,
  submitUserFeedback,
  OpinionService as OpinionApi,
  OpinionService,
  formatOpinionVoteLabel,
};
export type { OpinionPollData, OpinionOption, OpinionFetchResult };

export default UserApi;
