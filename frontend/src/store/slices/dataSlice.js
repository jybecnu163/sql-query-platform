// src/store/slices/dataSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  datasource: 'mysql',
  elementData: [],
  favoriteTreeData: [],
  tablesData: {},         // 存储每个数据库的表列表 { database: [ { table, ... } ] }
  selectedTable: null,
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
    setSelectedTable: (state, action) => {
      state.selectedTable = action.payload;
    },
    setTablesData: (state, action) => {
      const { database, tables } = action.payload;
      state.tablesData[database] = tables;
    },
    clearTablesData: (state) => {
      state.tablesData = {};
    }
  }
});

export const { setDatasource, setElementData, setSelectedTable, setTablesData, clearTablesData } = dataSlice.actions;
export default dataSlice.reducer;