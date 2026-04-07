const isDev = import.meta.env.DEV;

export const logger = {
  log: (message: string, data?: unknown) => {
    if (isDev) {
      console.log(`[LOG] ${message}`, data ?? '');
    }
  },
  error: (message: string, error?: unknown) => {
    console.error(`[ERROR] ${message}`, error ?? '');
  },
  warn: (message: string, data?: unknown) => {
    if (isDev) {
      console.warn(`[WARN] ${message}`, data ?? '');
    }
  },
  info: (message: string, data?: unknown) => {
    if (isDev) {
      console.info(`[INFO] ${message}`, data ?? '');
    }
  },
};

export function logPageLoad(pageName: string) {
  logger.log(`[PAGE] ${pageName} loaded`);
}

export function logApiCall(endpoint: string, status: 'start' | 'success' | 'error') {
  if (status === 'start') {
    logger.log(`[API] Calling ${endpoint}...`);
  } else if (status === 'success') {
    logger.log(`[API] ${endpoint} success`);
  } else {
    logger.warn(`[API] ${endpoint} failed`);
  }
}

export function logStateUpdate(component: string, state: string) {
  if (isDev) {
    logger.log(`[STATE] ${component}: ${state}`);
  }
}

export default logger;
