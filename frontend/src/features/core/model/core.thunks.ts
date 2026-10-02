import { createAsyncThunk } from "@reduxjs/toolkit";
import { CoreApi } from "../api/core.api";

/**
 * Named thunks for core feature I/O.
 * Screens/hooks dispatch these instead of calling CoreApi / services directly.
 */

export const evaluateAppBlockerThunk = createAsyncThunk(
  "core/evaluateAppBlocker",
  async () => CoreApi.remoteConfig.evaluateAppBlocker(),
);

export const initializeRemoteConfigThunk = createAsyncThunk(
  "core/initializeRemoteConfig",
  async () => CoreApi.remoteConfig.initializeRemoteConfig(),
);

export const uploadProfileImageThunk = createAsyncThunk(
  "core/uploadProfileImage",
  async ({ uri, publicId }: { uri: string; publicId?: string }) =>
    CoreApi.imageUpload.uploadProfileImage(uri, publicId),
);

export const uploadClanBannerThunk = createAsyncThunk(
  "core/uploadClanBanner",
  async ({ uri, publicId }: { uri: string; publicId?: string }) =>
    CoreApi.imageUpload.uploadClanBanner(uri, publicId),
);
