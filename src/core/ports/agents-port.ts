import type { Agent } from './agent-port.js';
import type { AgentId } from '../../types/agent.js';

export interface AgentsPort {
  getAgent(agentId: AgentId): Agent;
}
