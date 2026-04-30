import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  datasource: 'mysql',
  elementData: [],               // [{ database }]
  favoriteTreeData: [],
  tablesData: {},               // { database: [tableName1, tableName2, ...] }
  columnsData: {},              // { "database.tableName": [{ name, type }] }
  selectedTable: null,
};

const dataSlice = createSlice({
  name: 'data',
  initialState,
  reducers: {
    setDatasource: (state, action) => { state.datasource = action.payload; },
    setElementData: (state, action) => { state.elementData = action.payload; },
    setSelectedTable: (state, action) => { state.selectedTable = action.payload; },

    // 批量设置完整元数据（来自 /full-metadata）
    setFullMetadata: (state, action) => {
      const metadata = action.payload; // [{ name, tables: [{ name, columns }] }]
      const databases = metadata.map(db => ({ database: db.name }));
      const tablesData = {};
      const columnsData = {};
      for (const db of metadata) {
        const dbName = db.name;
        tablesData[dbName] = db.tables.map(t => t.name);
        for (const tbl of db.tables) {
          const key = `${dbName}.${tbl.name}`;
          columnsData[key] = tbl.columns;
        }
      }
      state.elementData = databases;
      state.tablesData = tablesData;
      state.columnsData = columnsData;
    },

    setTablesData: (state, action) => {
      const { database, tables } = action.payload;
      state.tablesData[database] = tables;
    },
    setColumnsData: (state, action) => {
      const { tableKey, columns } = action.payload;
      state.columnsData[tableKey] = columns;
    },
    clearTablesData: (state) => {
      state.tablesData = {};
      state.columnsData = {};
    }
  }
});

export const {
  setDatasource,
  setElementData,
  setSelectedTable,
  setFullMetadata,
  setTablesData,
  setColumnsData,
  clearTablesData
} = dataSlice.actions;

export default dataSlice.reducer;