const MissedTrade = require('./missedTrade.model');
const { Trade, SSMT_TYPES } = require('../trades/trade.model');
const { getCachedPairs } = require('../../services/tradeService');
const { sanitizeMissedReason } = require('../../services/sanitizeService');
const { deleteImage } = require('../../config/cloudinary');

const getAll = async (req, res, next) => {
  try {
    const { ssmtType } = req.query;
    let filter = { userId: req.session.userId };
    if (ssmtType !== undefined && SSMT_TYPES.includes(ssmtType)) {
      filter.ssmtType = ssmtType;
    }

    const missedTrades = await MissedTrade.find(filter)
      .sort({ date: -1 });
    res.json(missedTrades);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const { missedReason, reason, ssmtType, pair, profitLoss, commission, swap, ...rest } = req.body;

    const sanitizedReason = sanitizeMissedReason(missedReason || reason);

    if (!sanitizedReason) {
      return res.status(400).json({
        message: 'Missed reason is required and must be between 3-2000 characters'
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
    const finalProfitLoss = Number(profitLoss || 0);
    const finalCommission = Number(commission || 0);
    const finalSwap = Number(swap || 0);
    const finalRealPL = finalProfitLoss - finalCommission - finalSwap;

    const missedTrade = new MissedTrade({
      ...rest,
      pair: finalPair,
      reason: sanitizedReason,
      missedReason: sanitizedReason,
      ssmtType: finalSsmtType,
      profitLoss: finalProfitLoss,
      commission: finalCommission,
      swap: finalSwap,
      realPL: finalRealPL,
      userId: req.session.userId
    });

    const savedMissedTrade = await missedTrade.save();
    res.status(201).json(savedMissedTrade);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const { missedReason, reason, ssmtType, profitLoss, commission, swap, ...rest } = req.body;

    let updateData = { ...rest };

    if (missedReason !== undefined) {
      const sanitizedReason = sanitizeMissedReason(missedReason);

      if (!sanitizedReason) {
        return res.status(400).json({
          message: 'Missed reason must be between 10-2000 characters'
        });
      }

      updateData.reason = sanitizedReason;
      updateData.missedReason = sanitizedReason;
    }

    if (ssmtType !== undefined) {
      updateData.ssmtType = SSMT_TYPES.includes(ssmtType) ? ssmtType : 'NO';
    }

    if (profitLoss !== undefined || commission !== undefined || swap !== undefined) {
      const finalProfitLoss = Number(profitLoss ?? updateData.profitLoss ?? 0);
      const finalCommission = Number(commission ?? updateData.commission ?? 0);
      const finalSwap = Number(swap ?? updateData.swap ?? 0);
      updateData.profitLoss = finalProfitLoss;
      updateData.commission = finalCommission;
      updateData.swap = finalSwap;
      updateData.realPL = finalProfitLoss - finalCommission - finalSwap;
    }

    const missedTrade = await MissedTrade.findOneAndUpdate(
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
    const missedTrade = await MissedTrade.findOne({
      _id: req.params.id,
      userId: req.session.userId
    });
    if (!missedTrade) {
      return res.status(404).json({ message: 'Missed trade not found' });
    }

    if (missedTrade.screenshots) {
      const publicIdsToDelete = [];
      if (missedTrade.screenshots.before) {
        const urlParts = missedTrade.screenshots.before.split('/');
        const filename = urlParts[urlParts.length - 1];
        publicIdsToDelete.push(`fx-journal/${filename.split('.')[0]}`);
      }
      if (missedTrade.screenshots.after) {
        const urlParts = missedTrade.screenshots.after.split('/');
        const filename = urlParts[urlParts.length - 1];
        publicIdsToDelete.push(`fx-journal/${filename.split('.')[0]}`);
      }

      for (const publicId of publicIdsToDelete) {
        try {
          await deleteImage(publicId);
        } catch (err) {
          console.error('Error deleting image from Cloudinary:', err);
        }
      }
    }

    await MissedTrade.findByIdAndDelete(req.params.id);
    res.json({ message: 'Missed trade deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, create, update, remove };
