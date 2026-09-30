import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  tasks: [
    {
      id: '1',
      title: 'Tidy your room',
      desc: 'Before dinner',
      minutes: 15,
      at: '17:30',
      priority: 'Normal',
      recur: 'Daily',
      reward: '10 min game time',
      done: false,
      steps: [
        { id: 's1', t: 'Put dirty clothes in the hamper', m: 3 },
        { id: 's2', t: 'Clear off the desk', m: 4 },
        { id: 's3', t: 'Put books back on the shelf', m: 4 },
        { id: 's4', t: 'Make the bed', m: 4 }
      ]
    },
    {
      id: '2',
      title: 'Finish maths worksheet',
      desc: 'Questions 1 to 6',
      minutes: 20,
      at: '18:15',
      priority: 'High',
      recur: 'Weekdays',
      reward: '',
      done: false,
      steps: [
        { id: 's1', t: 'Get out the worksheet and a pencil', m: 2 },
        { id: 's2', t: 'Do questions 1 to 3', m: 8 },
        { id: 's3', t: 'Do questions 4 to 6', m: 8 },
        { id: 's4', t: 'Check the answers', m: 2 }
      ]
    }
  ],
  completedToday: 0,
  streak: 5,
};

const taskSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    markTaskDone: (state, action) => {
      const task = state.tasks.find(t => t.id === action.payload);
      if (task) {
        task.done = true;
        state.completedToday += 1;
      }
    },
    addTask: (state, action) => {
      state.tasks.push(action.payload);
    },
    deleteTask: (state, action) => {
      state.tasks = state.tasks.filter(t => t.id !== action.payload);
    }
  }
});

export const { markTaskDone, addTask, deleteTask } = taskSlice.actions;
export default taskSlice.reducer;
