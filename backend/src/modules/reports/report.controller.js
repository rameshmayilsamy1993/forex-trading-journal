const { Trade } = require('../trades/trade.model');
const { LossAnalysis } = require('../lossAnalysis/lossAnalysis.model');
const { generateDocument, filterTradesByPeriod } = require('../../services/reportService');

const VALID_PERIODS = ['daily', 'weekly', 'monthly', 'all'];

const exportTrades = async (req, res, next) => {
  try {
    const { period = 'all', date, accountId, firmId } = req.query;

    if (!VALID_PERIODS.includes(period)) {
      return res.status(400).json({
        message: `Invalid period. Valid options: ${VALID_PERIODS.join(', ')}`
      });
    }

    let filter = { userId: req.session.userId };
    
    if (accountId) {
      filter.accountId = accountId;
    }
    if (firmId) {
      filter.propFirmId = firmId;
    }

    let trades = await Trade.find(filter)
      .populate('accountId')
      .populate('propFirmId')
      .sort({ entryDate: -1 });

    if (period !== 'all') {
      const targetDate = date ? new Date(date) : new Date();
      trades = filterTradesByPeriod(trades, period, targetDate);
    }

    const tradeIds = trades.map(t => t._id);
    const lossAnalyses = await LossAnalysis.find({
      tradeId: { $in: tradeIds },
      userId: req.session.userId
    });

    const lossAnalysisMap = new Map();
    lossAnalyses.forEach(la => {
      lossAnalysisMap.set(la.tradeId.toString(), la.toObject());
    });

    const tradesWithAnalysis = trades.map(trade => {
      const tradeObj = trade.toObject ? trade.toObject() : trade;
      tradeObj.lossAnalysis = lossAnalysisMap.get(trade._id.toString()) || null;
      return tradeObj;
    });

    const targetDate = date ? new Date(date) : new Date();
    
    const doc = await generateDocument(tradesWithAnalysis, {
      type: period,
      date: targetDate
    });

    const { Packer } = require('docx');
    const buffer = await Packer.toBuffer(doc);

    let filename = 'trade-journal';
    if (period === 'daily') {
      const dateStr = targetDate.toISOString().split('T')[0];
      filename = `trade-journal-${dateStr}`;
    } else if (period === 'weekly') {
      const startOfWeek = new Date(targetDate);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      filename = `trade-journal-week-${startOfWeek.toISOString().split('T')[0]}`;
    } else if (period === 'monthly') {
      const month = String(targetDate.getMonth() + 1).padStart(2, '0');
      const year = targetDate.getFullYear();
      filename = `trade-journal-${year}-${month}`;
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.docx"`);
    res.send(buffer);

  } catch (error) {
    console.error('Export error:', error);
    next(error);
  }
};

const exportMissedTrades = async (req, res, next) => {
  try {
    const { period = 'all', date, accountId } = req.query;

    const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } = require('docx');
    
    const MissedTrade = require('../missedTrades/missedTrade.model');

    let filter = { userId: req.session.userId };
    
    if (accountId) {
      filter.accountId = accountId;
    }

    let missedTrades = await MissedTrade.find(filter)
      .sort({ date: -1 });

    if (period !== 'all') {
      const targetDate = date ? new Date(date) : new Date();
      missedTrades = filterTradesByPeriod(missedTrades, period, targetDate);
    }

    const children = [];

    let headerText = 'Missed Trades Journal';
    if (period === 'daily') {
      headerText = `Missed Trades Journal — ${new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;
    } else if (period === 'weekly') {
      const startOfWeek = new Date(date);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      headerText = `Missed Trades Journal — ${startOfWeek.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} to ${endOfWeek.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;
    } else if (period === 'monthly') {
      headerText = `Missed Trades Journal — ${new Date(date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
    }

    children.push(new Paragraph({
      text: headerText,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }));

    children.push(new Paragraph({
      text: `Total Missed Trades: ${missedTrades.length}`,
      spacing: { after: 400 },
    }));

    let tradeNumber = 1;
    for (const trade of missedTrades) {
      children.push(new Paragraph({
        text: `Missed Trade ${tradeNumber}`,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 },
      }));

      const addField = (label, value) => {
        children.push(new Paragraph({
          children: [
            new TextRun({ text: `${label}: `, bold: true }),
            new TextRun({ text: value || 'N/A' }),
          ],
          spacing: { after: 100 },
        }));
      };

      addField('Pair', trade.pair);
      addField('Type', trade.type);
      addField('Entry Price', trade.entryPrice?.toString());
      addField('Stop Loss', trade.stopLoss?.toString());
      addField('Take Profit', trade.takeProfit?.toString());
      addField('Risk/Reward', trade.rr ? `1:${trade.rr}` : 'N/A');
      addField('Status', trade.status);
      addField('Session', trade.session);
      addField('Strategy', trade.strategy);

      if (trade.missedReason || trade.reason) {
        addField('Reason', trade.missedReason || trade.reason);
      }

      if (trade.notes) {
        addField('Notes', trade.notes);
      }

      children.push(new Paragraph({
        border: {
          bottom: {
            color: "CCCCCC",
            space: 1,
            style: BorderStyle.SINGLE,
            size: 6,
          },
        },
        spacing: { after: 400 },
      }));

      tradeNumber++;
    }

    const doc = new Document({
      sections: [{
        properties: {},
        children: children,
      }],
    });

    const buffer = await Packer.toBuffer(doc);

    let filename = 'missed-trades-journal';
    if (period === 'daily') {
      filename = `missed-trades-journal-${new Date(date).toISOString().split('T')[0]}`;
    } else if (period === 'monthly') {
      const month = String(new Date(date).getMonth() + 1).padStart(2, '0');
      filename = `missed-trades-journal-${new Date(date).getFullYear()}-${month}`;
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.docx"`);
    res.send(buffer);

  } catch (error) {
    console.error('Export missed trades error:', error);
    next(error);
  }
};

module.exports = {
  exportTrades,
  exportMissedTrades,
};
