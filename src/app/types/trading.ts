export interface PropFirm {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface TradingAccount {
  id: string;
  name: string;
  propFirmId: string | PropFirm;
  initialBalance: number;
  currentBalance: number;
  currency: string;
  createdAt: string;
}

export type TradeType = 'BUY' | 'SELL';
export type TradeStatus = 'OPEN' | 'CLOSED';
export type TradingSession = string;

export type MasterType = 'strategy' | 'keyLevel' | 'session';

export interface MasterData {
  id: string;
  name: string;
  type: MasterType;
}

export interface Trade {
  id: string;
  accountId: string;
  propFirmId: string;
  pair: string;
  type: TradeType;
  status: TradeStatus;
  entryPrice: number;
  exitPrice?: number;
  lotSize: number;
  entryDate: string;
  entryTime?: string;
  exitDate?: string;
  exitTime?: string;
  profit?: number;
  notes?: string;
  stopLoss?: number;
  takeProfit?: number;
  riskRewardRatio?: number;
  session?: TradingSession;
  strategy?: string;
  keyLevel?: string;
  beforeScreenshot?: string;
  afterScreenshot?: string;
  highLowTime?: string;
}

export interface TradeStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalProfit: number;
  totalLoss: number;
  netProfit: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  largestWin: number;
  largestLoss: number;
}

export type MissedTradeStatus = 'MISSED' | 'REVIEWED';

export interface MissedTrade {
  id: string;
  accountId: string;
  pair: string;
  type: TradeType;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  rr: number;
  date: string;
  time?: string;
  session?: string;
  strategy?: string;
  keyLevel?: string;
  reason: string;
  emotion?: string;
  status: MissedTradeStatus;
  screenshots?: {
    before?: string;
    after?: string;
  };
  createdAt: string;
}
