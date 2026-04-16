const Settings = require('../modules/settings/settings.model');

const pairCache = {
  data: null,
  timestamp: null,
  ttl: 5 * 60 * 1000
};

const getCachedPairs = async () => {
  const now = Date.now();
  if (pairCache.data && pairCache.timestamp && (now - pairCache.timestamp < pairCache.ttl)) {
    return pairCache.data;
  }

  const settings = await Settings.findOne({ key: 'pairs' });
  const pairs = settings ? settings.value : ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD'];

  pairCache.data = pairs;
  pairCache.timestamp = now;

  return pairs;
};

const invalidatePairCache = () => {
  pairCache.data = null;
  pairCache.timestamp = null;
};

const calculateRealPL = (profit, commission, swap) => {
  const p = parseFloat(profit) || 0;
  const c = Math.abs(parseFloat(commission) || 0);
  const s = Math.abs(parseFloat(swap) || 0);
  return Number((p - c - s).toFixed(2));
};

module.exports = { getCachedPairs, invalidatePairCache, calculateRealPL };
