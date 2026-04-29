const Liquidity = require('./liquidity.model');

const createOrUpdate = async (req, res, next) => {
  try {
    const { pair, monthlyLiquidity, weeklyLiquidity, dailyLiquidity, notes, pairs: inputPairs } = req.body;

    const pairs = inputPairs && inputPairs.length > 0 ? inputPairs : (pair ? [pair] : []);
    
    if (pairs.length === 0) {
      return res.status(400).json({ message: 'Pair is required' });
    }

    const results = [];

    for (const pairName of pairs) {
      const monthly = monthlyLiquidity || 'NONE';
      const weekly = weeklyLiquidity || 'NONE';
      const daily = dailyLiquidity || 'NONE';

      const monthlyInsight = getInsight('Monthly', monthly);
      const weeklyInsight = getInsight('Weekly', weekly);
      const dailyInsight = getInsight('Daily', daily);

      const liquidity = new Liquidity({
        userId: req.session.userId,
        pair: pairName,
        monthlyLiquidity: monthly,
        weeklyLiquidity: weekly,
        dailyLiquidity: daily,
        monthlyInsight,
        weeklyInsight,
        dailyInsight,
        notes: notes || ''
      });

      await liquidity.save();
      results.push(liquidity);
    }

    res.json(results.length === 1 ? results[0] : results);
  } catch (error) {
    next(error);
  }
};

const getInsight = (timeframe, liquidity) => {
  switch (liquidity) {
    case 'HIGH_TAKEN':
      return `${timeframe} High liquidity taken → Possible bearish reversal`;
    case 'LOW_TAKEN':
      return `${timeframe} Low liquidity taken → Possible bullish continuation`;
    case 'BOTH_TAKEN':
      return `${timeframe} Both highs & lows taken → High volatility expected`;
    default:
      return `${timeframe} No significant liquidity taken`;
  }
};

const getAll = async (req, res, next) => {
  try {
    const { pair, startDate, endDate, page = 1, limit = 50 } = req.query;
    
    const filter = { userId: req.session.userId };
    
    if (pair) filter.pair = pair;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [entries, total] = await Promise.all([
      Liquidity.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Liquidity.countDocuments(filter)
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

    const entries = await Liquidity.find(filter)
      .sort({ createdAt: -1 })
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

const remove = async (req, res, next) => {
  try {
    const liquidity = await Liquidity.findOneAndDelete({
      _id: req.params.id,
      userId: req.session.userId
    });

    if (!liquidity) {
      return res.status(404).json({ message: 'Liquidity entry not found' });
    }

    res.json({ message: 'Liquidity entry deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { createOrUpdate, getAll, getLatest, remove };