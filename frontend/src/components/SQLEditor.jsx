import React, { useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-mysql';
import 'ace-builds/src-noconflict/theme-xcode';
import 'ace-builds/src-noconflict/ext-language_tools';
import { Button, Box } from '@mui/material';
import { format as sqlFormat } from 'sql-formatter';
import { changeQuery, executeQuerySuccess, updateTaskResult } from '../store/slices/mainSlice';
import api from '../services/api';


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

  const handleExecute = async () => {
    const editor = editorRef.current?.editor;
    if (!editor) return;

    // 1. 获取选中的文本
    let sqlToExecute = '';
    const selectedText = editor.getSelectedText();
    if (selectedText && selectedText.trim()) {
      sqlToExecute = selectedText;
    } else {
      // 2. 没有选中时，获取光标所在行的内容
      const cursor = editor.getCursorPosition();
      const session = editor.getSession();
      const line = session.getLine(cursor.row);
      sqlToExecute = line;

      // 如果当前行为空，则不做任何操作
      if (!sqlToExecute.trim()) {
        console.log('当前行为空，不执行');
        return;
      }
    }

    // 可选：去除末尾分号（后端也会处理，但保留也可）
    sqlToExecute = sqlToExecute.trim();
    if (sqlToExecute.endsWith(';')) {
      sqlToExecute = sqlToExecute.substring(0, sqlToExecute.length - 1);
    }


    try {
      const res = await api.post('/rest/query/submit', {
        hql: sqlToExecute,
        execMode: 'HIVE',
        roleName: 'default',
        isPersonal: false,
        datasource: datasource
      });
      if (res.data.success) {
        const { id } = res.data.data;
        dispatch(executeQuerySuccess({ id, tabId, sql: sqlToExecute, engine: datasource.toUpperCase(), role: 'default' }));
        pollResult(id, tabId);
      }
    } catch (err) {
      console.error(err);
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
        name: 'execute',
        bindKey: { win: 'Ctrl-Enter', mac: 'Command-Enter' },
        exec: handleExecute
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
        <Button variant="contained" color="primary" onClick={handleExecute}>
          执行 (Ctrl+Enter)
        </Button>
        <Button variant="contained" color="secondary" onClick={handleFormat}>
          格式化
        </Button>
      </Box>
    </Box>
  );
};

export default SQLEditor;