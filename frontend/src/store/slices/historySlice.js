import { createSlice } from '@reduxjs/toolkit';
const initialState = { list: [], filterList: [], loading: false };
const historySlice = createSlice({
  name: 'history', initialState,
  reducers: {
    setHistoryList: (state, action) => { state.list = action.payload; state.filterList = action.payload; }
  }
});
export const { setHistoryList } = historySlice.actions;
export default historySlice.reducer;
