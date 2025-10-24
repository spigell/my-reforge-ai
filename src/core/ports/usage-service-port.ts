import { AgentId } from '../../types/agent.js';

export interface UsageServicePort {
  hasTokens(agent: AgentId): Promise<boolean>;
}
