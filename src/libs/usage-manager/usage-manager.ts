import winston from 'winston';
import { AgentId } from '../../types/agent.js';
import { AgentUsage } from './agent-usage.js';
import { CodexUsage } from './codex-usage.js';
import { GoogleGeminiUsage } from './google-gemini-usage.js';

export class UsageManager {
  private agentUsage: AgentUsage;

  constructor(agent: AgentId, logger: winston.Logger) {
    this.agentUsage = this.getAgentUsage(agent, logger);
  }

  private getAgentUsage(agent: AgentId, logger: winston.Logger): AgentUsage {
    switch (agent) {
      case AgentId.OpenAICodex:
        return new CodexUsage(logger);
      case AgentId.GoogleGemini25Flash:
      case AgentId.GoogleGemini25Pro:
        return new GoogleGeminiUsage(logger);
      default:
        throw new Error(`Unknown agent "${agent}"`);
    }
  }

  public async hasTokens(): Promise<boolean> {
    return this.agentUsage.hasTokens();
  }
}
