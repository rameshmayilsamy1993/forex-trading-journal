import jsPDF from 'jspdf';
import { Trade, TradingAccount, PropFirm } from '../types/trading';

async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function getAccountName(accountId: any, accounts: TradingAccount[]): string {
  const id = typeof accountId === 'object'
    ? (accountId as any)?.id || (accountId as any)?._id
    : accountId;
  if (!id) return 'Unknown';
  return accounts.find((a) => String(a.id) === String(id))?.name || 'Unknown';
}

function getRealPL(trade: Trade): number {
  return (trade as any).realPL ?? ((trade.profit || 0) - Math.abs(trade.commission || 0) - Math.abs((trade as any).swap || 0));
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'N/A';
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatPrice(price?: number): string {
  if (price === undefined || price === null) return 'N/A';
  return price.toFixed(5);
}

export async function generateTradePDF(
  trades: Trade[],
  accounts: TradingAccount[],
  firms: PropFirm[],
  analysesMap?: Record<string, any>
) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Title
  doc.setFontSize(20);
  doc.setTextColor(124, 58, 237);
  doc.text('Trade Journal', pageWidth / 2, 20, { align: 'center' });

  // Generation timestamp
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated: ${dateStr}`, pageWidth / 2, 27, { align: 'center' });
  doc.text(`Total Trades: ${trades.length}`, pageWidth / 2, 33, { align: 'center' });

  // Summary stats
  const closedTrades = trades.filter(t => t.status === 'CLOSED');
  const wins = closedTrades.filter(t => getRealPL(t) > 0);
  const losses = closedTrades.filter(t => getRealPL(t) < 0);
  const totalWin = wins.reduce((s, t) => s + getRealPL(t), 0);
  const totalLoss = Math.abs(losses.reduce((s, t) => s + getRealPL(t), 0));
  const netPL = totalWin - totalLoss;
  const winRate = closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0;
  const profitFactor = totalLoss > 0 ? totalWin / totalLoss : totalWin > 0 ? Infinity : 0;

  doc.setFillColor(248, 250, 252);
  doc.rect(margin, 38, contentWidth, 22, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, 38, contentWidth, 22, 'S');

  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Wins: ${wins.length}`, margin + 4, 44);
  doc.text(`Losses: ${losses.length}`, margin + 4, 50);
  doc.text(`Win Rate: ${winRate.toFixed(1)}%`, margin + 4, 56);

  doc.text(`Total Win: $${totalWin.toFixed(2)}`, margin + contentWidth / 3, 44);
  doc.text(`Total Loss: $${totalLoss.toFixed(2)}`, margin + contentWidth / 3, 50);
  doc.text(`Profit Factor: ${profitFactor === Infinity ? '\u221E' : profitFactor.toFixed(2)}`, margin + contentWidth / 3, 56);

  doc.setTextColor(netPL >= 0 ? 22 : 220, netPL >= 0 ? 163 : 38, netPL >= 0 ? 74 : 38);
  doc.setFontSize(11);
  doc.text(`Net P/L: ${netPL >= 0 ? '+' : ''}$${netPL.toFixed(2)}`, margin + (contentWidth * 2) / 3, 50);

  let yPos = 68;

  for (let i = 0; i < trades.length; i++) {
    const trade = trades[i];
    const pl = getRealPL(trade);
    const category = pl > 0 ? 'win' : pl < 0 ? 'loss' : 'be';
    const plColor = pl >= 0 ? [22, 163, 74] as const : [220, 38, 38] as const;

    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    // Trade header bar
    doc.setDrawColor(124, 58, 237);
    doc.setFillColor(245, 243, 255);
    doc.rect(margin, yPos - 3, contentWidth, 7, 'F');
    doc.rect(margin, yPos - 3, contentWidth, 7, 'S');
    doc.setFontSize(11);
    doc.setTextColor(124, 58, 237);
    doc.text(`Trade #${i + 1} — ${trade.pair} ${trade.type}`, margin + 3, yPos + 2);
    yPos += 10;

    // Left column: basic info
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    const leftFields = [
      `Account: ${getAccountName(trade.accountId, accounts)}`,
      `Date: ${formatDate(trade.entryDate)}${trade.entryTime ? ` at ${trade.entryTime}` : ''}`,
      `Entry: ${formatPrice(trade.entryPrice)}`,
      `Exit: ${trade.exitPrice ? formatPrice(trade.exitPrice) : 'N/A'}`,
    ];
    leftFields.forEach((line, idx) => {
      doc.text(line, margin + 3, yPos + idx * 5);
    });

    // Right column: trade details
    const rightFields = [
      `Lot: ${trade.lotSize || 'N/A'}`,
      `SL: ${trade.stopLoss ? formatPrice(trade.stopLoss) : 'N/A'}`,
      `TP: ${trade.takeProfit ? formatPrice(trade.takeProfit) : 'N/A'}`,
      `R:R: ${trade.riskRewardRatio ? `1:${trade.riskRewardRatio.toFixed(2)}` : 'N/A'}`,
    ];
    rightFields.forEach((line, idx) => {
      doc.text(line, margin + 85, yPos + idx * 5);
    });

    yPos += 24;

    // Real P/L
    doc.setFontSize(11);
    doc.setTextColor(plColor[0], plColor[1], plColor[2]);
    doc.text(`Real P/L: ${pl >= 0 ? '+' : ''}$${Math.abs(pl).toFixed(2)}`, margin + 85, yPos - 2);

    // Optional fields
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    const optFields: string[] = [];
    if (trade.strategy) optFields.push(`Strategy: ${trade.strategy}`);
    if (trade.session) optFields.push(`Session: ${trade.session}`);
    if (trade.keyLevel) optFields.push(`Key Level: ${trade.keyLevel}`);
    if (trade.smt && trade.smt !== 'No') optFields.push(`SMT: ${trade.smt}`);
    if (trade.model1 && trade.model1 !== 'No') optFields.push(`Model1: ${trade.model1}`);
    if ((trade as any).ssmtType && (trade as any).ssmtType !== 'NO') optFields.push(`SSMT: ${(trade as any).ssmtType}`);
    if ((trade as any).highLowTime) optFields.push(`High/Low: ${(trade as any).highLowTime}`);

    if (optFields.length > 0) {
      if (yPos > 258) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(8);
      optFields.forEach((line, idx) => {
        doc.text(line, margin + 3, yPos + idx * 4.5);
      });
      yPos += optFields.length * 4.5 + 3;
    }

    // Loss analysis
    if (analysesMap && analysesMap[trade.id]) {
      const analysis = analysesMap[trade.id];
      if (yPos > 258) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFillColor(254, 242, 242);
      doc.setDrawColor(220, 38, 38);
      doc.rect(margin, yPos - 2, contentWidth, 12, 'F');
      doc.rect(margin, yPos - 2, contentWidth, 12, 'S');
      doc.setFontSize(8);
      doc.setTextColor(185, 28, 28);
      let laLine = `Loss Analysis — Reason: ${analysis.reasonType || 'N/A'}`;
      if (analysis.disciplineScore) laLine += ` | Discipline: ${analysis.disciplineScore}/5`;
      if (analysis.isValidTrade !== undefined) laLine += ` | ${analysis.isValidTrade ? 'Valid Loss' : 'Mistake'}`;
      doc.text(laLine, margin + 3, yPos + 3);
      yPos += 16;
    }

    // Notes
    if (trade.notes) {
      if (yPos > 260) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text('Notes:', margin + 3, yPos);
      yPos += 4;
      const splitNotes = doc.splitTextToSize(trade.notes, contentWidth - 6);
      for (const line of splitNotes) {
        if (yPos > 275) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(line, margin + 3, yPos);
        yPos += 4;
      }
      yPos += 3;
    }

    // Screenshots
    const screenshotUrls: { url: string; label: string }[] = [];
    if (trade.beforeScreenshot) screenshotUrls.push({ url: trade.beforeScreenshot, label: 'Before Entry' });
    if (trade.afterScreenshot) screenshotUrls.push({ url: trade.afterScreenshot, label: 'After Exit' });

    for (const ss of screenshotUrls) {
      if (yPos > 262) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(`${ss.label}:`, margin + 3, yPos);
      yPos += 4;

      const imgData = await fetchImageAsBase64(ss.url);
      if (imgData) {
        const imgWidth = 80;
        const imgHeight = 50;
        doc.addImage(imgData, 'JPEG', margin + 3, yPos, imgWidth, imgHeight);
        yPos += imgHeight + 5;
      } else {
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175);
        doc.text('[Screenshot unavailable]', margin + 3, yPos + 3);
        yPos += 10;
      }
    }

    // Separator
    yPos += 4;
    if (yPos > 277) {
      doc.addPage();
      yPos = 20;
    } else {
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 6;
    }
  }

  doc.save(`trade-journal-${now.toISOString().split('T')[0]}.pdf`);
}