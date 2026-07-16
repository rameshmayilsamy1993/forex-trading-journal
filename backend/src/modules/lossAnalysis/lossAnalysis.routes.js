const express = require('express');
const router = express.Router();
const { create, getByTrade, update, getList, remove } = require('./lossAnalysis.controller');

router.get('/list', getList);
router.post('/', create);
router.get('/:tradeId', getByTrade);
router.put('/:id', update);
router.delete('/:id', remove);

module.exports = router;
