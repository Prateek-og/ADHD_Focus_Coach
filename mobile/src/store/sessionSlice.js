import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  fsmState: 'NO_SESSION', // NO_SESSION | INITIATED | ACTIVE | INACTIVE | BREAK | COMPLETED
  activeTaskId: null,
  items: [],      // Deque of task steps
  progress: 0,    // 0 to 1
  timeLeft: 0,    // Seconds left for current step
  totalTime: 0,   // Initial seconds for current step
  overtime: false,
  stuckReasons: [],
};

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    initiateSession: (state, action) => {
      state.fsmState = 'INITIATED';
      state.activeTaskId = action.payload.taskId;
      
      const totalSteps = action.payload.steps.length;
      const weight = 1 / totalSteps;
      
      state.items = action.payload.steps.map((s, i) => ({
        id: s.id || `s${i}`,
        text: s.t,
        min: s.m,
        weight: weight
      }));
      state.progress = 0;
      state.stuckReasons = [];
    },
    beginStep: (state) => {
      state.fsmState = 'ACTIVE';
      state.overtime = false;
      if (state.items.length > 0) {
        // We speed up time by 10x for testing/demo purposes if needed, 
        // but let's stick to standard math for now
        const seconds = Math.max(20, Math.round(state.items[0].min * 60));
        state.timeLeft = seconds;
        state.totalTime = seconds;
      }
    },
    tickTime: (state) => {
      if (state.fsmState !== 'ACTIVE') return;
      state.timeLeft -= 1;
      if (state.timeLeft <= 0 && !state.overtime) {
        state.overtime = true;
      }
    },
    completeStep: (state) => {
      if (state.items.length > 0) {
        const completedStep = state.items.shift();
        state.progress = Math.min(1, state.progress + completedStep.weight);
      }
      
      if (state.items.length === 0) {
        state.fsmState = 'COMPLETED';
      }
    },
    deferStep: (state) => {
      if (state.items.length > 1) {
        const step = state.items.shift();
        state.items.push(step);
      }
    },
    setFsmState: (state, action) => {
      state.fsmState = action.payload;
    },
    decomposeStep: (state) => {
      if (state.items.length > 0) {
        const step = state.items.shift();
        const halfWeight = step.weight / 2;
        const halfMin = Math.max(1, Math.round(step.min / 2));
        
        state.items.unshift(
          { id: step.id + 'a', text: step.text + ' — first half', min: halfMin, weight: halfWeight },
          { id: step.id + 'b', text: step.text + ' — second half', min: halfMin, weight: halfWeight }
        );
      }
    },
    refineStep: (state) => {
      if (state.items.length > 0) {
        state.items[0].text = 'Just start: ' + state.items[0].text.toLowerCase();
      }
    },
    addStuckReason: (state, action) => {
      state.stuckReasons.push(action.payload);
    },
    endSession: (state) => {
      return initialState;
    }
  }
});

export const { 
  initiateSession, 
  beginStep, 
  tickTime, 
  completeStep, 
  deferStep, 
  setFsmState,
  decomposeStep,
  refineStep,
  addStuckReason,
  endSession 
} = sessionSlice.actions;

export default sessionSlice.reducer;
