import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  role: null, // 'child' | 'caregiver' | null
  band: 'young', // 'young' | 'older'
  isAuthenticated: false, // In Phase 1, we use mock auth
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setRoleAndBand: (state, action) => {
      state.role = action.payload.role;
      state.band = action.payload.band;
      state.isAuthenticated = true;
    },
    logout: (state) => {
      state.role = null;
      state.isAuthenticated = false;
    }
  }
});

export const { setRoleAndBand, logout } = authSlice.actions;
export default authSlice.reducer;
