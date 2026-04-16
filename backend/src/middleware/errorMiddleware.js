const errorMiddleware = (err, req, res, next) => {
  console.error('=== ERROR MIDDLEWARE ===');
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Validation error',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      message: 'Invalid ID format'
    });
  }

  if (err.code === 11000) {
    return res.status(400).json({
      message: 'Duplicate key error'
    });
  }

  res.status(err.status || 500).json({
    message: err.message || 'Internal server error'
  });
};

const notFoundMiddleware = (req, res, next) => {
  res.status(404).json({
    message: `Route ${req.originalUrl} not found`
  });
};

module.exports = { errorMiddleware, notFoundMiddleware };
