const express = require('express');
const router = express.Router();
const { uploadSingle, uploadMultiple, removeImage } = require('./upload.controller');
const { upload } = require('../../config/cloudinary');

router.post('/', upload.single('image'), uploadSingle);
router.post('/multiple', upload.array('images', 10), uploadMultiple);
router.delete('/:publicId', removeImage);

module.exports = router;
