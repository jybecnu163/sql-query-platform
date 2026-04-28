import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Drawer, Box, Typography, Select, MenuItem, FormControl, InputLabel,
  TextField, IconButton, List, ListItem, ListItemText, CircularProgress, Divider
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import api from '../services/api';
import { appendSqlToCurrent } from '../store/slices/mainSlice';
import { clearAll, removeTable } from '../store/slices/focusedTablesSlice';
import MicIcon from '@mui/icons-material/Mic';      // 新增
import StopIcon from '@mui/icons-material/Stop';    // 新增
// // 检查浏览器是否支持语音识别
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const supportsSpeechRecognition = !!SpeechRecognition;

const AIAssistant = ({ open, onClose }) => {
  const dispatch = useDispatch();
  const datasource = useSelector(state => state.data.datasource);
  const focusedTables = useSelector(state => state.focusedTables.tables);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // 构建关注表的描述文本
  const buildSchemaText = () => {
    if (focusedTables.length === 0) {
      return '当前没有关注任何表。请双击左侧资源树中的表来添加关注。';
    }
    let text = `当前数据源: ${datasource.toUpperCase()}\n关注的表结构如下:\n`;
    for (const table of focusedTables) {
      text += `数据库: ${table.database}, 表: ${table.tableName}\n`;
      if (table.columns && table.columns.length) {
        text += `  字段: ${table.columns.map(c => `${c.name} (${c.type})`).join(', ')}\n`;
      } else {
        text += `  字段: 无字段信息\n`;
      }
    }
    return text;
  };

  // 获取模型列表
  useEffect(() => {
    if (open) {
      api.get('/rest/ollama/models')
        .then(res => {
          const modelList = res.data.models || [];
          setModels(modelList);
          if (modelList.length > 0 && !selectedModel) {
            setSelectedModel(modelList[0].name);
          }
        })
        .catch(err => console.error('获取模型列表失败:', err));
    }
  }, [open, selectedModel]);


  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  // 初始化语音识别
  useEffect(() => {
    if (!supportsSpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;      // 单次识别
    recognition.interimResults = false;  // 只返回最终结果
    recognition.lang = 'zh-CN';          // 中文
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev + transcript); // 追加到输入框
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error('语音识别错误:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  }, []);

  const toggleListening = () => {
    if (!supportsSpeechRecognition) {
      alert('您的浏览器不支持语音识别，请使用 Chrome 或 Edge');
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  // 清理
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // 构建对话上下文（包含历史消息）
    const history = [...messages, userMsg];
    let prompt = '';
    for (const msg of history) {
      if (msg.role === 'user') prompt += `用户: ${msg.content}\n`;
      else if (msg.role === 'assistant') prompt += `助手: ${msg.content}\n`;
    }
    prompt += '助手:';

    const systemPrompt = `你是一个 SQL 专家，帮助用户生成 SQL 查询语句。请用 \`\`\`sql ... \`\`\` 代码块输出 SQL。\n\n${buildSchemaText()}`;

    try {
      const response = await api.post('/rest/ollama/generate', {
        model: selectedModel,
        prompt: prompt,
        system: systemPrompt,
      });
      const aiContent = response.data.response;
      const assistantMsg = { role: 'assistant', content: aiContent };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error('AI 调用失败:', err);
      setMessages(prev => [...prev, { role: 'assistant', content: '抱歉，AI 服务暂时不可用，请稍后再试。' }]);
    } finally {
      setLoading(false);
    }
  };

  // 提取 SQL
  const extractSQL = (text) => {
    const codeBlockRegex = /```sql\n([\s\S]*?)\n```/i;
    const match = text.match(codeBlockRegex);
    if (match && match[1]) return match[1].trim();
    const sqlRegex = /(SELECT|INSERT|UPDATE|DELETE|WITH)[\s\S]*?(;|$)/i;
    const sqlMatch = text.match(sqlRegex);
    return sqlMatch ? sqlMatch[0].trim() : null;
  };

  const handleDoubleClick = (content) => {
    const sql = extractSQL(content);
    if (sql) {
      dispatch(appendSqlToCurrent(sql));
    }
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose} sx={{ '& .MuiDrawer-paper': { width: 400, p: 2 } }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">AI 助手</Typography>
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </Box>
      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
        <InputLabel>模型</InputLabel>
        <Select value={selectedModel} label="模型" onChange={(e) => setSelectedModel(e.target.value)}>
          {models.map(m => <MenuItem key={m.name} value={m.name}>{m.name}</MenuItem>)}
        </Select>
      </FormControl>

      <Divider sx={{ my: 1 }} />
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle2">关注表列表</Typography>
        <IconButton size="small" onClick={() => dispatch(clearAll())} title="清空全部">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
      <List dense>
        {focusedTables.map(table => (
          <ListItem key={`${table.database}.${table.tableName}`} sx={{ py: 0 }}>
            <ListItemText primary={`${table.database}.${table.tableName}`} secondary={table.columns ? `${table.columns.length} 个字段` : '加载中...'} />
            <IconButton edge="end" size="small" onClick={() => dispatch(removeTable({ database: table.database, tableName: table.tableName }))}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </ListItem>
        ))}
        {focusedTables.length === 0 && (
          <Typography variant="body2" color="textSecondary" sx={{ p: 1 }}>
            暂无关注表，请双击左侧资源树中的表添加。
          </Typography>
        )}
      </List>
      <Divider sx={{ my: 1 }} />

      <List sx={{ flexGrow: 1, overflow: 'auto', maxHeight: 'calc(100vh - 380px)', mt: 1 }}>
        {messages.map((msg, idx) => (
          <ListItem key={idx} alignItems="flex-start" sx={{ flexDirection: 'column', bgcolor: msg.role === 'user' ? '#f5f5f5' : 'white', borderRadius: 2, mb: 1 }}>
            <Typography variant="subtitle2" color="primary">{msg.role === 'user' ? '我' : 'AI'}</Typography>
            <ListItemText
              primary={msg.content.split('\n').map((line, i) => <span key={i}>{line}<br /></span>)}
              onDoubleClick={() => handleDoubleClick(msg.content)}
              sx={{ cursor: 'pointer', whiteSpace: 'pre-wrap' }}
            />
          </ListItem>
        ))}
        {loading && (
          <ListItem>
            <CircularProgress size={24} />
            <Typography variant="body2" sx={{ ml: 2 }}>AI 正在思考...</Typography>
          </ListItem>
        )}
        <div ref={messagesEndRef} />
      </List>

      <Box display="flex" gap={1} mt={2}>
        <TextField
          fullWidth
          size="small"
          variant="outlined"
          placeholder="输入问题或 SQL 需求..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          disabled={loading}
        />
        <IconButton
          color={isListening ? 'error' : 'primary'}
          onClick={toggleListening}
          disabled={loading}
        >
          {isListening ? <StopIcon /> : <MicIcon />}
        </IconButton>
        <IconButton color="primary" onClick={sendMessage} disabled={loading}>
          <SendIcon />
        </IconButton>
      </Box>
    </Drawer>
  );
};

export default AIAssistant;