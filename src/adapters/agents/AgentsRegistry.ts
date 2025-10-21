import type { AgentsPort } from '../../core/ports/agents-port.js';
import { getAgent } from '../../libs/agents/index.js';

export class AgentsRegistry implements AgentsPort {
  getAgent(agentId: Parameters<AgentsPort['getAgent']>[0]) {
    return getAgent(agentId);
  }
}
