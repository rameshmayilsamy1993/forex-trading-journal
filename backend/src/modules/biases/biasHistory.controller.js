const BiasHistory = require('./biasHistory.model');

const saveBias = async (req, res, next) => {
  try {
    const { pair, date, h1Cisd, h4Cisd, dailyCisd, notes, pairs: inputPairs } = req.body;

    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const pairs = inputPairs && inputPairs.length > 0 ? inputPairs : (pair ? [pair] : []);
    
    if (pairs.length === 0) {
      return res.status(400).json({ message: 'Pair is required' });
    }

    const results = [];

    for (const pairName of pairs) {
      const h1 = h1Cisd || 'NEUTRAL';
      const h4 = h4Cisd || 'NEUTRAL';
      const daily = dailyCisd || 'NEUTRAL';

      const previousEntry = await BiasHistory.findOne({
        userId: req.session.userId,
        pair: pairName,
        date: { $lt: targetDate }
      }).sort({ date: -1 });

      const previousDaily = previousEntry?.dailyBias || 'NEUTRAL';
      const previousWeekly = previousEntry?.weeklyBias || 'NEUTRAL';
      const previousMonthly = previousEntry?.monthlyBias || 'NEUTRAL';

      const dailyBias = daily;
      const weeklyBias = h4;
      const monthlyBias = daily;

      const dailyShifted = dailyBias !== previousDaily;
      const weeklyShifted = weeklyBias !== previousWeekly;
      const monthlyShifted = monthlyBias !== previousMonthly;

      const biasEntry = await BiasHistory.findOneAndUpdate(
        {
          userId: req.session.userId,
          pair: pairName,
          date: targetDate
        },
        {
          h1Cisd: h1,
          h4Cisd: h4,
          dailyCisd: daily,
          dailyBias,
          weeklyBias,
          monthlyBias,
          dailyShifted,
          weeklyShifted,
          monthlyShifted,
          previousDailyBias: previousDaily,
          previousWeeklyBias: previousWeekly,
          previousMonthlyBias: previousMonthly,
          notes: notes || ''
        },
        { new: true, upsert: true, runValidators: true }
      );

      results.push(biasEntry);
    }

    res.json(results.length === 1 ? results[0] : results);
  } catch (error) {
    next(error);
  }
};

const getHistory = async (req, res, next) => {
  try {
    const { pair, startDate, endDate, page = 1, limit = 100 } = req.query;
    
    const filter = { userId: req.session.userId };
    
    if (pair) filter.pair = pair;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [entries, total] = await Promise.all([
      BiasHistory.find(filter)
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      BiasHistory.countDocuments(filter)
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

const getLatest = async (req, res, next) => {
  try {
    const { pair } = req.query;
    
    const filter = { userId: req.session.userId };
    if (pair) filter.pair = pair;

    const entries = await BiasHistory.find(filter)
      .sort({ date: -1 })
      .limit(50);

    const latestByPair = {};
    for (const entry of entries) {
      if (!latestByPair[entry.pair]) {
        latestByPair[entry.pair] = entry;
      }
    }

    res.json(Object.values(latestByPair));
  } catch (error) {
    next(error);
  }
};

const getByDate = async (req, res, next) => {
  try {
    const { date, pair } = req.query;
    
    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const filter = {
      userId: req.session.userId,
      date: targetDate
    };
    
    if (pair) filter.pair = pair;

    const entries = await BiasHistory.find(filter).sort({ pair: 1 });
    res.json(entries);
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const bias = await BiasHistory.findOneAndDelete({
      _id: req.params.id,
      userId: req.session.userId
    });

    if (!bias) {
      return res.status(404).json({ message: 'Bias entry not found' });
    }

    res.json({ message: 'Bias entry deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { saveBias, getHistory, getLatest, getByDate, remove };