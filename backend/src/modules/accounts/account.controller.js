const Account = require('./account.model');

const getAll = async (req, res, next) => {
  try {
    const accounts = await Account.find({ userId: req.session.userId }).populate('propFirmId');
    res.json(accounts);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const account = new Account({ ...req.body, userId: req.session.userId });
    const savedAccount = await account.save();
    res.status(201).json(savedAccount);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const account = await Account.findOneAndUpdate(
      { _id: req.params.id, userId: req.session.userId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }
    res.json(account);
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const account = await Account.findOneAndDelete({
      _id: req.params.id,
      userId: req.session.userId
    });
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }
    res.json({ message: 'Account deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, create, update, remove };
