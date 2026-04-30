const tableService = require('../services/tableService');

exports.showDatabases = async (req, res, next) => {
  try {
    const { datasource } = req.params;
    const result = await tableService.getDatabases(datasource);
    res.json(result);
  } catch (err) {
    console.error('Controller error:', err);
    res.status(500).json({ success: false, msg: '服务器内部错误', data: [] });
  }
};

exports.showTables = async (req, res, next) => {
  try {
    const { datasource, database } = req.params;
    const result = await tableService.getTables(datasource, database);
    res.json(result);
  } catch (err) {
    console.error('Controller error:', err);
    res.status(500).json({ success: false, msg: '服务器内部错误', data: [] });
  }
};

exports.showColumns = async (req, res, next) => {
  try {
    const { datasource, database, table } = req.params;
    const result = await tableService.getColumns(datasource, database, table);
    res.json(result);
  } catch (err) {
    console.error('Controller error:', err);
    res.status(500).json({ success: false, msg: '服务器内部错误', data: [] });
  }
};

exports.saveOneTable = async (req, res, next) => {
  try {
    const result = await tableService.saveOneTable(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
};

exports.deleteSaveTable = async (req, res, next) => {
  try {
    const result = await tableService.deleteSaveTable(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
};