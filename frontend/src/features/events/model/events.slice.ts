import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { EventCatalogItem, EventEnrollment } from "@/models/event";

export interface EventsState {
  catalog: EventCatalogItem[];
  myEnrollments: EventEnrollment[];
  selectedCity: string;
  isLoading: boolean;
  isAdmin: boolean;
}

const initialState: EventsState = {
  catalog: [],
  myEnrollments: [],
  selectedCity: "",
  isLoading: false,
  isAdmin: false,
};

const eventsSlice = createSlice({
  name: "events",
  initialState,
  reducers: {
    setCatalog(state, action: PayloadAction<EventCatalogItem[]>) {
      state.catalog = action.payload;
    },
    setMyEnrollments(state, action: PayloadAction<EventEnrollment[]>) {
      state.myEnrollments = action.payload;
    },
    setSelectedCity(state, action: PayloadAction<string>) {
      state.selectedCity = action.payload;
    },
    setEventsLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setIsAdmin(state, action: PayloadAction<boolean>) {
      state.isAdmin = action.payload;
    },
  },
});

export const { setCatalog, setMyEnrollments, setSelectedCity, setEventsLoading, setIsAdmin } =
  eventsSlice.actions;

export default eventsSlice.reducer;

export const selectEventCatalog = (state: { events: EventsState }) => state.events.catalog;
export const selectMyEnrollments = (state: { events: EventsState }) => state.events.myEnrollments;
export const selectSelectedCity = (state: { events: EventsState }) => state.events.selectedCity;
export const selectIsAdmin = (state: { events: EventsState }) => state.events.isAdmin;
export const selectEventsLoading = (state: { events: EventsState }) => state.events.isLoading;
