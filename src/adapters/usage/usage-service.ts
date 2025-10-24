import { AgentId } from '../../types/agent.js';
import { UsageServicePort } from '../../core/ports/usage-service-port.js';
import { LoggerPort } from '../../core/ports/logger-port.js';
import { UsageManager } from './usage-manager.js';

export class UsageServiceAdapter implements UsageServicePort {
  private logger: LoggerPort;

  constructor(logger: LoggerPort) {
    this.logger = logger;
  }

  async hasTokens(agent: AgentId): Promise<boolean> {
    const usageManager = new UsageManager(agent, this.logger);
    return usageManager.hasTokens();
  }
}
