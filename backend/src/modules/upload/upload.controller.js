const { upload, deleteImage } = require('../../config/cloudinary');

const uploadSingle = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No image file provided' });
  }
  res.json({
    url: req.file.path,
    publicId: req.file.filename,
    originalName: req.file.originalname
  });
};

const uploadMultiple = (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: 'No image files provided' });
  }
  const files = req.files.map(file => ({
    url: file.path,
    publicId: file.filename,
    originalName: file.originalname
  }));
  res.json(files);
};

const removeImage = async (req, res, next) => {
  try {
    await deleteImage(req.params.publicId);
    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { uploadSingle, uploadMultiple, removeImage, upload };
