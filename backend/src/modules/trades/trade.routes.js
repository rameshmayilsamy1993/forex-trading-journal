const express = require('express');
const router = express.Router();
const multer = require('multer');
const multerStorage = require('multer-storage-cloudinary');
const { getAll, create, update, remove, bulkDelete, upload } = require('./trade.controller');
const { previewImport, importTrades, convertMT5, importConverted } = require('./tradeImport.controller');

const memoryStorage = multer.memoryStorage();
const uploadExcel = multer({
  storage: memoryStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/octet-stream',
      'text/csv',
      'text/plain',
      'application/csv'
    ];
    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));

    if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) or CSV files (.csv) are allowed'));
    }
  }
});

const uploadCSV = multer({
  storage: memoryStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['text/csv', 'text/plain', 'application/csv', 'application/octet-stream'];
    const allowedExtensions = ['.csv'];
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));

    if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files (.csv) are allowed'));
    }
  }
});

router.get('/', getAll);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);
router.post('/bulk-delete', bulkDelete);
router.post('/preview', uploadExcel.single('file'), previewImport);
router.post('/import', uploadExcel.single('file'), importTrades);
router.post('/import-converted', importConverted);

module.exports = router;
