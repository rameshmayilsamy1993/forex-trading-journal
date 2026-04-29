const H4 = require('./h4.model');

const save = async (req, res, next) => {
  try {
    const { pair, date, candles, notes } = req.body;

    if (!pair || !date || !candles || !Array.isArray(candles)) {
      return res.status(400).json({ message: 'Pair, date, and candles are required' });
    }

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const h4Entry = await H4.findOneAndUpdate(
      { userId: req.session.userId, pair, date: targetDate },
      { candles, notes: notes || '' },
      { new: true, upsert: true, runValidators: true }
    );

    res.json(h4Entry);
  } catch (error) {
    next(error);
  }
};

const getAll = async (req, res, next) => {
  try {
    const { pair, startDate, endDate, page = 1, limit = 50 } = req.query;
    
    const filter = { userId: req.session.userId };
    
    if (pair) filter.pair = pair;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [entries, total] = await Promise.all([
      H4.find(filter)
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      H4.countDocuments(filter)
    ]);

    res.json({
      entries,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

const getByDate = async (req, res, next) => {
  try {
    const { pair, date } = req.query;
    
    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const filter = { userId: req.session.userId, date: targetDate };
    if (pair) filter.pair = pair;

    const entries = await H4.find(filter).sort({ pair: 1 });
    res.json(entries);
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const h4 = await H4.findOneAndDelete({
      _id: req.params.id,
      userId: req.session.userId
    });

    if (!h4) {
      return res.status(404).json({ message: 'H4 entry not found' });
    }

    res.json({ message: 'H4 entry deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { save, getAll, getByDate, remove };