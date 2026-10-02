import { configureStore, combineReducers, AnyAction } from "@reduxjs/toolkit";
import { systemReducer } from "@/features/system";
import { authReducer } from "@/features/auth";
import { stepsReducer } from "@/features/steps";
import { eventsReducer } from "@/features/events";
import { exploreReducer } from "@/features/explore";
import { gymBusinessReducer } from "@/features/gymBusiness";
import { managedEventsReducer } from "@/features/managedEvents";
import { stepRaceReducer } from "@/features/stepRace";
import { notificationsReducer } from "@/features/notifications";
import { userReducer } from "@/features/user";
import { paymentsReducer } from "@/features/payments";
import { permissionsReducer } from "@/features/permissions";
import { coreReducer } from "@/features/core";
import { connectReducer } from "@/features/connect";

const appReducer = combineReducers({
  system: systemReducer,
  auth: authReducer,
  steps: stepsReducer,
  events: eventsReducer,
  explore: exploreReducer,
  gymBusiness: gymBusinessReducer,
  managedEvents: managedEventsReducer,
  stepRace: stepRaceReducer,
  notifications: notificationsReducer,
  user: userReducer,
  payments: paymentsReducer,
  permissions: permissionsReducer,
  core: coreReducer,
  connect: connectReducer,
});


const rootReducer = (state: ReturnType<typeof appReducer> | undefined, action: AnyAction) => {
  if (action.type === "auth/clearAuth") {
    const systemState = state?.system;
    state = undefined;
    if (systemState) {
      state = { ...appReducer(undefined, action), system: systemState };
    }
  }
  return appReducer(state, action);
};

export const store = configureStore({
  reducer: rootReducer,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
