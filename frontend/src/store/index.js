import { configureStore } from '@reduxjs/toolkit';
import userReducer from './slices/userSlice';
import mainReducer from './slices/mainSlice';
import dataReducer from './slices/dataSlice';
import historyReducer from './slices/historySlice';
import focusedTablesReducer from './slices/focusedTablesSlice';


export default configureStore({
  reducer: {
    user: userReducer,
    main: mainReducer,
    data: dataReducer,
    history: historyReducer,
    focusedTables: focusedTablesReducer
  }
});

window.addEventListener('error', (e) => {
  if (e.message === 'ResizeObserver loop completed with undelivered notifications.') {
    e.stopImmediatePropagation();
  }
});