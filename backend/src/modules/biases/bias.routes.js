const express = require('express');
const router = express.Router();
const { getAll, upsert, remove } = require('./bias.controller');

router.get('/', getAll);
router.post('/manual', upsert);
router.put('/manual', upsert);
router.delete('/:id', remove);

module.exports = router;