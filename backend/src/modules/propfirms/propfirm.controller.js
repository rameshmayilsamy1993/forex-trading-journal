const PropFirm = require('./propfirm.model');
const { paginate } = require('../../services/pagination');

const getAll = async (req, res, next) => {
  try {
    const firms = await PropFirm.find({ userId: req.session.userId });
    res.json(firms);
  } catch (error) {
    next(error);
  }
};

const getPaginated = async (req, res, next) => {
  try {
    const { cursor, limit } = req.query;
    const result = await paginate(PropFirm, { userId: req.session.userId }, cursor || null, parseInt(limit) || 20);
    res.json(result);
  } catch (error) { next(error); }
};

const create = async (req, res, next) => {
  try {
    const firm = new PropFirm({ ...req.body, userId: req.session.userId });
    const savedFirm = await firm.save();
    res.status(201).json(savedFirm);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const firm = await PropFirm.findOneAndUpdate(
      { _id: req.params.id, userId: req.session.userId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!firm) {
      return res.status(404).json({ message: 'Prop firm not found' });
    }
    res.json(firm);
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const firm = await PropFirm.findOneAndDelete({
      _id: req.params.id,
      userId: req.session.userId
    });
    if (!firm) {
      return res.status(404).json({ message: 'Prop firm not found' });
    }
    res.json({ message: 'Prop firm deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getPaginated, create, update, remove };
