import React from 'react';
import { useSelector } from 'react-redux';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { Box } from '@mui/material';

const ResultTable = () => {
  const activeIndex = useSelector(state => state.main.activeIndex);
  const tasks = useSelector(state => state.main.querys[activeIndex]?.tasks || []);
  const activeTask = useSelector(state => state.main.querys[activeIndex]?.activeTask);
  const task = tasks[activeTask];
  const { tableData = [], columnNames = [] } = task?.result || {};

  const columnDefs = columnNames.map(name => ({
    field: name,
    headerName: name,
    sortable: true,
    filter: true
  }));

  const rowData = tableData.map(row => {
    const obj = {};
    columnNames.forEach((name, idx) => { obj[name] = row[idx]; });
    return obj;
  });

  return (
    <Box sx={{ height: 400, width: '100%' }} className="ag-theme-alpine">
      <AgGridReact
        columnDefs={columnDefs}
        rowData={rowData}
        pagination={true}
        paginationPageSize={10}
      />
    </Box>
  );
};

export default ResultTable;
