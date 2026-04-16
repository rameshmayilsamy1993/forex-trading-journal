const express = require('express');
const router = express.Router();
const { getPairs, updatePairs, getAll, update } = require('./settings.controller');

router.get('/pairs', getPairs);
router.post('/pairs', updatePairs);
router.get('/', getAll);
router.post('/', update);

module.exports = router;
