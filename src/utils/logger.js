/**
 * A basic structured logger for observability.
 * In a production environment, this would forward logs to an external service like Sentry or Datadog.
 */
const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

// Default log level based on environment or set to INFO
const currentLevel = LogLevel.INFO;

function log(level, message, context = {}) {
  if (level < currentLevel) return;

  const entry = {
    timestamp: new Date().toISOString(),
    level: Object.keys(LogLevel).find(k => LogLevel[k] === level),
    message,
    ...context,
  };

  switch (level) {
    case LogLevel.DEBUG:
      console.debug(JSON.stringify(entry));
      break;
    case LogLevel.INFO:
      console.info(JSON.stringify(entry));
      break;
    case LogLevel.WARN:
      console.warn(JSON.stringify(entry));
      break;
    case LogLevel.ERROR:
      console.error(JSON.stringify(entry));
      break;
  }
}

export const logger = {
  debug: (message, context) => log(LogLevel.DEBUG, message, context),
  info: (message, context) => log(LogLevel.INFO, message, context),
  warn: (message, context) => log(LogLevel.WARN, message, context),
  error: (message, context) => log(LogLevel.ERROR, message, context),
};
