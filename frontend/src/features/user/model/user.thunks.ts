import { createAsyncThunk } from "@reduxjs/toolkit";
import { UserApi } from "../api/user.api";
import { updateUser, signOutUser, setAuthenticatedUser, AuthApi } from "@/features/auth";
import type { RootState, AppDispatch } from "@/store/store";
import type { StronUser } from "@/models/user";
import { setUserProfile, setUserLoading, setUserError } from "./user.slice";

export const fetchUserProfile = createAsyncThunk<StronUser | null, string>(
  "user/fetchProfile",
  async (uid, { dispatch }) => {
    dispatch(setUserLoading(true));
    try {
      const profile = await UserApi.user.getUserProfile(uid);
      dispatch(setUserProfile(profile));
      return profile;
    } catch (err) {
      dispatch(setUserError(err instanceof Error ? err.message : "Failed to fetch profile"));
      return null;
    } finally {
      dispatch(setUserLoading(false));
    }
  },
);

export const updateUserStepGoal = createAsyncThunk<
  number,
  { uid: string; goal: number },
  { state: RootState }
>("user/updateStepGoal", async ({ uid, goal }, { getState, dispatch }) => {
  const authUser = (getState() as RootState).auth.user;
  if (!authUser) throw new Error("No authenticated user");
  const updated = await UserApi.user.updateProfile({ ...authUser, uid, stepGoal: goal });
  dispatch(updateUser({ stepGoal: updated.stepGoal }));
  return goal;
});

export const updateUserLocation = createAsyncThunk<
  { location: string; city: string | null; state: string | null },
  { uid: string; location: string; city: string | null; state: string | null },
  { state: RootState }
>("user/updateLocation", async ({ uid, location, city, state }, { getState, dispatch }) => {
  const authUser = (getState() as RootState).auth.user;
  if (!authUser) throw new Error("No authenticated user");
  const updated = await UserApi.user.updateProfile({
    ...authUser,
    uid,
    location,
    city,
    state,
  });
  dispatch(
    updateUser({
      location: updated.location ?? location,
      city: updated.city ?? city,
      state: updated.state ?? state,
    }),
  );
  return {
    location: updated.location ?? location,
    city: updated.city ?? city,
    state: updated.state ?? state,
  };
});

export const deleteUserAccount = createAsyncThunk<
  void,
  string,
  { dispatch: AppDispatch; state: RootState }
>("user/deleteAccount", async (uid, { dispatch }) => {
  await UserApi.user.deleteAccount(uid);
  void dispatch(signOutUser());
});

export const saveUserProfile = createAsyncThunk<
  StronUser,
  StronUser,
  { state: RootState; dispatch: AppDispatch }
>("user/saveProfile", async (payload, { dispatch }) => {
  await UserApi.user.updateProfile(payload);
  dispatch(setAuthenticatedUser(payload));
  await AuthApi.saveUserSession(payload);
  return payload;
});

export const submitUserFeedbackThunk = createAsyncThunk<
  void,
  { userId: string; isLiked: boolean; rating?: number; feedback?: string }
>("user/submitFeedback", async (payload) => {
  await UserApi.feedback.submitUserFeedback(payload);
});

