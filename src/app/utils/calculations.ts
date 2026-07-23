import { Trade, TradeStats } from '../types/trading';

export type TradeCategory = 'win' | 'be' | 'loss';

export const getRealPL = (trade: Trade): number => {
  return (trade as any).realPL ?? ((trade.profit || 0) - Math.abs(trade.commission || 0) - Math.abs(((trade as any).swap || 0)));
};

export const getTradeCategory = (trade: Trade): TradeCategory => {
  const pl = getRealPL(trade);
  if (pl > 50) return 'win';
  if (pl < -50) return 'loss';
  return 'be';
};

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

export const formatPrice = (value?: number, pair?: string): string => {
  if (value === undefined || value === null) return '-';

  if (pair) {
    const upper = pair.toUpperCase();
    if (['XAUUSD', 'BTCUSD', 'GC1!', 'MGC1!', 'MCG1!', 'QO1!'].includes(upper)) return value.toFixed(2);
    if (upper === 'USDJPY' || upper === 'JPYUSD') return value.toFixed(3);
    if (['EURUSD', 'GBPUSD', 'AUDUSD', 'NZDUSD', 'USDCAD', 'USDCHF', 'EURGBP', 'EURAUD', 'EURJPY', 'GBPJPY', 'AUDJPY'].includes(upper)) return value.toFixed(5);
  }

  return value.toFixed(5);
};

export const formatMoney = (value?: number, showPlus = false): string => {
  if (value === undefined || Number.isNaN(value)) return '-';
  const prefix = showPlus && value > 0 ? '+$' : value < 0 ? '-$' : '$';
  return `${prefix}${Math.abs(value).toFixed(2)}`;
};

export interface KeyLevelStat {
  keyLevel: string;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  netPL: number;
}

export const calculateKeyLevelStats = (trades: Trade[]): KeyLevelStat[] => {
  const closedTrades = trades.filter(t => t.status === 'CLOSED' && t.profit !== undefined);
  const grouped = new Map<string, KeyLevelStat>();

  for (const trade of closedTrades) {
    const kl = trade.keyLevel || 'No Key Level';
    const pl = getRealPL(trade);
    const existing = grouped.get(kl) || { keyLevel: kl, trades: 0, wins: 0, losses: 0, winRate: 0, netPL: 0 };
    existing.trades += 1;
    existing.netPL += pl;
    if (pl > 0) existing.wins += 1;
    else if (pl < 0) existing.losses += 1;
    grouped.set(kl, existing);
  }

  const stats = Array.from(grouped.values());
  for (const stat of stats) {
    stat.winRate = stat.trades > 0 ? (stat.wins / stat.trades) * 100 : 0;
  }
  return stats.sort((a, b) => b.trades - a.trades);
};

export const calculateTradeStats = (trades: Trade[]): TradeStats => {
  const closedTrades = trades.filter(t => t.status === 'CLOSED' && t.profit !== undefined);

  const winningTrades = closedTrades.filter(t => getRealPL(t) > 0);
  const losingTrades = closedTrades.filter(t => getRealPL(t) < 0);

  const totalProfit = winningTrades.reduce((sum, t) => sum + getRealPL(t), 0);
  const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + getRealPL(t), 0));

  const averageWin = winningTrades.length > 0 ? totalProfit / winningTrades.length : 0;
  const averageLoss = losingTrades.length > 0 ? totalLoss / losingTrades.length : 0;

  const largestWin = winningTrades.length > 0
    ? Math.max(...winningTrades.map(t => getRealPL(t)))
    : 0;
  const largestLoss = losingTrades.length > 0
    ? Math.min(...losingTrades.map(t => getRealPL(t)))
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
