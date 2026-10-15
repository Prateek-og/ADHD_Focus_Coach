import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  childProfile: {
    name: 'Aarav',
    age: 8,
    klass: 'Class 3',
    description: 'Loves dogs. Gets stuck when a task feels big.'
  },
  preferences: ['Small steps', 'Encouragement'],
  points: 120,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    updateProfile: (state, action) => {
      state.childProfile = { ...state.childProfile, ...action.payload };
    },
    removePreference: (state, action) => {
      state.preferences = state.preferences.filter(p => p !== action.payload);
    },
    addPoints: (state, action) => {
      state.points += action.payload;
    }
  }
});

export const { updateProfile, removePreference, addPoints } = userSlice.actions;
export default userSlice.reducer;
