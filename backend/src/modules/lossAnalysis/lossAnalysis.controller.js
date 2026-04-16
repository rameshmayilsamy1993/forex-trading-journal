const { LossAnalysis, VALID_LOSS_REASONS } = require('./lossAnalysis.model');
const { Trade } = require('../trades/trade.model');

const create = async (req, res, next) => {
  try {
    const { tradeId, title, reasonType, description, images, tags, checklist, disciplineScore } = req.body;
    
    if (!tradeId) {
      return res.status(400).json({ message: 'Trade ID is required' });
    }
    
    if (!reasonType) {
      return res.status(400).json({ message: 'Reason type is required' });
    }
    
    const trade = await Trade.findOne({ _id: tradeId, userId: req.session.userId });
    if (!trade) {
      return res.status(404).json({ message: 'Trade not found' });
    }
    
    const existing = await LossAnalysis.findOne({ tradeId, userId: req.session.userId });
    if (existing) {
      return res.status(400).json({ message: 'Analysis already exists for this trade' });
    }
    
    const isValidTrade = VALID_LOSS_REASONS.includes(reasonType);
    
    const analysis = await LossAnalysis.create({
      tradeId,
      userId: req.session.userId,
      title,
      reasonType,
      isValidTrade,
      description: description || '',
      images: images || [],
      tags: tags || [],
      checklist: checklist || [],
      disciplineScore
    });
    
    res.status(201).json(analysis);
  } catch (error) {
    next(error);
  }
};

const getByTrade = async (req, res, next) => {
  try {
    const { tradeId } = req.params;
    
    const trade = await Trade.findOne({ _id: tradeId, userId: req.session.userId });
    if (!trade) {
      return res.status(404).json({ message: 'Trade not found' });
    }
    
    const analysis = await LossAnalysis.findOne({ tradeId, userId: req.session.userId });
    
    if (!analysis) {
      return res.json(null);
    }
    
    res.json(analysis);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, reasonType, description, images, tags, checklist, disciplineScore } = req.body;
    
    const analysis = await LossAnalysis.findOne({
      _id: id,
      userId: req.session.userId
    });
    
    if (!analysis) {
      return res.status(404).json({ message: 'Analysis not found' });
    }
    
    if (title !== undefined) analysis.title = title;
    if (reasonType) analysis.reasonType = reasonType;
    if (description !== undefined) analysis.description = description;
    if (images) analysis.images = images;
    if (tags) analysis.tags = tags;
    if (checklist) analysis.checklist = checklist;
    if (disciplineScore !== undefined) analysis.disciplineScore = disciplineScore;
    analysis.updatedAt = new Date();
    
    await analysis.save();
    
    res.json(analysis);
  } catch (error) {
    next(error);
  }
};

const getList = async (req, res, next) => {
  try {
    const { accountId, startDate, endDate, page = 1, limit = 50 } = req.query;
    
    const filter = { userId: req.session.userId };
    
    if (accountId) {
      const tradeIds = await Trade.find({
        userId: req.session.userId,
        accountId,
        profit: { $lt: 0 }
      }).select('_id');
      filter.tradeId = { $in: tradeIds.map(t => t._id) };
    }
    
    const analyses = await LossAnalysis.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('tradeId');
    
    const total = await LossAnalysis.countDocuments(filter);
    
    res.json({
      analyses,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { create, getByTrade, update, getList };
