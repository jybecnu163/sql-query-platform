const express = require('express');
const router = express.Router();

router.get('/avatar', (req, res) => {
  res.json({ success: true, data: { url: 'https://via.placeholder.com/32' } });
});

router.get('/employeeCnName', (req, res) => {
  res.json({ success: true, data: '测试用户' });
});

router.get('/role_bind_host', (req, res) => {
  res.json({ success: true, data: 'http://localhost:3001' });
});

module.exports = router;
