import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  datasource: 'mysql',   // 当前数据源: 'hive' 或 'mysql'
  elementData: [],
  favoriteTreeData: [],
  selectedTable: null,  // 新增：{ database, table, columns? }
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
    },
    setSelectedTable: (state, action) => { state.selectedTable = action.payload; }  // 新增
  }
});

export const { setDatasource, setElementData } = dataSlice.actions;
export default dataSlice.reducer;