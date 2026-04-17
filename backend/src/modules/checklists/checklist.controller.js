const ChecklistSession = require('./checklist.model');
const Master = require('../masters/master.model');

const generateSessionId = () => {
  const now = new Date();
  const dateStr =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');
  const timeStr =
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0');
  const random = Math.floor(100 + Math.random() * 900);
  return `CHK-${dateStr}-${timeStr}-${random}`;
};

const getChecklists = async (req, res, next) => {
  try {
    const { tradeId, limit = 50, page = 1 } = req.query;
    
    let filter = { userId: req.session.userId };
    
    if (tradeId) {
      filter.linkedTrades = tradeId;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const checklists = await ChecklistSession.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ChecklistSession.countDocuments(filter);

    res.json({
      checklists,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    next(error);
  }
};

const getChecklistById = async (req, res, next) => {
  try {
    const checklist = await ChecklistSession.findOne({
      _id: req.params.id,
      userId: req.session.userId
    });

    if (!checklist) {
      return res.status(404).json({ message: 'Checklist not found' });
    }

    res.json(checklist);
  } catch (error) {
    next(error);
  }
};

const getActiveSessions = async (req, res, next) => {
  try {
    const sessions = await ChecklistSession.find({
      userId: req.session.userId,
      isValid: true
    })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json(sessions);
  } catch (error) {
    next(error);
  }
};

const createChecklist = async (req, res, next) => {
  try {
    const { strategyId, items, notes, pair, tradeType, entryPrice } = req.body;

    if (!strategyId) {
      return res.status(400).json({ message: 'Strategy is required' });
    }

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ message: 'Checklist items are required' });
    }

    const strategy = await Master.findOne({
      _id: strategyId,
      userId: req.session.userId,
      type: 'strategy'
    });

    if (!strategy) {
      return res.status(404).json({ message: 'Strategy not found' });
    }

    const checkedItems = items.map(item => ({
      label: item.label,
      checked: item.checked === true,
      required: item.required === true
    }));

    const missingRequired = checkedItems
      .filter(item => item.required && !item.checked)
      .map(item => item.label);

    const isValid = missingRequired.length === 0;

    const checklist = new ChecklistSession({
      userId: req.session.userId,
      sessionId: generateSessionId(),
      strategyId: strategy._id,
      strategyName: strategy.name,
      items: checkedItems,
      isValid,
      missingRequired,
      notes,
      linkedTrades: [],
      pair,
      tradeType,
      entryPrice
    });

    await checklist.save();

    res.status(201).json(checklist);
  } catch (error) {
    next(error);
  }
};

const updateChecklist = async (req, res, next) => {
  try {
    const { items, notes } = req.body;

    const checklist = await ChecklistSession.findOne({
      _id: req.params.id,
      userId: req.session.userId
    });

    if (!checklist) {
      return res.status(404).json({ message: 'Checklist not found' });
    }

    if (items) {
      const checkedItems = items.map(item => ({
        label: item.label,
        checked: item.checked === true,
        required: item.required === true
      }));

      checklist.items = checkedItems;

      const missingRequired = checkedItems
        .filter(item => item.required && !item.checked)
        .map(item => item.label);

      checklist.isValid = missingRequired.length === 0;
      checklist.missingRequired = missingRequired;
    }

    if (notes !== undefined) {
      checklist.notes = notes;
    }

    await checklist.save();

    res.json(checklist);
  } catch (error) {
    next(error);
  }
};

const linkToTrade = async (req, res, next) => {
  try {
    const { tradeId } = req.body;

    if (!tradeId) {
      return res.status(400).json({ message: 'Trade ID is required' });
    }

    const checklist = await ChecklistSession.findOne({
      _id: req.params.id,
      userId: req.session.userId
    });

    if (!checklist) {
      return res.status(404).json({ message: 'Checklist not found' });
    }

    if (!checklist.isValid) {
      return res.status(400).json({ 
        message: 'Cannot link invalid checklist to trade. All required items must be checked.' 
      });
    }

    if (!checklist.linkedTrades.includes(tradeId)) {
      checklist.linkedTrades.push(tradeId);
      await checklist.save();
    }

    res.json(checklist);
  } catch (error) {
    next(error);
  }
};

const deleteChecklist = async (req, res, next) => {
  try {
    const checklist = await ChecklistSession.findOneAndDelete({
      _id: req.params.id,
      userId: req.session.userId,
      status: 'ACTIVE'
    });

    if (!checklist) {
      return res.status(404).json({ message: 'Checklist not found or already linked' });
    }

    res.json({ message: 'Checklist deleted' });
  } catch (error) {
    next(error);
  }
};

const linkChecklistToTrades = async (req, res, next) => {
  try {
    const { checklistId, tradeIds } = req.body;

    if (!checklistId) {
      return res.status(400).json({ message: 'Checklist ID is required' });
    }

    if (!tradeIds || !Array.isArray(tradeIds) || tradeIds.length === 0) {
      return res.status(400).json({ message: 'At least one trade ID is required' });
    }

    const checklist = await ChecklistSession.findOne({
      _id: checklistId,
      userId: req.session.userId
    });

    if (!checklist) {
      return res.status(404).json({ message: 'Checklist not found' });
    }

    if (checklist.status === 'LINKED') {
      return res.status(400).json({ message: 'Checklist already linked to trades' });
    }

    if (!checklist.isValid) {
      return res.status(400).json({ 
        message: 'Cannot link invalid checklist. All required items must be checked.' 
      });
    }

    const Trade = require('../trades/trade.model').Trade;

    await Trade.updateMany(
      { 
        _id: { $in: tradeIds },
        userId: req.session.userId
      },
      { 
        checklistId: checklist._id,
        checklistSession: checklist.sessionId
      }
    );

    checklist.status = 'LINKED';
    checklist.linkedTrades = [...new Set([...checklist.linkedTrades, ...tradeIds])];
    await checklist.save();

    res.json({
      message: 'Checklist linked successfully',
      checklist: {
        _id: checklist._id,
        sessionId: checklist.sessionId,
        status: checklist.status,
        linkedTrades: checklist.linkedTrades
      },
      linkedTradeCount: tradeIds.length
    });
  } catch (error) {
    next(error);
  }
};

const getActiveChecklists = async (req, res, next) => {
  try {
    const checklists = await ChecklistSession.find({
      userId: req.session.userId,
      status: 'ACTIVE',
      isValid: true
    })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(checklists);
  } catch (error) {
    next(error);
  }
};

const unlinkChecklistFromTrades = async (req, res, next) => {
  try {
    const { checklistId, tradeIds } = req.body;

    if (!checklistId) {
      return res.status(400).json({ message: 'Checklist ID is required' });
    }

    if (!tradeIds || !Array.isArray(tradeIds) || tradeIds.length === 0) {
      return res.status(400).json({ message: 'At least one trade ID is required' });
    }

    const checklist = await ChecklistSession.findOne({
      _id: checklistId,
      userId: req.session.userId
    });

    if (!checklist) {
      return res.status(404).json({ message: 'Checklist not found' });
    }

    const Trade = require('../trades/trade.model').Trade;

    const validTradeIds = tradeIds.filter(id => {
      return checklist.linkedTrades.some(linkedId => linkedId.toString() === id);
    });

    if (validTradeIds.length === 0) {
      return res.status(400).json({ message: 'No valid trades to unlink from this checklist' });
    }

    await Trade.updateMany(
      { 
        _id: { $in: validTradeIds },
        userId: req.session.userId
      },
      { 
        $unset: { 
          checklistId: "",
          checklistSession: "" 
        }
      }
    );

    checklist.linkedTrades = checklist.linkedTrades.filter(
      id => !validTradeIds.includes(id.toString())
    );

    if (checklist.linkedTrades.length === 0) {
      checklist.status = 'ACTIVE';
    } else {
      checklist.status = 'PARTIAL';
    }

    await checklist.save();

    res.json({
      message: 'Checklist unlinked successfully',
      checklist: {
        _id: checklist._id,
        sessionId: checklist.sessionId,
        status: checklist.status,
        linkedTrades: checklist.linkedTrades
      },
      unlinkedTradeCount: validTradeIds.length
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getChecklists,
  getChecklistById,
  getActiveSessions,
  getActiveChecklists,
  createChecklist,
  updateChecklist,
  linkToTrade,
  linkChecklistToTrades,
  unlinkChecklistFromTrades,
  deleteChecklist
};
