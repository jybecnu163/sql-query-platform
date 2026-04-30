const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { executeHiveQuery, executeMySQLQuery } = require('../config/db');
const router = express.Router();
const json2csv = require('json2csv').parse; // 需要安装: npm install json2csv
const tasks = new Map();

router.post('/submit', async (req, res) => {
  const { hql, datasource, execMode, roleName, isPersonal } = req.body;
  const queryId = Math.floor(Math.random() * 10000);

  // 根据数据源选择执行器
  let executeFunc;
  if (datasource === 'hive') {
    executeFunc = executeHiveQuery;
  } else {
    executeFunc = executeMySQLQuery;
  }

  // 存储任务初始状态
  tasks.set(queryId, {
    status: 'RUNNING',
    sql: hql,
    startTime: new Date(),
    log: [],
    datasource
  });

  // 异步执行真实查询
  executeFunc(hql).then(result => {
    // 模拟查询时间耗时10s
  setTimeout(() => { console.log("This is the final function") }, 5000);

    const task = tasks.get(queryId);
    if (task && task.status === 'RUNNING') {
      task.status = 'FINISHED';
      let columnNames = [];
      let rowsData = [];

      if (Array.isArray(result) && result.length > 0) {
        const firstRow = result[0];

        // 如果第一行是对象 (Hive Thrift 返回的典型格式)
        if (firstRow && typeof firstRow === 'object' && !Array.isArray(firstRow)) {
          columnNames = Object.keys(firstRow);
          rowsData = result.map(row => columnNames.map(col => row[col]));
        }
        // 如果第一行是数组 (MySQL 或其他)
        else if (Array.isArray(firstRow)) {
          // 数组中的元素是对象（极少数情况）
          if (firstRow.length > 0 && typeof firstRow[0] === 'object' && !Array.isArray(firstRow[0])) {
            columnNames = Object.keys(firstRow[0]);
            rowsData = result.map(row => columnNames.map(col => row[0][col]));
          } else {
            // 标准二维数组，生成默认列名 col_1, col_2...
            columnNames = firstRow.map((_, idx) => `col_${idx + 1}`);
            rowsData = result;
          }
        }
        // 单值数组（例如 ['a', 'b']）
        else {
          columnNames = ['value'];
          rowsData = result.map(v => [v]);
        }
      } else {
        rowsData = [];
      }

      task.resultData = rowsData;
      task.columnNames = columnNames;
      task.log = [
        `Query executed on ${datasource} successfully`,
        `Returned ${rowsData.length} rows`
      ];
      console.log(`[Task ${queryId}] columnNames:`, columnNames);
    }
  }).catch(err => {
    const task = tasks.get(queryId);
    if (task) {
      task.status = 'FAILED';
      task.log = [err.message || err.toString()];
    }
    console.error('Query execution error:', err);
  });

  res.json({ success: true, data: { id: queryId, sql: hql } });
});

router.get('/result/:queryId', (req, res) => {
  const queryId = parseInt(req.params.queryId);
  const task = tasks.get(queryId);
  if (!task) {
    return res.json({ success: false, msg: '任务不存在' });
  }

  res.json({
    success: true,
    data: {
      currentStatus: task.status,
      data: task.resultData || [],
      columnNames: task.columnNames || [],
      queryLog: task.log || []
    }
  });
});

router.get('/stop/:queryId', (req, res) => {
  const queryId = parseInt(req.params.queryId);
  const task = tasks.get(queryId);
  if (task && task.status === 'RUNNING') {
    task.status = 'STOPPED';
    // todo
    task.log.push('Query stopped by user');
  }
  res.json({ success: true });
});

// 导出结果为 CSV
router.get('/export/:queryId', async (req, res) => {
  const queryId = parseInt(req.params.queryId);
  const task = tasks.get(queryId);
  if (!task || task.status !== 'FINISHED') {
    return res.status(404).json({ success: false, message: '任务未完成或不存在' });
  }
  const { columnNames, resultData } = task;
  if (!columnNames || !resultData) {
    return res.status(400).json({ success: false, message: '无数据可导出' });
  }
  // 转换为对象数组
  const records = resultData.map(row => {
    const obj = {};
    columnNames.forEach((col, idx) => { obj[col] = row[idx]; });
    return obj;
  });
  try {
    const csv = json2csv(records, { fields: columnNames });
    res.setHeader('Content-disposition', `attachment; filename=query_${queryId}.csv`);
    res.setHeader('Content-type', 'text/csv');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
