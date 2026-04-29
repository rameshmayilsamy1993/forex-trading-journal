const Bias = require('./bias.model');

const getAll = async (req, res, next) => {
  try {
    const biases = await Bias.find({ userId: req.session.userId }).sort({ pair: 1 });
    res.json(biases);
  } catch (error) {
    next(error);
  }
};

const upsert = async (req, res, next) => {
  try {
    const { pair, monthlyBias, weeklyBias, dailyBias, notes } = req.body;

    if (!pair) {
      return res.status(400).json({ message: 'Pair is required' });
    }

    const bias = await Bias.findOneAndUpdate(
      { userId: req.session.userId, pair },
      { monthlyBias, weeklyBias, dailyBias, notes },
      { new: true, upsert: true, runValidators: true }
    );

    res.json(bias);
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const bias = await Bias.findOneAndDelete({
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

module.exports = { getAll, upsert, remove };