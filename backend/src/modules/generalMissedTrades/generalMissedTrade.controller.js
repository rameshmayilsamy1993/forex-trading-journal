const GeneralMissedTrade = require('./generalMissedTrade.model');
const { SSMT_TYPES } = require('../trades/trade.model');
const { getCachedPairs } = require('../../services/tradeService');
const { sanitizeMissedReason } = require('../../services/sanitizeService');
const { deleteImage } = require('../../config/cloudinary');
const { paginate } = require('../../services/pagination');

const getAll = async (req, res, next) => {
  try {
    const { ssmtType, status, pair, type } = req.query;
    let filter = { userId: req.session.userId };
    if (ssmtType !== undefined && SSMT_TYPES.includes(ssmtType)) {
      filter.ssmtType = ssmtType;
    }
    if (status) filter.status = status;
    if (pair) filter.pair = pair;
    if (type) filter.type = type;

    const trades = await GeneralMissedTrade.find(filter)
      .sort({ entryDate: -1 });
    res.json(trades);
  } catch (error) {
    next(error);
  }
};

const getPaginated = async (req, res, next) => {
  try {
    const { cursor, limit, ssmtType, status, pair, type } = req.query;
    let filter = { userId: req.session.userId };
    if (ssmtType && SSMT_TYPES.includes(ssmtType)) filter.ssmtType = ssmtType;
    if (status) filter.status = status;
    if (pair) filter.pair = pair;
    if (type) filter.type = type;

    const result = await paginate(GeneralMissedTrade, filter, cursor || null, parseInt(limit) || 20, { sort: { entryDate: -1, _id: -1 } });
    res.json(result);
  } catch (error) { next(error); }
};

const create = async (req, res, next) => {
  try {
    const { reason, ssmtType, pair, profit, commission, swap, ...rest } = req.body;

    const sanitizedReason = sanitizeMissedReason(reason);
    if (!sanitizedReason) {
      return res.status(400).json({
        message: 'Reason is required and must be between 3-2000 characters'
      });
    }

    const allowedPairs = await getCachedPairs();
    const finalPair = allowedPairs.includes(pair) ? pair : null;
    if (!finalPair) {
      return res.status(400).json({
        message: `Invalid pair. Allowed pairs: ${allowedPairs.join(', ')}`
      });
    }

    const finalSsmtType = SSMT_TYPES.includes(ssmtType) ? ssmtType : 'NO';
    const finalProfit = Number(profit || 0);
    const finalCommission = Number(commission || 0);
    const finalSwap = Number(swap || 0);
    const finalRealPL = finalProfit - finalCommission - finalSwap;

    const missedTrade = new GeneralMissedTrade({
      ...rest,
      pair: finalPair,
      reason: sanitizedReason,
      ssmtType: finalSsmtType,
      profit: finalProfit,
      commission: finalCommission,
      swap: finalSwap,
      realPL: finalRealPL,
      userId: req.session.userId
    });

    const saved = await missedTrade.save();
    res.status(201).json(saved);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const { reason, ssmtType, profit, commission, swap, ...rest } = req.body;
    let updateData = { ...rest };

    if (reason !== undefined) {
      const sanitizedReason = sanitizeMissedReason(reason);
      if (!sanitizedReason) {
        return res.status(400).json({
          message: 'Reason must be between 3-2000 characters'
        });
      }
      updateData.reason = sanitizedReason;
    }

    if (ssmtType !== undefined) {
      updateData.ssmtType = SSMT_TYPES.includes(ssmtType) ? ssmtType : 'NO';
    }

    if (profit !== undefined || commission !== undefined || swap !== undefined) {
      const finalProfit = Number(profit ?? updateData.profit ?? 0);
      const finalCommission = Number(commission ?? updateData.commission ?? 0);
      const finalSwap = Number(swap ?? updateData.swap ?? 0);
      updateData.profit = finalProfit;
      updateData.commission = finalCommission;
      updateData.swap = finalSwap;
      updateData.realPL = finalProfit - finalCommission - finalSwap;
    }

    const missedTrade = await GeneralMissedTrade.findOneAndUpdate(
      { _id: req.params.id, userId: req.session.userId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!missedTrade) {
      return res.status(404).json({ message: 'Missed trade not found' });
    }

    res.json(missedTrade);
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const missedTrade = await GeneralMissedTrade.findOne({
      _id: req.params.id,
      userId: req.session.userId
    });
    if (!missedTrade) {
      return res.status(404).json({ message: 'Missed trade not found' });
    }

    if (missedTrade.beforeScreenshot || missedTrade.afterScreenshot) {
      const publicIdsToDelete = [];
      if (missedTrade.beforeScreenshot) {
        const urlParts = missedTrade.beforeScreenshot.split('/');
        const filename = urlParts[urlParts.length - 1];
        publicIdsToDelete.push(`fx-journal/${filename.split('.')[0]}`);
      }
      if (missedTrade.afterScreenshot) {
        const urlParts = missedTrade.afterScreenshot.split('/');
        const filename = urlParts[urlParts.length - 1];
        publicIdsToDelete.push(`fx-journal/${filename.split('.')[0]}`);
      }
      for (const publicId of publicIdsToDelete) {
        try { await deleteImage(publicId); } catch (err) { console.error('Error deleting image from Cloudinary:', err); }
      }
    }

    await GeneralMissedTrade.findByIdAndDelete(req.params.id);
    res.json({ message: 'Missed trade deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getPaginated, create, update, remove };
