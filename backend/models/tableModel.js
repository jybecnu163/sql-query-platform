const { mysqlPool, executeHiveQuery } = require('../config/db');


// 获取 MySQL 所有数据库、表、字段（一次性）
async function getMySQLFullMetadata() {
  const sql = `
    SELECT 
      TABLE_SCHEMA AS \`db\`,
      TABLE_NAME AS \`table\`,
      COLUMN_NAME AS \`column\`,
      DATA_TYPE AS \`type\`
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
    ORDER BY \`db\`, \`table\`, ORDINAL_POSITION
  `;
  const [rows] = await mysqlPool.query(sql);
  return rows;
}


// 获取 MySQL 数据库列表
async function getMySQLDatabases() {
  const [rows] = await mysqlPool.query('SHOW DATABASES');
  return rows.map(row => ({ database: row.Database }));
}

// 获取 Hive 数据库列表
async function getHiveDatabases() {
  const resultSet = await executeHiveQuery('SHOW DATABASES');
  // 返回原始结果（字符串或数组），由服务层统一处理
  return resultSet;
}

// 获取 MySQL 表列表
async function getMySQLTables(database) {
  const [rows] = await mysqlPool.query('SHOW TABLES FROM ??', [database]);
  const key = `Tables_in_${database}`;
  return rows.map(row => ({ table: row[key] }));
}

// 获取 Hive 表列表
async function getHiveTables(database) {
  await executeHiveQuery(`USE ${database}`);
  const resultSet = await executeHiveQuery('SHOW TABLES');
  return resultSet; // 原始结果
}

// 获取 MySQL 列信息
async function getMySQLColumns(database, table) {
  const [rows] = await mysqlPool.query('SHOW COLUMNS FROM ?? FROM ??', [table, database]);
  return rows.map(row => ({ name: row.Field, type: row.Type }));
}

// 获取 Hive 列信息
async function getHiveColumns(database, table) {
  await executeHiveQuery(`USE ${database}`);
  const resultSet = await executeHiveQuery(`DESCRIBE ${table}`);
  return resultSet; // 原始结果
}

module.exports = {
  getMySQLDatabases,
  getHiveDatabases,
  getMySQLTables,
  getHiveTables,
  getMySQLColumns,
  getHiveColumns,
  getMySQLFullMetadata
};