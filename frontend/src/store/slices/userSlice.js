import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  name: '',
  avatar: '',
  engine: 'HIVE',
  role: '',
  accountType: 'public',
  setting: { shortcutKeys: { execute: 'Ctrl-Enter' }, saveTab: false }
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUserInfo: (state, action) => { return { ...state, ...action.payload }; },
    changeEngine: (state, action) => { state.engine = action.payload; }
  }
});

export const { setUserInfo, changeEngine } = userSlice.actions;
export default userSlice.reducer;
