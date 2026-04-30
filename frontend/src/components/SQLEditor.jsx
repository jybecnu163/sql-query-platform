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
import AIAssistant from './AIAssistant';
import ace from 'ace-builds';

const SQLEditor = () => {
  const datasource = useSelector(state => state.data.datasource);
  const dispatch = useDispatch();
  const activeIndex = useSelector(state => state.main.activeIndex);
  const sql = useSelector(state => state.main.querys[activeIndex]?.sql || '');
  const tabId = useSelector(state => state.main.querys[activeIndex]?.tabId);
  const editorRef = useRef(null);
  const [aiOpen, setAiOpen] = useState(false);

  // 元数据
  const elementData = useSelector(state => state.data.elementData);   // [{ database }]
  const tablesData = useSelector(state => state.data.tablesData);     // { db: [tableName] }
  const columnsData = useSelector(state => state.data.columnsData);   // { "db.table": [{ name, type }] }

  // 任务状态
  const activeTask = useSelector(state => {
    const { querys, activeIndex } = state.main;
    const query = querys[activeIndex];
    if (query && query.tasks.length > 0) return query.tasks[query.activeTask];
    return null;
  });
  const isRunning = activeTask?.status === 'RUNNING';

  const handleChange = (value) => dispatch(changeQuery(value));

  // 停止查询
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

  // 执行 SQL
  const executeSql = async (sqlToExec) => {
    try {
      const res = await api.post('/rest/query/submit', {
        hql: sqlToExec,
        execMode: 'HIVE',
        roleName: 'default',
        isPersonal: false,
        datasource
      });
      if (res.data.success) {
        const { id } = res.data.data;
        dispatch(executeQuerySuccess({ id, tabId, sql: sqlToExec, engine: 'HIVE', role: 'default' }));
        pollResult(id, tabId);
      } else {
        console.error('提交失败:', res.data.msg);
        alert(`提交失败: ${res.data.msg}`);
      }
    } catch (err) {
      console.error('执行请求失败:', err);
      alert('执行请求失败，请检查后端服务');
    }
  };

  // 轮询结果
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

  // 智能提取 SQL 并执行
  const handleExecute = useCallback(async () => {
    if (isRunning) return;
    const editor = editorRef.current?.editor;
    if (!editor) return;

    let selectedText = editor.getSelectedText()?.trim();
    if (selectedText) {
      executeSql(selectedText);
      return;
    }

    const session = editor.getSession();
    const fullText = session.getValue();
    const cursor = editor.getCursorPosition();
    let charIndex = 0;
    const lines = fullText.split('\n');
    for (let i = 0; i < cursor.row; i++) charIndex += lines[i].length + 1;
    charIndex += cursor.column;

    let start = 0;
    const lastSemicolon = fullText.lastIndexOf(';', charIndex - 1);
    if (lastSemicolon !== -1) start = lastSemicolon + 1;
    let end = fullText.length;
    const nextSemicolon = fullText.indexOf(';', charIndex);
    if (nextSemicolon !== -1) end = nextSemicolon;

    let sqlToExecute = fullText.substring(start, end).trim();
    if (!sqlToExecute) {
      const currentLine = lines[cursor.row] || '';
      sqlToExecute = currentLine.trim();
    }
    if (sqlToExecute.endsWith(';')) sqlToExecute = sqlToExecute.slice(0, -1);
    if (!sqlToExecute) return;

    executeSql(sqlToExecute);
  }, [isRunning, tabId, datasource]);

  const handleExecuteOrStop = () => {
    if (isRunning) handleStop();
    else handleExecute();
  };

  // 格式化
  const handleFormat = () => {
    const editor = editorRef.current?.editor;
    if (!editor) return;
    const selectedText = editor.getSelectedText();
    try {
      if (selectedText) {
        const formatted = sqlFormat(selectedText, { language: 'mysql' });
        editor.session.replace(editor.selection.getRange(), formatted);
      } else {
        const fullSql = editor.getValue();
        const formatted = sqlFormat(fullSql, { language: 'mysql' });
        editor.setValue(formatted);
        handleChange(formatted);
      }
    } catch (err) {
      alert('SQL 语法错误，无法格式化');
    }
  };

  // ========== 辅助函数：获取当前语句（分号分隔）中已使用的别名 ==========
  const getUsedAliasesInCurrentStatement = (editor) => {
    const session = editor.getSession();
    const fullText = session.getValue();
    const cursor = editor.getCursorPosition();
    // 查找光标所在语句的范围
    let start = 0;
    const lastSemicolon = fullText.lastIndexOf(';', cursor.column - 1);
    if (lastSemicolon !== -1) start = lastSemicolon + 1;
    let end = fullText.length;
    const nextSemicolon = fullText.indexOf(';', cursor.column);
    if (nextSemicolon !== -1) end = nextSemicolon;
    const statement = fullText.substring(start, end);
    // 提取别名（支持 AS alias 和空格 alias）
    const used = new Set();
    const asRegex = /\bAS\s+([a-zA-Z0-9_]+)/gi;
    let match;
    while ((match = asRegex.exec(statement)) !== null) used.add(match[1]);
    const noAsRegex = /(?:FROM|JOIN)\s+[a-zA-Z0-9_\.]+\s+([a-zA-Z0-9_]+)(?!\s+AS\s+)/gi;
    while ((match = noAsRegex.exec(statement)) !== null) used.add(match[1]);
    return used;
  };

  const getNextAlias = (editor) => {
    const used = getUsedAliasesInCurrentStatement(editor);
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    for (let i = 0; i < letters.length; i++) {
      if (!used.has(letters[i])) return letters[i];
    }
    return 't';
  };

  // ========== 自定义补全器 ==========
  const setupCompleters = () => {
    if (!editorRef.current) return;
    const languageTools = ace.require('ace/ext/language_tools');

    const completers = {
      getCompletions: (editor, session, pos, prefix, callback) => {
        const completions = [];
        const line = session.getLine(pos.row);
        const beforeCursor = line.substring(0, pos.column);

        // 定义组别权重（用于排序）
        const groups = { table: 10, column: 20, database: 30, keyword: 100 };

        // 1. 库名补全（在 FROM, JOIN, USE, INTO 后）
        const dbMatch = beforeCursor.match(/(?:FROM|JOIN|USE|INTO)\s+(\w*)$/i);
        if (dbMatch) {
          const dbPrefix = dbMatch[1];
          const databases = elementData.map(db => db.database);
          databases.forEach(db => {
            if (dbPrefix.length === 0 || db.toLowerCase().startsWith(dbPrefix.toLowerCase())) {
              completions.push({
                caption: db,
                value: db,
                meta: 'database',
                score: groups.database,
                exec: (editor, cb) => {
                  const cursor = editor.getCursorPosition();
                  const line = editor.session.getLine(cursor.row);
                  let startCol = cursor.column;
                  while (startCol > 0 && /\w/.test(line[startCol - 1])) startCol--;
                  const range = new ace.Range(cursor.row, startCol, cursor.row, cursor.column);
                  const replacement = `${db}.`;
                  editor.session.replace(range, replacement);
                  setTimeout(() => editor.execCommand('startAutocomplete'), 10);
                  cb();
                }
              });
            }
          });
        }

        // 2. 表名补全：当光标前是“库名.”时触发
        const tableTrigger = beforeCursor.match(/([a-zA-Z0-9_]+)\.(\w*)$/);
        if (tableTrigger) {
          const dbName = tableTrigger[1];
          const tablePrefix = tableTrigger[2];
          const tables = tablesData[dbName] || [];
          tables.forEach(table => {
            if (tablePrefix.length === 0 || table.toLowerCase().startsWith(tablePrefix.toLowerCase())) {
              const nextAlias = getNextAlias(editor);
              completions.push({
                caption: table,
                value: table,
                meta: 'table',
                score: groups.table,
                exec: (editor, cb) => {
                  const cursor = editor.getCursorPosition();
                  const line = editor.session.getLine(cursor.row);
                  let startCol = cursor.column;
                  while (startCol > 0 && /\w/.test(line[startCol - 1])) startCol--;
                  const range = new ace.Range(cursor.row, startCol, cursor.row, cursor.column);
                  const replacement = `${table} AS ${nextAlias}`;
                  editor.session.replace(range, replacement);
                  cb();
                }
              });
            }
          });
        }

        // 3. 字段补全：当光标前是“表名.” 或 “别名.” 时触发
        const fieldTrigger = beforeCursor.match(/([a-zA-Z0-9_]+)\.(\w*)$/);
        if (fieldTrigger) {
          const identifier = fieldTrigger[1];
          const fieldPrefix = fieldTrigger[2];
          // 查找该标识符对应的表全名
          let tableFull = null;
          // 先尝试作为别名查找
          const fullText = session.getValue();
          const asRegex = new RegExp(`(?:FROM|JOIN)\\s+([a-zA-Z0-9_\\.]+)\\s+AS\\s+${identifier}\\b`, 'i');
          let match = asRegex.exec(fullText);
          if (match) {
            tableFull = match[1];
          } else {
            const noAsRegex = new RegExp(`(?:FROM|JOIN)\\s+([a-zA-Z0-9_\\.]+)\\s+${identifier}\\b(?!\\s+AS)`, 'i');
            match = noAsRegex.exec(fullText);
            if (match) tableFull = match[1];
          }
          // 若未找到别名，则直接认为 identifier 是不带库的表名，尝试查找
          if (!tableFull) {
            for (const key of Object.keys(columnsData)) {
              if (key.endsWith(`.${identifier}`)) {
                tableFull = key;
                break;
              }
            }
          }
          if (tableFull && columnsData[tableFull]) {
            columnsData[tableFull].forEach(col => {
              if (fieldPrefix.length === 0 || col.name.toLowerCase().startsWith(fieldPrefix.toLowerCase())) {
                completions.push({ caption: col.name, value: col.name, meta: 'column', score: groups.column });
              }
            });
          }
        }

        // 4. SQL 关键字补全（最后添加）
        const keywords = [
          'SELECT', 'FROM', 'WHERE', 'JOIN', 'INSERT', 'UPDATE', 'DELETE',
          'CREATE', 'DROP', 'ALTER', 'TABLE', 'VIEW', 'INDEX', 'AS', 'ON',
          'AND', 'OR', 'NOT', 'NULL', 'IS', 'LIKE', 'IN', 'BETWEEN', 'EXISTS',
          'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'ORDER', 'BY', 'GROUP', 'HAVING',
          'LIMIT', 'OFFSET', 'UNION', 'ALL', 'DISTINCT', 'USE', 'INTO'
        ];
        keywords.forEach(kw => {
          if (kw.toLowerCase().startsWith(prefix.toLowerCase())) {
            completions.push({ caption: kw, value: kw, meta: 'keyword', score: groups.keyword });
          }
        });

        // 按 score 升序排序（数值越小越靠前），元数据项在关键字之前
        completions.sort((a, b) => a.score - b.score);
        callback(null, completions);
      }
    };

    languageTools.setCompleters([completers]);
  };

  useEffect(() => {
    if (editorRef.current) setupCompleters();
  }, [elementData, tablesData, columnsData, editorRef.current]);

  useEffect(() => {
    if (editorRef.current) {
      const editor = editorRef.current.editor;
      editor.commands.addCommand({
        name: 'executeOrStop',
        bindKey: { win: 'Ctrl-Enter', mac: 'Command-Enter' },
        exec: handleExecuteOrStop
      });
    }
  }, [handleExecuteOrStop]);

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
        <Button variant="contained" color="secondary" onClick={handleFormat}>格式化</Button>
        <Button variant="contained" color="info" onClick={() => setAiOpen(true)}>问 AI</Button>
      </Box>
      <AIAssistant open={aiOpen} onClose={() => setAiOpen(false)} />
    </Box>
  );
};

export default SQLEditor;