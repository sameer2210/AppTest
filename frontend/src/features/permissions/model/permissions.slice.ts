import { createSlice } from "@reduxjs/toolkit";

/**
 * Permissions feature slice — tracks which permission sheets have been
 * dismissed. Currently a placeholder; dismissal state is persisted via
 * AsyncStorage in the api layer.
 */
export interface PermissionsState {
  /** Reserved for future use. */
  _placeholder: boolean;
}

const initialState: PermissionsState = {
  _placeholder: false,
};

const permissionsSlice = createSlice({
  name: "permissions",
  initialState,
  reducers: {},
});

export default permissionsSlice.reducer;
