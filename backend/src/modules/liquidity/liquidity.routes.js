const express = require('express');
const router = express.Router();
const { createOrUpdate, getAll, getLatest, remove } = require('./liquidity.controller');

router.post('/save', createOrUpdate);
router.get('/', getAll);
router.get('/latest', getLatest);
router.delete('/:id', remove);

module.exports = router;