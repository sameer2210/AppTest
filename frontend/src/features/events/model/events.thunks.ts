import { createAsyncThunk } from "@reduxjs/toolkit";
import { EventsApi } from "../api/events.api";
import { logError } from "@/config/devLogger";
import { setCatalog, setEventsLoading, setIsAdmin, setMyEnrollments } from "./events.slice";

/** Legacy `/api/events` catalog/enrollments removed — STRON catalog lives in Explore via StronManagedService. */
export const loadEventCatalog = createAsyncThunk<void, string>(
  "events/loadCatalog",
  async (uid, { dispatch }) => {
    dispatch(setEventsLoading(true));
    try {
      dispatch(setCatalog([]));
      dispatch(setMyEnrollments([]));
      try {
        const { data } = await EventsApi.apiClient.get<{ isAdmin?: boolean }>(`/api/user/is-admin/${uid}`);
        dispatch(setIsAdmin(data.isAdmin === true));
      } catch (error) {
        logError("loadEventCatalog admin check failed", error);
        dispatch(setIsAdmin(false));
      }
    } catch (error) {
      logError("loadEventCatalog failed", error);
    } finally {
      dispatch(setEventsLoading(false));
    }
  },
);
