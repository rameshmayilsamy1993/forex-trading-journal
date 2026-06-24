const { spawn } = require('child_process');
const path = require('path');

const PYTHON_SCRIPT = path.resolve(__dirname, '../../../../python/MT5/run.py');
const PYTHON_CMD = process.env.PYTHON_PATH || 'python';

const TIMEFRAMES = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1', 'MN1'];

function validateParams(symbol, timeframe, lookback) {
  const errors = [];
  if (!symbol || typeof symbol !== 'string') errors.push('symbol is required');
  if (!timeframe || !TIMEFRAMES.includes(timeframe.toUpperCase())) errors.push(`timeframe must be one of: ${TIMEFRAMES.join(', ')}`);
  if (!lookback || !Number.isInteger(Number(lookback)) || Number(lookback) < 2 || Number(lookback) > 50000) errors.push('lookback must be an integer between 2 and 50000');
  return errors;
}

function runPython(symbol, timeframe, lookback) {
  return new Promise((resolve, reject) => {
    const args = [
      PYTHON_SCRIPT,
      '--symbol', symbol.toUpperCase(),
      '--timeframe', timeframe.toUpperCase(),
      '--lookback', String(lookback),
      '--format', 'json',
    ];

    const proc = spawn(PYTHON_CMD, args);
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `Python process exited with code ${code}`));
      } else {
        try {
          const parsed = JSON.parse(stdout);
          resolve(parsed);
        } catch (err) {
          reject(new Error(`Failed to parse Python output: ${err.message}`));
        }
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to start Python process: ${err.message}`));
    });
  });
}

const analyze = async (req, res, next) => {
  try {
    const { symbol, timeframe, lookback } = req.body;
    const errors = validateParams(symbol, timeframe, lookback);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join('; ') });
    }

    const results = await runPython(symbol, timeframe, Number(lookback));
    res.json(results);
  } catch (error) {
    next(error);
  }
};

const exportResults = async (req, res, next) => {
  try {
    const { symbol, timeframe, lookback, format } = req.query;
    const errors = validateParams(symbol, timeframe, lookback);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join('; ') });
    }
    if (!['csv', 'xlsx', 'json'].includes(format)) {
      return res.status(400).json({ message: 'format must be csv, xlsx, or json' });
    }

    const results = await runPython(symbol, timeframe, Number(lookback));

    const { get_download_bytes } = require(path.resolve(__dirname, '../../../../python/MT5/mt5_candle_stats/export'));
    const fileBytes = get_download_bytes(results, format);

    const mimeTypes = { csv: 'text/csv', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', json: 'application/json' };
    const filename = `${symbol}_${timeframe}_${lookback}.${format}`;

    res.setHeader('Content-Type', mimeTypes[format]);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(Buffer.from(fileBytes));
  } catch (error) {
    next(error);
  }
};

module.exports = { analyze, exportResults };
