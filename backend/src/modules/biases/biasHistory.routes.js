const express = require('express');
const router = express.Router();
const { saveBias, getHistory, getLatest, getByDate, remove } = require('./biasHistory.controller');

router.post('/save', saveBias);
router.get('/history', getHistory);
router.get('/latest', getLatest);
router.get('/by-date', getByDate);
router.delete('/:id', remove);

module.exports = router;