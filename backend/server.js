const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const tableRoutes = require('./routes/table');
const queryRoutes = require('./routes/query');
const fileRoutes = require('./routes/file');
const userRoutes = require('./routes/user');
const engineRoleRoutes = require('./routes/engineRole');

const app = express();
// 替换原有的 app.use(cors()) 为以下配置
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));

app.use(bodyParser.json());

// 模拟登录用户
app.use((req, res, next) => {
  req.user = { employeeId: 'testuser', name: '测试用户' };
  next();
});

app.use('/rest/table', tableRoutes);
app.use('/rest/query', queryRoutes);
app.use('/rest/file', fileRoutes);
app.use('/rest/currentUser', userRoutes);
app.use('/rest/enginerole', engineRoleRoutes);

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
