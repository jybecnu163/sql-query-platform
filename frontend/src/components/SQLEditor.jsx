// src\components\SQLEditor.jsx
import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-mysql';
import 'ace-builds/src-noconflict/theme-xcode';
import 'ace-builds/src-noconflict/ext-language_tools';
import { Button, Box } from '@mui/material';
import { format as sqlFormat } from 'sql-formatter';
import { changeQuery, executeQuerySuccess, updateTaskResult } from '../store/slices/mainSlice';
import api from '../services/api';
import AIAssistant from './AIAssistant';  // 新增导入
import ace from 'ace-builds';
import 'ace-builds/src-noconflict/ext-language_tools';

const SQLEditor = () => {
  // 在组件内部
  const datasource = useSelector(state => state.data.datasource);
  const dispatch = useDispatch();
  const activeIndex = useSelector(state => state.main.activeIndex);
  const sql = useSelector(state => state.main.querys[activeIndex]?.sql || '');
  const tabId = useSelector(state => state.main.querys[activeIndex]?.tabId);
  const editorRef = useRef(null);
  const handleChange = (value) => {
    dispatch(changeQuery(value));
  };
  const [aiOpen, setAiOpen] = useState(false);  // 新增状态

  const handleExecuteOrStop = () => {
    if (isRunning) {
      handleStop();
    } else {
      handleExecute();
    }
  };


  // 在组件内部，获取当前活动任务是否正在运行
  const activeTask = useSelector(state => {
    const { querys, activeIndex } = state.main;
    const query = querys[activeIndex];
    if (query && query.tasks.length > 0) {
      return query.tasks[query.activeTask];
    }
    return null;
  });
  const isRunning = activeTask?.status === 'RUNNING';

  const handleStop = async () => {
    if (!activeTask?.id) return;
    try {
      await api.get(`/rest/query/stop/${activeTask.id}`);
      dispatch(updateTaskResult({
        taskId: activeTask.id,
        status: 'STOPPED',
        data: [],
        columnNames: [],
        log: ['查询已被用户停止']
      }));
    } catch (err) {
      console.error('停止失败:', err);
    }
  };

  // 智能提取 SQL 语句
  const handleExecute = useCallback(async () => {
    // 如果已在运行，不允许再次执行
    if (isRunning) return;
    const editor = editorRef.current?.editor;
    if (!editor) return;

    // 1. 优先检查是否有选中的文本
    let selectedText = editor.getSelectedText()?.trim();
    if (selectedText) {
      // 有选中文本，直接执行
      executeSql(selectedText);
      return;
    }

    // 无选中：基于光标位置提取完整 SQL 语句（以分号分隔）
    const session = editor.getSession();
    const fullText = session.getValue();
    const cursor = editor.getCursorPosition(); // { row, column }
    // 计算光标在全文中的字符索引
    let charIndex = 0;
    const lines = fullText.split('\n');
    for (let i = 0; i < cursor.row; i++) {
      charIndex += lines[i].length + 1; // +1 换行符
    }
    charIndex += cursor.column;

    // 查找前一个分号位置（语句开始）
    let start = 0;
    const lastSemicolon = fullText.lastIndexOf(';', charIndex - 1);
    if (lastSemicolon !== -1) {
      start = lastSemicolon + 1; // 分号后第一个字符
    }
    // 查找下一个分号位置（语句结束）
    let end = fullText.length;
    const nextSemicolon = fullText.indexOf(';', charIndex);
    if (nextSemicolon !== -1) {
      end = nextSemicolon; // 不包含分号
    }

    let sqlToExecute = fullText.substring(start, end).trim();
    if (!sqlToExecute) {
      // 如果提取为空，降级到光标所在行
      const currentLine = lines[cursor.row] || '';
      sqlToExecute = currentLine.trim();
      if (!sqlToExecute) {
        console.log('当前行无有效 SQL，不执行');
        return;
      }
    }

    // 可选：去除末尾分号（后端也会处理，但保留也可）
    sqlToExecute = sqlToExecute.trim();
    if (sqlToExecute.endsWith(';')) {
      sqlToExecute = sqlToExecute.substring(0, sqlToExecute.length - 1);
    }

    executeSql(sqlToExecute);
  }, [isRunning, /* 其他依赖 */]);


  // 在组件内，获取 Redux 中的表数据
  const tablesData = useSelector(state => state.data.tablesData);


  // 在编辑器初始化后，设置自定义补全
  const setupCompleters = async () => {
    if (!editorRef.current) return;
    const editor = editorRef.current.editor;
    const session = editor.getSession();
    const languageTools = ace.require('ace/ext/language_tools');

    // 从 Redux 中提取所有表名（去重）
    const allTables = [];
    Object.values(tablesData).forEach(tableList => {
      tableList.forEach(t => {
        if (!allTables.find(item => item.name === t.table)) {
          allTables.push({ name: t.table, type: 'table' });
        }
      });
    });

    const tableCompletions = allTables.map(t => ({
      caption: t.name,
      value: t.name,
      meta: 'table',
      score: 100
    }));

    // 静态关键字
    const staticKeywords = ['SELECT', 'FROM', 'WHERE', 'JOIN', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER', 'TABLE', 'DATABASE', 'VIEW', 'INDEX'];
    const staticCompletions = staticKeywords.map(kw => ({
      caption: kw,
      value: kw,
      meta: 'keyword',
      score: 200
    }));

    const completers = {
      getCompletions: (editor, session, pos, prefix, callback) => {
        const completions = [];
        if (prefix.length > 0) {
          staticCompletions.forEach(c => {
            if (c.value.toLowerCase().startsWith(prefix.toLowerCase())) completions.push(c);
          });
          tableCompletions.forEach(c => {
            if (c.value.toLowerCase().startsWith(prefix.toLowerCase())) completions.push(c);
          });
        }
        callback(null, completions);
      }
    };
    languageTools.setCompleters([completers]);
  };

  // 在 useEffect 中监听 tablesData 变化，重新设置补全（当表数据更新时）
  useEffect(() => {
    if (editorRef.current) {
      setupCompleters();
    }
  }, [tablesData, editorRef.current]); // 依赖 tablesData

  // 将执行逻辑抽取为独立函数，避免重复
  const executeSql = async (sql) => {
    try {
      const res = await api.post('/rest/query/submit', {
        hql: sql,
        execMode: 'HIVE',
        roleName: 'default',
        isPersonal: false,
        datasource: datasource
      });
      if (res.data.success) {
        const { id } = res.data.data;
        dispatch(executeQuerySuccess({ id, tabId, sql, engine: 'HIVE', role: 'default' }));
        pollResult(id, tabId);
      } else {
        console.error('提交失败:', res.data.msg);
        // 可添加用户提示
      }
    } catch (err) {
      console.error('执行请求失败:', err);
    }
  };

  const pollResult = async (queryId, tabId) => {
    const interval = setInterval(async () => {
      const res = await api.get(`/rest/query/result/${queryId}`);
      if (res.data.success) {
        const { currentStatus, data, columnNames, queryLog } = res.data.data;
        dispatch(updateTaskResult({ taskId: queryId, status: currentStatus, data, columnNames, log: queryLog }));
        if (['FINISHED', 'FAILED', 'STOPPED'].includes(currentStatus)) clearInterval(interval);
      }
    }, 1000);
  };

  const handleFormat = () => {
    const editor = editorRef.current?.editor;
    if (!editor) return;

    let selectedText = editor.getSelectedText();
    let range = editor.selection.getRange();
    let formatText = '';

    try {
      if (selectedText) {
        // 格式化选中的 SQL
        formatText = sqlFormat(selectedText, { language: 'mysql' });
        editor.session.replace(range, formatText);
      } else {
        // 格式化整个 SQL
        const fullSql = editor.getValue();
        formatText = sqlFormat(fullSql, { language: 'mysql' });
        editor.setValue(formatText);
        handleChange(formatText);
      }
    } catch (err) {
      console.error('SQL 格式化失败:', err);
      // 可弹出提示，例如使用 Material-UI Snackbar
      alert('SQL 语法错误，无法格式化');
    }
  };

  useEffect(() => {
    if (editorRef.current) {
      const editor = editorRef.current.editor;
      editor.commands.addCommand({
        name: 'executeOrStop',
        bindKey: { win: 'Ctrl-Enter', mac: 'Command-Enter' },
        exec: handleExecuteOrStop
      });
    }
  }, [handleExecute]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', mb: 2 }}>
      <AceEditor
        ref={editorRef}
        mode="mysql"
        theme="xcode"
        value={sql}
        onChange={handleChange}
        fontSize={14}
        width="100%"
        height="300px"
        setOptions={{ enableBasicAutocompletion: true, enableLiveAutocompletion: true }}
      />
      <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
        <Button variant="contained" color={isRunning ? "error" : "primary"} onClick={handleExecuteOrStop}>
          {isRunning ? "停止查询" : "执行 (Ctrl+Enter)"}
        </Button>
        <Button variant="contained" color="secondary" onClick={handleFormat}>
          格式化
        </Button>
        {/* 新增问 AI 按钮 */}
        <Button variant="contained" color="info" onClick={() => setAiOpen(true)}>
          问 AI
        </Button>
      </Box>
      {/* AI 助手浮层 */}
      <AIAssistant open={aiOpen} onClose={() => setAiOpen(false)} />
    </Box >
  );
};

export default SQLEditor;