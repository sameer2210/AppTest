import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { stronUserFromJson, StronUser } from "@/models/user";

export interface AuthState {
  isBootstrapped: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  user: StronUser | null;
  bootstrapError: string | null;
}

const initialState: AuthState = {
  isBootstrapped: false,
  isAuthenticated: false,
  isLoading: true,
  user: null,
  bootstrapError: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuthLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setAuthenticatedUser(state, action: PayloadAction<StronUser | null>) {
      state.user = action.payload ? (stronUserFromJson(action.payload) ?? action.payload) : null;
      state.isAuthenticated = !!state.user;
      state.isBootstrapped = true;
      state.isLoading = false;
      state.bootstrapError = null;
    },
    setBootstrapComplete(state) {
      state.isBootstrapped = true;
      state.isLoading = false;
    },
    setBootstrapError(state, action: PayloadAction<string | null>) {
      state.bootstrapError = action.payload;
      state.isBootstrapped = true;
      state.isLoading = false;
      state.isAuthenticated = false;
      state.user = null;
    },
    updateUser(state, action: PayloadAction<Partial<StronUser>>) {
      if (state.user) {
        state.user = stronUserFromJson({ ...state.user, ...action.payload }) ?? {
          ...state.user,
          ...action.payload,
        };
      }
    },
    clearAuth(state) {
      state.isAuthenticated = false;
      state.user = null;
      state.bootstrapError = null;
      state.isLoading = false;
      state.isBootstrapped = true;
    },
  },
});

export const {
  setAuthLoading,
  setAuthenticatedUser,
  setBootstrapComplete,
  setBootstrapError,
  updateUser,
  clearAuth,
} = authSlice.actions;

export default authSlice.reducer;

export const selectAuthUser = (state: { auth: AuthState }) => state.auth.user;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectAuthLoading = (state: { auth: AuthState }) => state.auth.isLoading;
export const selectAuthBootstrapped = (state: { auth: AuthState }) => state.auth.isBootstrapped;
