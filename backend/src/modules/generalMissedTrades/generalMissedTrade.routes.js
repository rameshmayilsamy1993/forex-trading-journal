const express = require('express');
const router = express.Router();
const { getAll, getPaginated, create, update, remove } = require('./generalMissedTrade.controller');

router.get('/', getAll);
router.get('/paginated', getPaginated);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

module.exports = router;
