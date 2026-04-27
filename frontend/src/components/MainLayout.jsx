// src/components/MainLayout.jsx
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Box, AppBar, Toolbar, Typography, IconButton, Drawer, Select, MenuItem, FormControl } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SQLEditor from './SQLEditor';
import ResultTable from './ResultTable';
import ResourceTree from './ResourceTree';
import { setDatasource } from '../store/slices/dataSlice';
import { changeQuery } from '../store/slices/mainSlice';
import { DEFAULT_SQL } from '../constants/defaultSql';

const drawerWidth = 280;

export default function MainLayout() {
  const dispatch = useDispatch();
  const datasource = useSelector(state => state.data.datasource);
  const [drawerOpen, setDrawerOpen] = useState(true);

  // 当数据源切换时，将当前活动标签页的 SQL 改为对应默认值
  useEffect(() => {
    const defaultSql = DEFAULT_SQL[datasource];
    if (defaultSql) {
      dispatch(changeQuery(defaultSql));
    }
  }, [datasource, dispatch]);

  const handleDatasourceChange = (event) => {
    dispatch(setDatasource(event.target.value));
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppBar position="static" color="primary">
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => setDrawerOpen(!drawerOpen)}>
            <MenuIcon />
          </IconButton>
          <Typography
            variant="h6"
            sx={{ flexGrow: 1, cursor: 'pointer', userSelect: 'none' }}
            onClick={() => setDrawerOpen(!drawerOpen)}
          >
            SQL查询平台
          </Typography>
          <FormControl variant="standard" sx={{ minWidth: 120, color: 'white' }}>
            <Select
              value={datasource}
              onChange={handleDatasourceChange}
              sx={{ color: 'white', '& .MuiSvgIcon-root': { color: 'white' } }}
            >
              <MenuItem value="mysql">MySQL</MenuItem>
              <MenuItem value="hive">Hive</MenuItem>
            </Select>
          </FormControl>
        </Toolbar>
      </AppBar>
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Drawer variant="persistent" open={drawerOpen} sx={{ width: drawerWidth, flexShrink: 0, '& .MuiDrawer-paper': { width: drawerWidth, position: 'relative' } }}>
          <ResourceTree />
        </Drawer>
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', p: 2 }}>
          <SQLEditor />
          <ResultTable />
        </Box>
      </Box>
    </Box>
  );
}