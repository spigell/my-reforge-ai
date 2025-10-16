import winston from 'winston';

export class Logger {
  private static instance: winston.Logger;

  public static getLogger(): winston.Logger {
    if (!Logger.instance) {
      Logger.instance = winston.createLogger({
        level: 'info',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} [${level}]: ${message}`;
          }),
        ),
        transports: [new winston.transports.Console()],
      });
    }
    return Logger.instance;
  }
}
