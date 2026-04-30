const tableModel = require('../models/tableModel');

// 将 Hive 的原始结果（字符串或数组）统一转换成 array
function normalizeHiveResult(resultSet, mapping) {
  let list = [];
  if (typeof resultSet === 'string') {
    list = resultSet.split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => line.trim());
  } else if (Array.isArray(resultSet)) {
    list = resultSet.map(row => (typeof row === 'object' ? (Object.values(row)[0] || '') : row));
  }
  return list.map(item => mapping(item));
}

// 获取数据库列表
exports.getDatabases = async (datasource) => {
  try {
    let data = [];
    if (datasource === 'mysql') {
      data = await tableModel.getMySQLDatabases();
    } else if (datasource === 'hive') {
      const raw = await tableModel.getHiveDatabases();
      data = normalizeHiveResult(raw, db => ({ database: db }));
    } else {
      data = [];
    }
    return { success: true, data };
  } catch (err) {
    console.error('getDatabases error:', err);
    return { success: false, msg: err.message, data: [] };
  }
};

// 获取表列表
exports.getTables = async (datasource, database) => {
  try {
    let data = [];
    if (datasource === 'mysql') {
      data = await tableModel.getMySQLTables(database);
    } else if (datasource === 'hive') {
      const raw = await tableModel.getHiveTables(database);
      data = normalizeHiveResult(raw, tbl => ({ table: tbl }));
    } else {
      data = [];
    }
    return { success: true, data };
  } catch (err) {
    console.error('getTables error:', err);
    return { success: false, msg: err.message, data: [] };
  }
};

// 获取列信息
exports.getColumns = async (datasource, database, table) => {
  try {
    let data = [];
    if (datasource === 'mysql') {
      data = await tableModel.getMySQLColumns(database, table);
    } else if (datasource === 'hive') {
      const raw = await tableModel.getHiveColumns(database, table);
      if (typeof raw === 'string') {
        data = raw.split('\n')
          .filter(line => line.trim().length > 0 && !line.includes('#'))
          .map(line => {
            const parts = line.trim().split(/\s+/);
            return parts.length >= 2 ? { name: parts[0], type: parts[1] } : null;
          })
          .filter(Boolean);
      } else if (Array.isArray(raw)) {
        data = raw.map(row => ({
          name: row.col_name || row[0],
          type: row.data_type || row[1]
        }));
      }
    } else {
      data = [];
    }
    return { success: true, data };
  } catch (err) {
    console.error('getColumns error:', err);
    return { success: false, msg: err.message, data: [] };
  }
};

// 收藏相关（模拟业务）
exports.saveOneTable = async (tableInfo) => {
  // 此处可加入数据库持久化逻辑
  return { success: true, msg: '收藏成功' };
};

exports.deleteSaveTable = async (tableInfo) => {
  return { success: true, msg: '取消收藏成功' };
};