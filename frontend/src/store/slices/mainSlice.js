import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  querys: [
    {
      tabId: 1,
      name: '查询-1',
      sql: 'select * from test_part_table',
      tasks: [],
      activeTask: 0,
      isSaved: false,
      fileId: -1
    }
  ],
  activeIndex: 0,
  tabId: 1
};

const mainSlice = createSlice({
  name: 'main',
  initialState,
  reducers: {
    addQuery: (state) => {
      const newTabId = state.tabId + 1;
      state.querys.push({
        tabId: newTabId,
        name: `查询-${newTabId}`,
        sql: '',
        tasks: [],
        activeTask: 0,
        isSaved: false,
        fileId: -1
      });
      state.activeIndex = state.querys.length - 1;
      state.tabId = newTabId;
    },
    changeTab: (state, action) => { state.activeIndex = action.payload; },
    changeQuery: (state, action) => { state.querys[state.activeIndex].sql = action.payload; },

    executeQuerySuccess: (state, action) => {
      const { id, tabId, sql, engine, role } = action.payload;
      const query = state.querys.find(q => q.tabId === tabId);
      if (query) {
        query.tasks.push({
          id, name: `任务ID-${id}`, status: 'RUNNING', sql, engine, role, result: {}
        });
        query.activeTask = query.tasks.length - 1;
      }
    },
    updateTaskResult: (state, action) => {
      const { taskId, status, data, columnNames, log } = action.payload;
      const query = state.querys.find(q => q.tasks.some(t => t.id === taskId));
      if (query) {
        const task = query.tasks.find(t => t.id === taskId);
        if (task) {
          task.status = status;
          task.result = { tableData: data, columnNames, log };
        }
      }
    },
    appendSqlToCurrent: (state, action) => {
      const sqlToAppend = action.payload;
      const currentIndex = state.activeIndex;
      const currentSql = state.querys[currentIndex].sql || '';
      // 如果当前SQL不为空，先加换行，再追加新语句；否则直接设置
      const newSql = currentSql ? `${currentSql}\n\n${sqlToAppend}` : sqlToAppend;
      state.querys[currentIndex].sql = newSql;
    }

  }
});

export const { addQuery, changeTab, changeQuery, executeQuerySuccess,
  updateTaskResult, appendSqlToCurrent } = mainSlice.actions;
export default mainSlice.reducer;
