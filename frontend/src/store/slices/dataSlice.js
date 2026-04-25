import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  datasource: 'mysql',   // 当前数据源: 'hive' 或 'mysql'
  elementData: [],
  favoriteTreeData: []
};

const dataSlice = createSlice({
  name: 'data',
  initialState,
  reducers: {
    setDatasource: (state, action) => {
      state.datasource = action.payload;
    },
    setElementData: (state, action) => {
      state.elementData = action.payload;
    }
  }
});

export const { setDatasource, setElementData } = dataSlice.actions;
export default dataSlice.reducer;