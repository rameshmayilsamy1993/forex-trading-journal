const express = require('express');
const router = express.Router();
const { save, getAll, getByDate, remove } = require('./h4.controller');

router.post('/save', save);
router.get('/', getAll);
router.get('/by-date', getByDate);
router.delete('/:id', remove);

module.exports = router;