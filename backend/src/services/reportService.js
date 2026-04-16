const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, Table, TableRow, TableCell, WidthType, ImageRun, ExternalHyperlink, ShadingType } = require('docx');
const https = require('https');
const http = require('http');

const fetchImageBuffer = (url) => {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        return fetchImageBuffer(response.headers.location).then(resolve).catch(reject);
      }
      
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve(buffer);
      });
      response.on('error', reject);
    }).on('error', reject);
  });
};

const formatDate = (date) => {
  if (!date) return 'N/A';
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '0.00';
  return Number(amount).toFixed(2);
};

const formatPrice = (price) => {
  if (price === undefined || price === null) return 'N/A';
  return Number(price).toFixed(5);
};

const getMonthName = (date) => {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

const generateHeaderParagraph = (text, level = HeadingLevel.HEADING_1) => {
  return new Paragraph({
    text: text,
    heading: level,
    spacing: { after: 200 },
  });
};

const generateLabelValueParagraph = (label, value) => {
  return new Paragraph({
    children: [
      new TextRun({ text: `${label}: `, bold: true }),
      new TextRun({ text: value || 'N/A' }),
    ],
    spacing: { after: 100 },
  });
};

const generateSectionBreak = () => {
  return new Paragraph({
    border: {
      bottom: {
        color: "CCCCCC",
        space: 1,
        style: BorderStyle.SINGLE,
        size: 6,
      },
    },
    spacing: { after: 400 },
  });
};

const generateEmptyLine = () => {
  return new Paragraph({
    text: "",
    spacing: { after: 200 },
  });
};

const generateTradeSection = async (trade, index, lossAnalysis = null) => {
  const children = [];

  children.push(new Paragraph({
    text: `Trade ${index}`,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 400, after: 200 },
  }));

  children.push(generateLabelValueParagraph('Pair', trade.pair));
  children.push(generateLabelValueParagraph('Type', trade.type));
  children.push(generateLabelValueParagraph('Entry', formatPrice(trade.entryPrice)));
  children.push(generateLabelValueParagraph('Exit', formatPrice(trade.exitPrice)));
  children.push(generateLabelValueParagraph('Stop Loss', formatPrice(trade.stopLoss)));
  children.push(generateLabelValueParagraph('Take Profit', formatPrice(trade.takeProfit)));
  children.push(generateLabelValueParagraph('Lot Size', trade.lotSize?.toString() || 'N/A'));
  children.push(generateLabelValueParagraph('Profit/Loss', formatCurrency(trade.profit)));
  children.push(generateLabelValueParagraph('Real P/L', formatCurrency(trade.realPL)));
  
  if (trade.strategy) {
    children.push(generateLabelValueParagraph('Strategy', trade.strategy));
  }
  if (trade.session) {
    children.push(generateLabelValueParagraph('Session', trade.session));
  }
  if (trade.keyLevel) {
    children.push(generateLabelValueParagraph('Key Level', trade.keyLevel));
  }
  if (trade.riskRewardRatio) {
    children.push(generateLabelValueParagraph('Risk/Reward', `1:${trade.riskRewardRatio}`));
  }

  children.push(generateSectionBreak());

  if (lossAnalysis) {
    children.push(new Paragraph({
      text: 'LOSS ANALYSIS',
      heading: HeadingLevel.HEADING_3,
      spacing: { before: 200, after: 100 },
    }));

    children.push(generateLabelValueParagraph('Reason', lossAnalysis.reasonType));
    children.push(generateLabelValueParagraph('Type', lossAnalysis.isValidTrade ? 'Valid Loss' : 'Mistake Loss'));
    
    if (lossAnalysis.description) {
      children.push(new Paragraph({
        text: 'Notes:',
        bold: true,
        spacing: { before: 100, after: 50 },
      }));
      children.push(new Paragraph({
        text: lossAnalysis.description,
        spacing: { after: 100 },
      }));
    }

    if (lossAnalysis.disciplineScore) {
      children.push(generateLabelValueParagraph('Discipline Score', `${lossAnalysis.disciplineScore}/5`));
    }

    children.push(generateSectionBreak());
  }

  if (trade.notes) {
    children.push(new Paragraph({
      text: 'Notes:',
      bold: true,
      spacing: { before: 100, after: 50 },
    }));
    children.push(new Paragraph({
      text: trade.notes,
      spacing: { after: 100 },
    }));
    children.push(generateSectionBreak());
  }

  return children;
};

const generateImageSection = async (images) => {
  const children = [];
  
  if (!images || images.length === 0) return children;

  children.push(new Paragraph({
    text: 'Chart Images',
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100 },
  }));

  for (const image of images) {
    try {
      const buffer = await fetchImageBuffer(image.url);
      
      children.push(new Paragraph({
        text: `${image.timeframe || 'Chart'} Image`,
        spacing: { after: 50 },
      }));

      children.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: buffer,
              transformation: {
                width: 450,
                height: 300,
              },
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
        })
      );
    } catch (error) {
      console.error('Failed to load image:', image.url, error.message);
      children.push(new Paragraph({
        text: `[Image unavailable: ${image.timeframe || 'Chart'}]`,
        spacing: { after: 100 },
      }));
    }
  }

  return children;
};

const generateDocument = async (trades, options = {}) => {
  const { type = 'daily', date = new Date() } = options;
  
  let headerText = '';
  
  if (type === 'daily') {
    headerText = `Trade Journal — ${formatDate(date)}`;
  } else if (type === 'weekly') {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    headerText = `Trade Journal — ${formatDate(startOfWeek)} to ${formatDate(endOfWeek)}`;
  } else if (type === 'monthly') {
    headerText = `Trade Journal — ${getMonthName(date)}`;
  }

  const children = [];

  children.push(new Paragraph({
    text: headerText,
    heading: HeadingLevel.TITLE,
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
  }));

  children.push(new Paragraph({
    text: `Generated: ${new Date().toLocaleString()}`,
    alignment: AlignmentType.CENTER,
    spacing: { after: 600 },
  }));

  children.push(new Paragraph({
    text: `Total Trades: ${trades.length}`,
    spacing: { after: 400 },
  }));

  children.push(generateSectionBreak());

  let tradeNumber = 1;
  for (const trade of trades) {
    const tradeSection = await generateTradeSection(trade, tradeNumber, trade.lossAnalysis);
    children.push(...tradeSection);

    if (trade.beforeScreenshot || trade.afterScreenshot) {
      const images = [];
      if (trade.beforeScreenshot) {
        images.push({ url: trade.beforeScreenshot, timeframe: 'Before Entry' });
      }
      if (trade.afterScreenshot) {
        images.push({ url: trade.afterScreenshot, timeframe: 'After Exit' });
      }
      const imageSection = await generateImageSection(images);
      children.push(...imageSection);
    }

    if (trade.lossAnalysis?.images && trade.lossAnalysis.images.length > 0) {
      const imageSection = await generateImageSection(trade.lossAnalysis.images);
      children.push(...imageSection);
    }

    tradeNumber++;
  }

  const doc = new Document({
    sections: [{
      properties: {},
      children: children,
    }],
  });

  return doc;
};

const filterTradesByPeriod = (trades, type, date) => {
  const targetDate = date ? new Date(date) : new Date();
  
  if (type === 'daily') {
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    return trades.filter(trade => {
      const tradeDate = new Date(trade.entryDate);
      return tradeDate >= startOfDay && tradeDate <= endOfDay;
    });
  }
  
  if (type === 'weekly') {
    const startOfWeek = new Date(targetDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return trades.filter(trade => {
      const tradeDate = new Date(trade.entryDate);
      return tradeDate >= startOfWeek && tradeDate <= endOfWeek;
    });
  }
  
  if (type === 'monthly') {
    const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999);

    return trades.filter(trade => {
      const tradeDate = new Date(trade.entryDate);
      return tradeDate >= startOfMonth && tradeDate <= endOfMonth;
    });
  }

  return trades;
};

module.exports = {
  generateDocument,
  filterTradesByPeriod,
  fetchImageBuffer,
};
