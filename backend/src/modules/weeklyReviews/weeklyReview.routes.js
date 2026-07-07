const express = require('express');
const router = express.Router();
const reviewController = require('./weeklyReview.controller');
const entryController = require('./weeklyReviewEntry.controller');

router.get('/', reviewController.getAll);
router.get('/:id', reviewController.getById);
router.post('/', reviewController.create);
router.put('/:id', reviewController.update);
router.delete('/:id', reviewController.remove);

router.get('/:reviewId/entries', entryController.getAll);
router.post('/:reviewId/entries', entryController.create);
router.put('/:reviewId/entries/:entryId', entryController.update);
router.delete('/:reviewId/entries/:entryId', entryController.remove);

module.exports = router;
