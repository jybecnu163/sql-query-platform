// routes\table.js

const express = require('express');
const router = express.Router();
const tableController = require('../controllers/tableController');

router.get('/showDatabases/:datasource', tableController.showDatabases);
router.get('/showTables/:datasource/:database', tableController.showTables);
router.get('/showColumns/:datasource/:database/:table', tableController.showColumns);
router.post('/saveonetable', tableController.saveOneTable);
router.post('/deleteSavetable', tableController.deleteSaveTable);
// 新增：获取完整元数据（含缓存）
router.get('/full-metadata/:datasource', tableController.getFullMetadata);

module.exports = router;