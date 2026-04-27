import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  tables: []  // 每个元素 { database, tableName, columns: [{ name, type }] }
};

const focusedTablesSlice = createSlice({
  name: 'focusedTables',
  initialState,
  reducers: {
    addTable: (state, action) => {
      const { database, tableName, columns } = action.payload;
      const exists = state.tables.some(t => t.database === database && t.tableName === tableName);
      if (!exists) {
        state.tables.push({ database, tableName, columns });
      }
    },
    removeTable: (state, action) => {
      const { database, tableName } = action.payload;
      state.tables = state.tables.filter(t => !(t.database === database && t.tableName === tableName));
    },
    clearAll: (state) => {
      state.tables = [];
    },
    updateColumns: (state, action) => {
      const { database, tableName, columns } = action.payload;
      const table = state.tables.find(t => t.database === database && t.tableName === tableName);
      if (table) table.columns = columns;
    }
  }
});

export const { addTable, removeTable, clearAll, updateColumns } = focusedTablesSlice.actions;
export default focusedTablesSlice.reducer;