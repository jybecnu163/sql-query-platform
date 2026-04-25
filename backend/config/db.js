// backend/config/db.js
const mysql = require('mysql2');
// MySQL 连接池
const mysqlPool = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'pass',
    database: 'test',          // 默认数据库
    waitForConnections: true,
    connectionLimit: 10
}).promise();

// 在现有代码后添加
async function executeMySQLQuery(sql, database = 'test') {
    try {
        // 如果指定了数据库，先切换到该数据库
        if (database) {
            await mysqlPool.query(`USE ${database}`);
        }
        const [rows] = await mysqlPool.query(sql);
        return rows;
    } catch (err) {
        console.error('MySQL query error:', err);
        throw err;
    }
}

module.exports = { mysqlPool, executeHiveQuery, executeMySQLQuery };
// ========== 全局配置 ==========
const hive = require('hive-driver');
const { TCLIService, TCLIService_types } = hive.thrift;

// 根据你的Hive容器网络配置，修改host，例如 'host.docker.internal' 或 '192.168.x.x'
const host = 'localhost';
const port = 10000;
const username = 'root'; // 如需认证则填写
const password = ''; // 如需认证则填写

// 创建客户端
// const client = new hive.HiveClient(TCLIService, TCLIService_types);
// 定义 auth 为 NoSaslAuthentication
// const auth = new hive.auth.NoSaslAuthentication();
const auth = new hive.auth.PlainTcpAuthentication({ username: '1211', password: '1211' });

async function executeHiveQuery(query, database = 'default') {
     let client = null;
    let session = null;
    console.log('1. Starting Hive query...' + query);
    try {
        console.log('2. Connecting to Hive...');
        // 1. 连接到HiveServer2
          // 1. 创建新连接
        client = new hive.HiveClient(TCLIService, TCLIService_types);
        await client.connect(
            { host, port },
            new hive.connections.TcpConnection(),
            auth
        );
       
        console.log('3. Connected successfully.');
        console.log('4. Opening session...');
        // 2. 创建会话
          session = await client.openSession({
            client_protocol: TCLIService_types.TProtocolVersion.HIVE_CLI_SERVICE_PROTOCOL_V10
        });
        console.log('5. Session opened.');
        // 如果指定了 database，先执行 USE 语句
        if (database) {
            await session.executeStatement(`USE ${database}`);
        }

        // const query = 'SELECT * FROM test_part_table LIMIT 10'; // 确保表名存在且至少有一条数据
        console.log(`6. Executing statement: ${query}`);
        // 3. 执行查询（示例中为异步模式）
        const operation = await session.executeStatement(query);

        console.log('7. Waiting for results...');
        const utils = new hive.HiveUtils(TCLIService_types);
        // 4. 等待操作完成
        await utils.waitUntilReady(operation, false, () => { });

        // 5. 获取所有结果数据（关键：使用 utils.fetchAll）
        await utils.fetchAll(operation);

        console.log('8. Fetching all rows...');
        // 6. 获取并格式化结果（关键：使用 utils.getResult）
        const result = utils.getResult(operation).getValue();

        await operation.close();
        console.log('10. Done.');

        return result;
    } catch (error) {
        console.error('ERROR in queryHive:', error);
    } finally {
 // 5. 无论成功或失败，都关闭 session 和 client
        if (session) {
            try { await session.close(); } catch (e) { console.error('session close error', e); }
        }
        if (client) {
            try { await client.close(); } catch (e) { console.error('client close error', e); }
        }
    }
}


module.exports = { mysqlPool, executeHiveQuery, executeMySQLQuery };

