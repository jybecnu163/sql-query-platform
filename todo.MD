项目功能模块清单
后端 (Backend)
✅ 基础框架：Express + CORS + body-parser
✅ MySQL 连接池配置 (mysql2)
✅ Hive 连接配置（node-jdbc 方案）
✅ 路由：/rest/table/* (元数据：库、表、列)
✅ 路由：/rest/query/* (提交、结果轮询、停止查询)
✅ 路由：/rest/file/* (保存/收藏 SQL)
✅ 路由：/rest/currentUser/* (用户信息、头像)
✅ 路由：/rest/enginerole (引擎角色)
✅ 路由：/ollama/* (AI 助手：模型列表、生成回答)

前端 (Frontend)
基础架构
✅ React + Redux Toolkit 初始化
✅ Material-UI 主题配置
✅ API 请求封装 (axios)
✅ Redux store 配置 (user, main, data, history, focusedTables)

核心 SQL 编辑器
✅ AceEditor 集成，MySQL 语法高亮
✅ SQL 格式化 (sql-formatter)
✅ 执行查询 (支持选中文本/光标所在语句/智能分号分割)
✅ 停止查询 (执行按钮动态切换为停止按钮)
✅ 快捷键 Ctrl+Enter 执行/停止
✅ 结果表格展示 (AG Grid，支持分页、排序)
✅ 查询结果导出为 CSV
✅ 自动补全增强：关键字、表名（从 Redux 读取）

数据源与资源树
✅ 数据源切换 (Hive/MySQL)
✅ 左侧资源树显示数据库列表
✅ 双击数据库展开表列表
✅ 双击表名：自动插入 SELECT * FROM ... + 关注表 + 缓存字段信息
✅ 表元数据存储到 Redux (tablesData, columnsData)

AI 助手
✅ AI 浮层 (右侧抽屉)
✅ 模型选择 (从 Ollama 获取)
✅ 多轮对话 (前端维护历史)
✅ 语音输入 (麦克风按钮)
✅ 双击 AI 回答中的 SQL 代码块，插入编辑器
✅ 关注表列表 (存储用户关注的表，供 AI 上下文使用)
✅ 删除单个关注表、清空全部
✅ AI 系统提示包含关注表的字段结构

其他功能
✅ 查询历史记录页面 (占位，待完善)
✅ 表详细信息查看 (分区/预览 - 部分实现)
✅ 保存/收藏 SQL (后端接口已就绪，前端未完整实现树形文件夹)
✅ 文件上传 (后端接口存在，前端未集成)

待完成/待完善 (Todo)
❌ sql语法错误等查询日志显示
❌ 查询状态和日志页
❌ 查询历史记录
❌ 收藏夹管理  
❌ 表详细信息展示、预览
❌ 用户设置弹窗 (快捷键、默认引擎等)
❌ 结果表格行列转置
❌ 下载文件权限申请弹窗 (后端已有接口)
❌ 错误消息统一处理 
❌ 代码编辑器主题切换
❌ 多标签页支持
❌ 生产环境构建优化