import type { LoggerPort } from '../../core/ports/LoggerPort.js';

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
