const { Account, ACCOUNT_STATUS } = require('./account.model');
const Trade = require('../trades/trade.model').Trade;

const getAll = async (req, res, next) => {
  try {
    const { status } = req.query;
    let filter = { userId: req.session.userId };
    if (status) filter.status = status;
    const accounts = await Account.find(filter).populate('propFirmId');
    
    const accountsWithHelpers = accounts.map(account => {
      const accountObj = account.toObject();
      const tradableStatuses = ['ACTIVE', 'PASSED_1', 'PASSED_2', 'FUNDED'];
      return {
        ...accountObj,
        isActive: tradableStatuses.includes(account.status),
        canTrade: tradableStatuses.includes(account.status)
      };
    });
    
    res.json(accountsWithHelpers);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const account = new Account({ ...req.body, userId: req.session.userId, status: 'ACTIVE' });
    const savedAccount = await account.save();
    res.status(201).json(savedAccount);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const { status, ...rest } = req.body;
    const account = await Account.findOne({
      _id: req.params.id,
      userId: req.session.userId
    });

    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    if (status && status !== account.status) {
      if (!ACCOUNT_STATUS.includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }

      if (status === 'BREACHED' && account.status !== 'BREACHED') {
        rest.status = 'BREACHED';
        rest.breachedAt = new Date();
        await Trade.updateMany(
          { accountId: account._id, userId: req.session.userId },
          { isBreachedAccountTrade: true }
        );
      } else if (account.status === 'BREACHED' && status !== 'BREACHED') {
        return res.status(400).json({ message: 'Cannot change status from BREACHED to another status' });
      } else {
        rest.status = status;
      }
    }

    const updatedAccount = await Account.findOneAndUpdate(
      { _id: req.params.id, userId: req.session.userId },
      rest,
      { new: true, runValidators: true }
    );

    res.json(updatedAccount);
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
