const express = require('express');
const router = express.Router();
const { mysqlPool, executeHiveQuery } = require('../config/db');

// 获取数据库列表（按数据源类型）
router.get('/showDatabases/:datasource', async (req, res) => {
  const { datasource } = req.params;
  try {
    let data = [];
    if (datasource === 'mysql') {
      const [rows] = await mysqlPool.query('SHOW DATABASES');
      data = rows.map(row => ({ database: row.Database }));
      return res.json({ success: true, data });
    }
    else if (datasource === 'hive') {
      try {
        // 注意：此处需要 await，并且 executeHiveQuery 应返回可遍历的结果
        const resultSet = await executeHiveQuery('SHOW DATABASES');
        // 根据实际返回结构转换，假设 resultSet 是字符串，按行分割
        let databases = [];
        if (typeof resultSet === 'string') {
          databases = resultSet.split('\n')
            .filter(line => line.trim().length > 0)
            .map(db => ({ database: db.trim() }));
        } else if (Array.isArray(resultSet)) {
          databases = resultSet.map(item => ({ database: item.database_name || item[0] || item }));
        } else {
          console.warn('Unexpected result format:', resultSet);
        }
        return res.json({ success: true, data: databases });
      } catch (err) {
        console.error('Hive query failed:', err);
        return res.json({ success: false, msg: err.message, data: [] });
      }
    }
    else {
      return res.json({ success: true, data: [] });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, msg: err.message, data: [] });
  }
});

// 获取表列表
router.get('/showTables/:datasource/:database', async (req, res) => {
  const { datasource, database } = req.params;
  try {
    let data = [];
    if (datasource === 'mysql') {
      const [rows] = await mysqlPool.query('SHOW TABLES FROM ??', [database]);
      const key = `Tables_in_${database}`;
      data = rows.map(row => ({ table: row[key] }));
      return res.json({ success: true, data });
    }
    else if (datasource === 'hive') {
      try {
        await executeHiveQuery(`USE ${database}`);
        const resultSet = await executeHiveQuery('SHOW TABLES');
        let tables = [];
        if (typeof resultSet === 'string') {
          tables = resultSet.split('\n')
            .filter(line => line.trim().length > 0)
            .map(tbl => ({ table: tbl.trim() }));
        } else if (Array.isArray(resultSet)) {
          tables = resultSet.map(item => ({ table: item.tab_name || item[0] || item }));
        }
        return res.json({ success: true, data: tables });
      } catch (err) {
        console.error('Hive query failed:', err);
        return res.json({ success: false, msg: err.message, data: [] });
      }
    }
    else {
      return res.json({ success: true, data: [] });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, msg: err.message, data: [] });
  }
});

// 获取列信息
router.get('/showColumns/:datasource/:database/:table', async (req, res) => {
  const { datasource, database, table } = req.params;
  try {
    let data = [];
    if (datasource === 'mysql') {
      const [rows] = await mysqlPool.query('SHOW COLUMNS FROM ?? FROM ??', [table, database]);
      data = rows.map(row => ({ name: row.Field, type: row.Type }));
      return res.json({ success: true, data });
    }
    else if (datasource === 'hive') {
      try {
        await executeHiveQuery(`USE ${database}`);
        const resultSet = await executeHiveQuery(`DESCRIBE ${table}`);
        let columns = [];
        if (typeof resultSet === 'string') {
          const lines = resultSet.split('\n');
          for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 2 && !line.includes('#')) {
              columns.push({ name: parts[0], type: parts[1] });
            }
          }
        } else if (Array.isArray(resultSet)) {
          columns = resultSet.map(row => ({ name: row.col_name, type: row.data_type }));
        }
        return res.json({ success: true, data: columns });
      } catch (err) {
        console.error('Hive query failed:', err);
        return res.json({ success: false, msg: err.message, data: [] });
      }
    }
    else {
      return res.json({ success: true, data: [] });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, msg: err.message, data: [] });
  }
});

// 收藏相关接口保持原有模拟（可选）
router.post('/saveonetable', (req, res) => {
  res.json({ success: true, msg: '收藏成功' });
});
router.post('/deleteSavetable', (req, res) => {
  res.json({ success: true, msg: '取消收藏成功' });
});

module.exports = router;