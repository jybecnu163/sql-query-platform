const express = require('express');
const router = express.Router();

let sqlFiles = [
  { id: -1, name: '我的收藏', type: 'D', parentId: '#', content: '' },
  { id: 1, name: '查询用户', type: 'F', parentId: -1, content: 'SELECT * FROM user_info;' },
  { id: 2, name: '订单统计', type: 'F', parentId: -1, content: 'SELECT COUNT(*) FROM order_detail;' }
];

router.get('/getallfile', (req, res) => {
  res.json({ success: true, data: sqlFiles });
});

router.post('/saveonefile', (req, res) => {
  const { name, content, parentId } = req.body;
  const newId = Date.now();
  sqlFiles.push({
    id: newId,
    name,
    type: 'F',
    parentId,
    content
  });
  res.json({ success: true, data: newId });
});

router.post('/updateonefile', (req, res) => {
  const { id, content } = req.body;
  const file = sqlFiles.find(f => f.id === id);
  if (file) file.content = content;
  res.json({ success: true });
});

router.get('/getonefile/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const file = sqlFiles.find(f => f.id === id);
  res.json({ success: true, data: file || {} });
});

router.get('/deleteonefile/:id', (req, res) => {
  const id = parseInt(req.params.id);
  sqlFiles = sqlFiles.filter(f => f.id !== id);
  res.json({ success: true });
});

module.exports = router;
