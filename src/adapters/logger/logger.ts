import { createLogger, transports, format } from 'winston';
import type { LoggerPort } from '../../core/ports/logger-port.js';

const baseLogger = createLogger({
  level: process.env.LOG_LEVEL ?? 'info',
  transports: [
    new transports.Console({
      format: format.combine(
        format.timestamp(),
        format.colorize(),
        format.printf(({ level, message, timestamp }) => {
          return `[${timestamp}][${level}] ${message}`;
        }),
      ),
    }),
  ],
});

export class ConsoleLogger implements LoggerPort {
  info(message: string) {
    baseLogger.info(message);
  }

  warn(message: string) {
    baseLogger.warn(message);
  }

  error(message: string) {
    baseLogger.error(message);
  }

  debug(message: string) {
    if (baseLogger.isLevelEnabled('debug')) {
      baseLogger.debug(message);
    }
  }
}
