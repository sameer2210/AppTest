import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { StronUser } from "@/models/user";
import type { ActivityHistoryItem } from "@/models/activity";

export interface UserState {
  profile: StronUser | null;
  activityHistory: ActivityHistoryItem[];
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  profile: null,
  activityHistory: [],
  loading: false,
  error: null,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUserProfile(state, action: PayloadAction<StronUser | null>) {
      state.profile = action.payload;
    },
    setActivityHistory(state, action: PayloadAction<ActivityHistoryItem[]>) {
      state.activityHistory = action.payload;
    },
    setUserLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setUserError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
  },
});

export const {
  setUserProfile,
  setActivityHistory,
  setUserLoading,
  setUserError,
} = userSlice.actions;

export const selectUserProfile = (state: { user: UserState }) => state.user.profile;
export const selectUserActivityHistory = (state: { user: UserState }) => state.user.activityHistory;
export const selectUserLoading = (state: { user: UserState }) => state.user.loading;
export const selectUserError = (state: { user: UserState }) => state.user.error;

export default userSlice.reducer;
