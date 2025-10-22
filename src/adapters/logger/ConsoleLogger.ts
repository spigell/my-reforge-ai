import type { LoggerPort } from '../../core/ports/logger-port.js';

export class ConsoleLogger implements LoggerPort {
  info(message: string) {
    console.log(message);
  }

  warn(message: string) {
    console.warn(message);
  }

  error(message: string) {
    console.error(message);
  }

  debug(message: string) {
    console.debug(message);
  }
}
