import { AgentUsage } from './agent-usage.js';
import winston from 'winston';

export class GoogleGeminiUsage implements AgentUsage {
  private logger: winston.Logger;

  constructor(logger: winston.Logger) {
    this.logger = logger;
  }

  public async hasTokens(): Promise<boolean> {
    this.logger.warn('GoogleGeminiUsage.hasTokens() is not implemented yet. Defaulting to true.');
    // In a real implementation, this would check Gemini API usage.
    return true;
  }
}
