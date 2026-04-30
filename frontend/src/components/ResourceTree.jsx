// src\components\ResourceTree.jsx
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { TreeView, TreeItem } from '@mui/lab';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import StorageIcon from '@mui/icons-material/Storage';
import TableChartIcon from '@mui/icons-material/TableChart';
import { Box, Typography, CircularProgress } from '@mui/material';
import api from '../services/api';
import { addTable } from '../store/slices/focusedTablesSlice'; // 导入 addTable
import { appendSqlToCurrent } from '../store/slices/mainSlice';
// 导入新的 action
import { setElementData, setTablesData, clearTablesData } from '../store/slices/dataSlice';


const ResourceTree = () => {
  const dispatch = useDispatch();
  const datasource = useSelector(state => state.data.datasource);
  const [databases, setDatabases] = useState([]);
  const [tables, setTables] = useState({});
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState([]); // 存储展开的库名

  useEffect(() => {
    fetchDatabases();
    setTables({});
    setExpanded([]);
  }, [datasource]);

  const fetchDatabases = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/rest/table/showDatabases/${datasource}`);
      if (res.data.success) {
        const dbList = Array.isArray(res.data.data) ? res.data.data : [];
        setDatabases(dbList);
        dispatch(setElementData(dbList));
      } else {
        console.error('后端返回失败:', res.data.msg);
        setDatabases([]);
      }
    } catch (err) {
      console.error('请求数据库列表失败:', err);
      setDatabases([]);
    }
    setLoading(false);
  };

  const fetchTables = async (dbName) => {
    if (tables[dbName]) return;
    try {
      const res = await api.get(`/rest/table/showTables/${datasource}/${dbName}`);
      if (res.data.success) {
        const tableList = Array.isArray(res.data.data) ? res.data.data : [];
        setTables(prev => ({ ...prev, [dbName]: tableList }));
        // 将表数据存入 Redux
        dispatch(setTablesData({ database: dbName, tables: tableList }));
      }
    } catch (err) {
      console.error(err);
      setTables(prev => ({ ...prev, [dbName]: [] }));
    }
  };

  // 在数据源切换时清空 Redux 中的表数据
  useEffect(() => {
    fetchDatabases();
    setTables({});
    setExpanded([]);
    dispatch(clearTablesData());  // 清空表数据
  }, [datasource, dispatch]);

  // 获取表字段信息（复用已有接口）
  const fetchTableColumns = async (datasource, database, tableName) => {
    try {
      const res = await api.get(`/rest/table/showColumns/${datasource}/${database}/${tableName}`);
      if (res.data.success) {
        return res.data.data; // [{ name, type }]
      }
      return [];
    } catch (err) {
      console.error('获取字段失败:', err);
      return [];
    }
  };

  // 处理双击：加载表数据并展开节点
  const handleDoubleClick = (dbName) => {
    fetchTables(dbName);
    // 如果当前节点不在展开列表中，则添加
    if (!expanded.includes(dbName)) {
      setExpanded(prev => [...prev, dbName]);
    }
  };

  // 处理展开/折叠（由 TreeView 控制）
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

  // 处理双击表名
  const handleTableDoubleClick = async (dbName, tableName) => {
    // 根据数据源拼接 SELECT 语句，格式：SELECT * FROM 库名.表名
    const selectSql = `SELECT * FROM ${dbName}.${tableName};`;
    dispatch(appendSqlToCurrent(selectSql));
    /** 上面双击添加语句到编写栏，下面为添加到关注列表，用于AI */
    // 获取字段信息
    const columns = await fetchTableColumns(datasource, dbName, tableName);
    // 添加到 Redux
    dispatch(addTable({ database: dbName, tableName, columns }));
    // 可选：提示用户已添加
    console.log(`已将 ${dbName}.${tableName} 添加到关注表列表`);
  };

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
            {tables[db.database]?.map(tbl => (
              <TreeItem
                key={tbl.table}
                nodeId={`${db.database}/${tbl.table}`}
                label={tbl.table}
                icon={<TableChartIcon />}
                onDoubleClick={() => handleTableDoubleClick(db.database, tbl.table)}
              />
            ))}

          </TreeItem>
        ))}
      </TreeView>
    </Box>
  );
};

export default ResourceTree;