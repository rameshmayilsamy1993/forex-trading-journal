const { Trade, SSMT_TYPES } = require('./trade.model');
const Account = require('../accounts/account.model');
const Master = require('../masters/master.model');
const { getCachedPairs, calculateRealPL } = require('../../services/tradeService');
const { deleteImage } = require('../../config/cloudinary');

const getAll = async (req, res, next) => {
  try {
    const { accountId, firmId, ssmtType } = req.query;
    let filter = { userId: req.session.userId };
    if (accountId) filter.accountId = accountId;
    if (firmId) filter.propFirmId = firmId;

    if (ssmtType !== undefined && SSMT_TYPES.includes(ssmtType)) {
      filter.ssmtType = ssmtType;
    }

    const trades = await Trade.find(filter)
      .populate('accountId')
      .populate('propFirmId')
      .sort({ entryDate: -1, createdAt: -1 });
    res.json(trades);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const { profit, commission, swap, entryDate, entryTime, exitDate, exitTime, ssmtType, pair, ...rest } = req.body;

    const allowedPairs = await getCachedPairs();
    const finalPair = allowedPairs.includes(pair) ? pair : null;

    if (!finalPair) {
      return res.status(400).json({
        message: `Invalid pair. Allowed pairs: ${allowedPairs.join(', ')}`
      });
    }

    const realPL = calculateRealPL(profit, commission, swap);

    let finalEntryDate = entryDate ? new Date(entryDate) : new Date();
    if (isNaN(finalEntryDate.getTime())) {
      finalEntryDate = new Date();
    }

    let finalExitDate = exitDate ? new Date(exitDate) : undefined;
    if (finalExitDate && isNaN(finalExitDate.getTime())) {
      finalExitDate = undefined;
    }

    const finalSsmtType = SSMT_TYPES.includes(ssmtType) ? ssmtType : 'NO';

    const trade = new Trade({
      ...rest,
      pair: finalPair,
      profit,
      commission,
      swap: swap || 0,
      realPL,
      ssmtType: finalSsmtType,
      entryDate: finalEntryDate,
      entryTime: entryTime || undefined,
      exitDate: finalExitDate,
      exitTime: exitTime || undefined,
      userId: req.session.userId
    });
    const savedTrade = await trade.save();
    res.status(201).json(savedTrade);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const { profit, commission, swap, entryDate, entryTime, exitDate, exitTime, ssmtType, pair, highLowTime, ...rest } = req.body;

    const allowedPairs = await getCachedPairs();
    let finalPair = undefined;

    if (pair !== undefined) {
      finalPair = allowedPairs.includes(pair) ? pair : null;
      if (!finalPair) {
        return res.status(400).json({
          message: `Invalid pair. Allowed pairs: ${allowedPairs.join(', ')}`
        });
      }
    }

    const realPL = calculateRealPL(profit, commission, swap);

    let finalEntryDate = entryDate ? new Date(entryDate) : undefined;
    if (finalEntryDate && isNaN(finalEntryDate.getTime())) {
      finalEntryDate = undefined;
    }

    let finalExitDate = exitDate ? new Date(exitDate) : undefined;
    if (finalExitDate && isNaN(finalExitDate.getTime())) {
      finalExitDate = undefined;
    }

    const finalSsmtType = SSMT_TYPES.includes(ssmtType) ? ssmtType : 'NO';

    const updateData = {
      ...rest,
      profit,
      commission,
      swap: swap || 0,
      realPL,
      ssmtType: finalSsmtType,
      entryDate: finalEntryDate,
      entryTime: entryTime || undefined,
      exitDate: finalExitDate,
      exitTime: exitTime || undefined,
      highLowTime: highLowTime || undefined,
    };

    if (finalPair) {
      updateData.pair = finalPair;
    }

    const trade = await Trade.findOneAndUpdate(
      { _id: req.params.id, userId: req.session.userId },
      updateData,
      { new: true, runValidators: true }
    );
    if (!trade) {
      return res.status(404).json({ message: 'Trade not found' });
    }
    res.json(trade);
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const trade = await Trade.findOne({
      _id: req.params.id,
      userId: req.session.userId
    });
    if (!trade) {
      return res.status(404).json({ message: 'Trade not found' });
    }

    const publicIdsToDelete = [];
    if (trade.beforeScreenshot) {
      const urlParts = trade.beforeScreenshot.split('/');
      const filename = urlParts[urlParts.length - 1];
      publicIdsToDelete.push(`fx-journal/${filename.split('.')[0]}`);
    }
    if (trade.afterScreenshot) {
      const urlParts = trade.afterScreenshot.split('/');
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

    await Trade.findByIdAndDelete(req.params.id);
    res.json({ message: 'Trade deleted' });
  } catch (error) {
    next(error);
  }
};

const bulkDelete = async (req, res, next) => {
  try {
    const mongoose = require('mongoose');
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'No trade IDs provided' });
    }

    const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
      return res.status(400).json({ message: 'No valid trade IDs provided' });
    }

    const trades = await Trade.find({
      _id: { $in: validIds },
      userId: req.session.userId
    });

    const publicIdsToDelete = [];
    for (const trade of trades) {
      if (trade.beforeScreenshot) {
        const urlParts = trade.beforeScreenshot.split('/');
        const filename = urlParts[urlParts.length - 1];
        publicIdsToDelete.push(`fx-journal/${filename.split('.')[0]}`);
      }
      if (trade.afterScreenshot) {
        const urlParts = trade.afterScreenshot.split('/');
        const filename = urlParts[urlParts.length - 1];
        publicIdsToDelete.push(`fx-journal/${filename.split('.')[0]}`);
      }
    }

    for (const publicId of publicIdsToDelete) {
      try {
        await deleteImage(publicId);
      } catch (err) {
        console.error('Error deleting image from Cloudinary:', err);
      }
    }

    const result = await Trade.deleteMany({
      _id: { $in: validIds },
      userId: req.session.userId
    });

    res.json({ deletedCount: result.deletedCount });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, create, update, remove, bulkDelete, SSMT_TYPES };
