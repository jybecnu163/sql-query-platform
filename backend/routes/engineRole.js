const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    success: true,
    data: [
      { engine: 'HIVE', role: ['hive_role'] },
      { engine: 'SPARK2', role: ['spark_role'] },
      { engine: 'PRESTO', role: ['presto_role'] }
    ]
  });
});

router.get('/default', (req, res) => {
  res.json({ success: true, data: 'HIVE' });
});

router.get('/userRule', (req, res) => {
  res.json({ success: true, data: 'all' });
});

module.exports = router;
