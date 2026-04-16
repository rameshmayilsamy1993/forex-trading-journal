const express = require('express');
const router = express.Router();
const { exportTrades, exportMissedTrades } = require('./report.controller');

router.get('/trades', exportTrades);
router.get('/missed-trades', exportMissedTrades);

module.exports = router;
