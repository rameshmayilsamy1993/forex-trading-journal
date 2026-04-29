const BiasEvent = require('./biasEvent.model');

const createEvent = async (req, res, next) => {
  try {
    const { pair, h1Cisd, h4Cisd, dailyCisd, notes, pairs: inputPairs } = req.body;

    const pairs = inputPairs && inputPairs.length > 0 ? inputPairs : (pair ? [pair] : []);
    
    if (pairs.length === 0) {
      return res.status(400).json({ message: 'Pair is required' });
    }

    const results = [];

    for (const pairName of pairs) {
      const h1 = h1Cisd || 'NEUTRAL';
      const h4 = h4Cisd || 'NEUTRAL';
      const daily = dailyCisd || 'NEUTRAL';

      // Get latest event for comparison
      const lastEvent = await BiasEvent.findOne({
        userId: req.session.userId,
        pair: pairName
      }).sort({ createdAt: -1 });

      const previousDaily = lastEvent?.dailyBias || 'NEUTRAL';
      const previousWeekly = lastEvent?.weeklyBias || 'NEUTRAL';
      const previousMonthly = lastEvent?.monthlyBias || 'NEUTRAL';

      // Derive 3-layer biases from CISD inputs
      // monthly = dailyCisd, weekly = h4Cisd, daily = h1Cisd
      const dailyBias = h1;
      const weeklyBias = h4;
      const monthlyBias = daily;

      // Detect shifts
      const dailyShifted = dailyBias !== previousDaily;
      const weeklyShifted = weeklyBias !== previousWeekly;
      const monthlyShifted = monthlyBias !== previousMonthly;

      // Create derivation explanations
      const createExplanation = (tf, derived, input) => 
        `${tf} Bias = ${derived} → Derived from ${input} CISD = ${derived}`;

      const derivation = {
        monthlyExplanation: createExplanation('Monthly', monthlyBias, 'Daily'),
        weeklyExplanation: createExplanation('Weekly', weeklyBias, 'H4'),
        dailyExplanation: createExplanation('Daily', dailyBias, 'H1'),
      };

      // Create new event (NOT overwrite)
      const biasEvent = new BiasEvent({
        userId: req.session.userId,
        pair: pairName,
        h1Cisd: h1,
        h4Cisd: h4,
        dailyCisd: daily,
        monthlyBias,
        weeklyBias,
        dailyBias,
        dailyShifted,
        weeklyShifted,
        monthlyShifted,
        previousDailyBias: previousDaily,
        previousWeeklyBias: previousWeekly,
        previousMonthlyBias: previousMonthly,
        derivation,
        notes: notes || ''
      });

      await biasEvent.save();
      results.push(biasEvent);
    }

    res.json(results.length === 1 ? results[0] : results);
  } catch (error) {
    next(error);
  }
};

const getEvents = async (req, res, next) => {
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

    const [events, total] = await Promise.all([
      BiasEvent.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      BiasEvent.countDocuments(filter)
    ]);

    res.json({
      events,
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

const getEventsByPair = async (req, res, next) => {
  try {
    const { pair } = req.params;
    
    if (!pair) {
      return res.status(400).json({ message: 'Pair is required' });
    }

    const events = await BiasEvent.find({
      userId: req.session.userId,
      pair: pair
    }).sort({ createdAt: 1 });

    res.json(events);
  } catch (error) {
    next(error);
  }
};

const getLatestEvents = async (req, res, next) => {
  try {
    const { pair } = req.query;
    
    const filter = { userId: req.session.userId };
    if (pair) filter.pair = pair;

    const events = await BiasEvent.find(filter)
      .sort({ createdAt: -1 })
      .limit(50);

    const latestByPair = {};
    for (const event of events) {
      if (!latestByPair[event.pair]) {
        latestByPair[event.pair] = event;
      }
    }

    res.json(Object.values(latestByPair));
  } catch (error) {
    next(error);
  }
};

const getTimeline = async (req, res, next) => {
  try {
    const { pair, date } = req.query;
    
    const filter = { userId: req.session.userId };
    
    if (pair) filter.pair = pair;
    if (date) {
      const targetDate = new Date(date);
      const nextDate = new Date(targetDate);
      nextDate.setDate(nextDate.getDate() + 1);
      
      filter.createdAt = {
        $gte: targetDate,
        $lt: nextDate
      };
    }

    const events = await BiasEvent.find(filter)
      .sort({ createdAt: 1 })
      .select('pair h1Cisd h4Cisd dailyCisd monthlyBias weeklyBias dailyBias h4Bias dailyShifted weeklyShifted monthlyShifted h4Shifted derivation notes createdAt');

    // Group by date for easier display
    const groupedByDate = {};
    for (const event of events) {
      const dateKey = event.createdAt.toISOString().split('T')[0];
      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = [];
      }
      groupedByDate[dateKey].push(event);
    }

    res.json({
      timeline: events,
      groupedByDate
    });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const event = await BiasEvent.findOneAndDelete({
      _id: req.params.id,
      userId: req.session.userId
    });

    if (!event) {
      return res.status(404).json({ message: 'Bias event not found' });
    }

    res.json({ message: 'Bias event deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { createEvent, getEvents, getEventsByPair, getLatestEvents, getTimeline, remove };