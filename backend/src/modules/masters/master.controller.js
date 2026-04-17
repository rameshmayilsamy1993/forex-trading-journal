const Master = require('./master.model');
const { seedMasters } = require('../../services/seedService');

const getAll = async (req, res, next) => {
  try {
    const { type } = req.query;
    let filter = { userId: req.session.userId };
    if (type) filter.type = type;

    let masters = await Master.find(filter);

    if (masters.length === 0) {
      await seedMasters(req.session.userId);
      masters = await Master.find(filter);
    }

    res.json(masters);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const master = new Master({ ...req.body, userId: req.session.userId });
    const savedMaster = await master.save();
    res.status(201).json(savedMaster);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const { name, type, checklist, isActive } = req.body;
    
    const master = await Master.findOneAndUpdate(
      { _id: req.params.id, userId: req.session.userId },
      { name, type, checklist, isActive },
      { new: true, runValidators: true }
    );
    
    if (!master) {
      return res.status(404).json({ message: 'Master entry not found' });
    }
    
    res.json(master);
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const master = await Master.findOneAndDelete({
      _id: req.params.id,
      userId: req.session.userId
    });
    if (!master) {
      return res.status(404).json({ message: 'Master entry not found' });
    }
    res.json({ message: 'Master entry deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, create, update, remove };
