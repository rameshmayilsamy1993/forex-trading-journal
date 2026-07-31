const express = require('express');
const router = express.Router();
const reviewController = require('./saturdayReview.controller');
const eventController = require('./saturdayReviewEvent.controller');

router.get('/', reviewController.getAll);
router.post('/', reviewController.create);
router.get('/:id', reviewController.getById);
router.put('/:id', reviewController.update);
router.delete('/:id', reviewController.remove);

router.put('/:id/events/:eventType', eventController.upsert);
router.delete('/:id/events/:eventType', eventController.remove);

module.exports = router;
