const tableModel = require('../models/tableModel');
const NodeCache = require('node-cache');
const metadataCache = new NodeCache({ stdTTL: 300, checkperiod: 60 }); // 5分钟缓存

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

/**
 * 获取 MySQL 完整元数据（所有数据库、表、字段）
 * 直接从 Model 层一次性获取，避免循环调用
 */
async function getMySQLFullMetadata() {
  const rows = await tableModel.getMySQLFullMetadata();
  // rows 应为 [{ db, table, column, type }] 结构，需要分组
  const map = new Map(); // db -> { name: db, tables: Map }
  for (const row of rows) {
    const { db, table, column, type } = row;
    if (!map.has(db)) {
      map.set(db, { name: db, tables: new Map() });
    }
    const dbObj = map.get(db);
    if (!dbObj.tables.has(table)) {
      dbObj.tables.set(table, { name: table, columns: [] });
    }
    const tableObj = dbObj.tables.get(table);
    tableObj.columns.push({ name: column, type });
  }
  // 转换为前端期望格式
  const result = [];
  for (const dbObj of map.values()) {
    result.push({
      name: dbObj.name,
      tables: Array.from(dbObj.tables.values()).map(tbl => ({
        name: tbl.name,
        columns: tbl.columns
      }))
    });
  }
  return result;
}

/**
 * 获取 Hive 完整元数据（所有数据库、表、字段）
 * Hive 无法一次性获取，需逐库查询，但数量少，可接受
 */
async function getHiveFullMetadata() {
  const databasesResult = await exports.getDatabases('hive');
  if (!databasesResult.success) throw new Error(databasesResult.msg);
  const databases = databasesResult.data.map(d => d.database);
  const result = [];
  for (const dbName of databases) {
    const tablesResult = await exports.getTables('hive', dbName);
    if (!tablesResult.success) continue;
    const tables = tablesResult.data.map(t => t.table);
    const dbObj = { name: dbName, tables: [] };
    for (const tableName of tables) {
      const columnsResult = await exports.getColumns('hive', dbName, tableName);
      if (columnsResult.success) {
        dbObj.tables.push({
          name: tableName,
          columns: columnsResult.data
        });
      } else {
        dbObj.tables.push({ name: tableName, columns: [] });
      }
    }
    result.push(dbObj);
  }
  return result;
}

/**
 * 获取完整元数据（带缓存）
 * @param {string} datasource 'mysql' 或 'hive'
 */
exports.getFullMetadata = async (datasource) => {
  const cacheKey = `full_metadata_${datasource}`;
  let data = metadataCache.get(cacheKey);
  if (data) {
    console.log(`[Cache hit] Returning cached metadata for ${datasource}`);
    return { success: true, data };
  }
  console.log(`[Cache miss] Fetching metadata for ${datasource} from database`);
  try {
    if (datasource === 'mysql') {
      data = await getMySQLFullMetadata();
    } else if (datasource === 'hive') {
      data = await getHiveFullMetadata();
    } else {
      return { success: false, msg: `Unsupported datasource: ${datasource}`, data: [] };
    }
    metadataCache.set(cacheKey, data);
    return { success: true, data };
  } catch (err) {
    console.error('getFullMetadata error:', err);
    return { success: false, msg: err.message, data: [] };
  }
};