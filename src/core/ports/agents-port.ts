import type { Agent } from '../../libs/agents/base.js';
import type { AgentId } from '../../types/agent.js';

export interface AgentsPort {
  getAgent(agentId: AgentId): Agent;
}
