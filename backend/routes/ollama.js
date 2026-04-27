const express = require('express');
const router = express.Router();

// 获取 Ollama 可用模型列表
router.get('/models', async (req, res) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`http://localhost:11434/api/tags`, {
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Ollama 返回错误: ${response.status}`);
    }
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Ollama 连接失败:', error);
    res.status(503).json({
      message: '无法连接到 Ollama 服务，请确保 Ollama 正在运行',
      error: error.message
    });
  }
});

// 生成回答（非流式，支持超时）
router.post('/generate', async (req, res) => {
  try {
    let { model, prompt, system, context } = req.body;
    console.info('/ollama/generate:', model, prompt, system, context);
    if (!model || !prompt) {
      return res.status(400).json({ message: '模型和提示词不能为空' });
    }

    // 限制 prompt 长度，避免过载
    if (prompt.length > 4000) {
      prompt = prompt.substring(0, 4000) + '…';
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000); // 60秒超时

    const response = await fetch(`http://localhost:11434/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        system: system || '你是一个 SQL 专家，帮助用户生成 SQL 查询语句。如果用户要求生成 SQL，请提供清晰的 SQL 代码块（用 ```sql ... ``` 包裹）。',
        stream: false,
        options: { num_predict: 2048, temperature: 0.7 },
        context: context || undefined
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Ollama API 错误: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    res.json({
      response: data.response,
      model: data.model,
      created_at: data.created_at,
      context: data.context  // 可选，用于 Ollama 原生多轮对话
    });
  } catch (error) {
    console.error('Ollama 生成失败:', error);
    if (error.name === 'AbortError') {
      res.status(504).json({ message: 'Ollama 响应超时，请重试' });
    } else {
      res.status(500).json({ message: 'AI 服务请求失败: ' + error.message });
    }
  }
});

module.exports = router;