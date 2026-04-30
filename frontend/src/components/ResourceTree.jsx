import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { TreeView, TreeItem } from '@mui/lab';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import StorageIcon from '@mui/icons-material/Storage';
import TableChartIcon from '@mui/icons-material/TableChart';
import { Box, Typography, CircularProgress } from '@mui/material';
import api from '../services/api';
import { addTable } from '../store/slices/focusedTablesSlice';
import { appendSqlToCurrent } from '../store/slices/mainSlice';
import { setFullMetadata, setColumnsData, clearTablesData } from '../store/slices/dataSlice';

const ResourceTree = () => {
  const dispatch = useDispatch();
  const datasource = useSelector(state => state.data.datasource);
  const databases = useSelector(state => state.data.elementData);
  const tablesData = useSelector(state => state.data.tablesData);
  const columnsData = useSelector(state => state.data.columnsData); // 新增
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState([]);

  // 加载完整元数据（一次性获取所有库、表、字段）
  const loadFullMetadata = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/rest/table/full-metadata/${datasource}`);
      if (res.data.success) {
        dispatch(setFullMetadata(res.data.data));
      } else {
        console.error('获取完整元数据失败:', res.data.msg);
      }
    } catch (err) {
      console.error('请求完整元数据失败:', err);
    }
    setLoading(false);
  };

  // 切换数据源时重新加载
  useEffect(() => {
    loadFullMetadata();
    setExpanded([]);
    dispatch(clearTablesData());
  }, [datasource]);

  // 获取字段信息（用于双击表）
  const fetchTableColumns = async (dbName, tableName, colsData) => {
    const key = `${dbName}.${tableName}`;
    const existing = colsData[key];
    if (existing) return existing;
    try {
      const res = await api.get(`/rest/table/showColumns/${datasource}/${dbName}/${tableName}`);
      if (res.data.success) {
        dispatch(setColumnsData({ tableKey: key, columns: res.data.data }));
        return res.data.data;
      }
      return [];
    } catch (err) {
      console.error('获取字段失败:', err);
      return [];
    }
  };

  // 生成带别名和所有字段的 SELECT 语句
  const generateSelectSql = (dbName, tableName, columns) => {
    if (!columns || columns.length === 0) {
      return `SELECT * FROM ${dbName}.${tableName};`;
    }
    const alias = 'a';
    const fieldList = columns.map(col => `${alias}.${col.name}`).join(', ');
    return `SELECT ${fieldList} FROM ${dbName}.${tableName} AS ${alias};`;
  };

  // 双击表名
  const handleTableDoubleClick = async (dbName, tableName) => {
    const columns = await fetchTableColumns(dbName, tableName, columnsData);
 
    const selectSql = generateSelectSql(dbName, tableName, columns);
    dispatch(appendSqlToCurrent(selectSql));
    dispatch(addTable({ database: dbName, tableName, columns }));
    console.log(`已将 ${dbName}.${tableName} 添加到关注表列表并生成 SELECT`);
  };

  // 双击数据库：仅展开，无需额外加载（因为元数据已预先加载）
  const handleDoubleClick = (dbName) => {
    if (!expanded.includes(dbName)) {
      setExpanded(prev => [...prev, dbName]);
    }
  };

  const handleToggle = (event, nodeIds) => {
    setExpanded(nodeIds);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6">数据源 ({datasource.toUpperCase()})</Typography>
      <TreeView
        defaultCollapseIcon={<ExpandMoreIcon />}
        defaultExpandIcon={<ChevronRightIcon />}
        expanded={expanded}
        onNodeToggle={handleToggle}
      >
        {databases.map(db => (
          <TreeItem
            key={db.database}
            nodeId={db.database}
            label={db.database}
            icon={<StorageIcon />}
            onDoubleClick={() => handleDoubleClick(db.database)}
          >
            {(tablesData[db.database] || []).map(tableName => (
              <TreeItem
                key={tableName}
                nodeId={`${db.database}/${tableName}`}
                label={tableName}
                icon={<TableChartIcon />}
                onDoubleClick={() => handleTableDoubleClick(db.database, tableName)}
              />
            ))}
          </TreeItem>
        ))}
      </TreeView>
    </Box>
  );
};

export default ResourceTree;