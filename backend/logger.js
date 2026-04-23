import { config } from "./config.js";

const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const logLevelMap = {
  debug: LogLevel.DEBUG,
  info: LogLevel.INFO,
  warn: LogLevel.WARN,
  error: LogLevel.ERROR,
};

const currentLogLevel = logLevelMap[config.LOG_LEVEL] || LogLevel.INFO;

const formatTimestamp = () => {
  return new Date().toISOString();
};

const createLogger = (namespace) => {
  return {
    debug: (message, data = "") => {
      if (currentLogLevel <= LogLevel.DEBUG) {
        console.log(
          `[${formatTimestamp()}] [DEBUG] [${namespace}] ${message}`,
          data,
        );
      }
    },
    info: (message, data = "") => {
      if (currentLogLevel <= LogLevel.INFO) {
        console.log(
          `[${formatTimestamp()}] [INFO] [${namespace}] ${message}`,
          data,
        );
      }
    },
    warn: (message, data = "") => {
      if (currentLogLevel <= LogLevel.WARN) {
        console.warn(
          `[${formatTimestamp()}] [WARN] [${namespace}] ${message}`,
          data,
        );
      }
    },
    error: (message, data = "") => {
      if (currentLogLevel <= LogLevel.ERROR) {
        console.error(
          `[${formatTimestamp()}] [ERROR] [${namespace}] ${message}`,
          data,
        );
      }
    },
  };
};

export default createLogger;
