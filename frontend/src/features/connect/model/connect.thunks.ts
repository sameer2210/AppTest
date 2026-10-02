import { createAsyncThunk } from "@reduxjs/toolkit";
import { ConnectApi } from "../api/connect.api";

/**
 * Named thunks for connect feature I/O.
 * Screens dispatch these instead of calling ConnectQrService / ConnectCheckInCatalogStore directly.
 */

export const scanConnectQr = createAsyncThunk(
  "connect/scanQr",
  async (qrPayload: string) => ConnectApi.qr.scan(qrPayload),
);

export const fetchConnectCatalog = createAsyncThunk(
  "connect/fetchCatalog",
  async (opts: { scanId?: string; targetUid?: string; businessId?: string }) =>
    ConnectApi.qr.getCatalog(opts),
);

export const getTodayCheckInsThunk = createAsyncThunk(
  "connect/getTodayCheckIns",
  async () => ConnectApi.qr.getTodayCheckIns(),
);

export const getMyQrThunk = createAsyncThunk(
  "connect/getMyQr",
  async (refresh?: boolean) => ConnectApi.qr.getMyQr(refresh),
);

export const setCheckInCatalogThunk = createAsyncThunk(
  "connect/setCheckInCatalog",
  async (payload: Parameters<typeof ConnectApi.catalog.set>[0]) => {
    ConnectApi.catalog.set(payload);
  },
);

export const takeCheckInCatalog = createAsyncThunk(
  "connect/takeCheckInCatalog",
  async () => ConnectApi.catalog.take(),
);

export const clearCheckInCatalog = createAsyncThunk(
  "connect/clearCheckInCatalog",
  async () => ConnectApi.catalog.clear(),
);
