import { LoggerPort } from '../../core/ports/logger-port.js';
import { AgentUsage } from './agent-usage.js';

export class GoogleGeminiUsage implements AgentUsage {
  private readonly logger: LoggerPort;

  constructor(logger: LoggerPort) {
    this.logger = logger;
  }

  public async hasTokens(): Promise<boolean> {
    this.logger.warn(
      'GoogleGeminiUsage.hasTokens() is not implemented yet. Defaulting to true.',
    );
    // In a real implementation, this would check Gemini API usage.
    return true;
  }
}
