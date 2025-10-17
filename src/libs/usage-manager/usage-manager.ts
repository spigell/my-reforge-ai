import winston from 'winston';
import { AgentUsage } from './agent-usage.js';
import { CodexUsage } from './codex-usage.js';
import { GoogleGeminiUsage } from './google-gemini-usage.js';

export class UsageManager {
  private agentUsage: AgentUsage;

  constructor(agent: string, logger: winston.Logger) {
    this.agentUsage = this.getAgentUsage(agent, logger);
  }

  private getAgentUsage(agent: string, logger: winston.Logger): AgentUsage {
    switch (agent) {
      case 'codex':
      case 'gemini-2.5-flash':
        return new CodexUsage(logger);
      case 'google-gemini':
        return new GoogleGeminiUsage(logger);
      default:
        logger.warn(`Unknown agent: ${agent}. Using default Codex usage manager.`);
        return new CodexUsage(logger);
    }
  }

  public async hasTokens(): Promise<boolean> {
    return this.agentUsage.hasTokens();
  }
}
