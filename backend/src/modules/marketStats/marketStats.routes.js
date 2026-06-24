const express = require('express');
const router = express.Router();
const { analyze, exportResults } = require('./marketStats.controller');

router.post('/analyze', analyze);
router.get('/export', exportResults);

module.exports = router;
