const Settings = require('./settings.model');
const { getCachedPairs, invalidatePairCache } = require('../../services/tradeService');

const getPairs = async (req, res, next) => {
  try {
    const pairs = await getCachedPairs();
    res.json({ pairs });
  } catch (error) {
    next(error);
  }
};

const updatePairs = async (req, res, next) => {
  try {
    const { pairs } = req.body;

    if (!Array.isArray(pairs)) {
      return res.status(400).json({ message: 'Pairs must be an array' });
    }

    const cleanedPairs = pairs
      .map(p => String(p).trim().toUpperCase())
      .filter(p => p.length > 0)
      .filter((p, index, arr) => arr.indexOf(p) === index);

    if (cleanedPairs.length === 0) {
      return res.status(400).json({ message: 'At least one pair is required' });
    }

    const settings = await Settings.findOneAndUpdate(
      { key: 'pairs' },
      {
        key: 'pairs',
        value: cleanedPairs,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );

    invalidatePairCache();

    res.json({
      message: 'Pairs updated successfully',
      pairs: settings.value
    });
  } catch (error) {
    next(error);
  }
};

const getAll = async (req, res, next) => {
  try {
    const { key } = req.query;
    let settings;

    if (key) {
      settings = await Settings.findOne({ key });
    } else {
      settings = await Settings.find({});
    }

    res.json(settings || []);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const { key, value } = req.body;

    if (!key) {
      return res.status(400).json({ message: 'Key is required' });
    }

    const settings = await Settings.findOneAndUpdate(
      { key },
      { key, value, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    if (key === 'pairs') {
      invalidatePairCache();
    }

    res.json(settings);
  } catch (error) {
    next(error);
  }
};

module.exports = { getPairs, updatePairs, getAll, update };
