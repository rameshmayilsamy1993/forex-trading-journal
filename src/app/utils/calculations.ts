import { Trade, TradeStats } from '../types/trading';

export const calculateRiskReward = (trade: Trade): number | undefined => {
  if (!trade.stopLoss || !trade.takeProfit) return undefined;

  const risk = Math.abs(trade.entryPrice - trade.stopLoss);
  const reward = Math.abs(trade.takeProfit - trade.entryPrice);

  if (risk === 0) return undefined;

  return reward / risk;
};

export const calculateTradeProfit = (trade: Trade): number => {
  if (trade.status === 'OPEN' || !trade.exitPrice) return 0;

  const priceDiff = trade.type === 'BUY'
    ? trade.exitPrice - trade.entryPrice
    : trade.entryPrice - trade.exitPrice;

  return priceDiff * trade.lotSize * 100000; // Standard lot calculation
};

export const calculateTradeStats = (trades: Trade[]): TradeStats => {
  const closedTrades = trades.filter(t => t.status === 'CLOSED' && t.profit !== undefined);

  const winningTrades = closedTrades.filter(t => (t.profit || 0) > 0);
  const losingTrades = closedTrades.filter(t => (t.profit || 0) < 0);

  const totalProfit = winningTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
  const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + (t.profit || 0), 0));

  const averageWin = winningTrades.length > 0 ? totalProfit / winningTrades.length : 0;
  const averageLoss = losingTrades.length > 0 ? totalLoss / losingTrades.length : 0;

  const largestWin = winningTrades.length > 0
    ? Math.max(...winningTrades.map(t => t.profit || 0))
    : 0;
  const largestLoss = losingTrades.length > 0
    ? Math.min(...losingTrades.map(t => t.profit || 0))
    : 0;

  return {
    totalTrades: closedTrades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    winRate: closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0,
    totalProfit,
    totalLoss,
    netProfit: totalProfit - totalLoss,
    averageWin,
    averageLoss,
    profitFactor: totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0,
    largestWin,
    largestLoss,
  };
};
