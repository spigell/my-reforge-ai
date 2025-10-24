import { AgentId } from '../../types/agent.js';
import { Agent } from '../../core/ports/agent-port.js';
import { AgentsPort } from '../../core/ports/agents-port.js';
import { CodexAgent } from './codex.js';
import { GeminiAgent } from './gemini.js';

export class AgentsRegistry implements AgentsPort {
  getAgent(agentId: AgentId): Agent {
    switch (agentId) {
      case AgentId.OpenAICodex:
        return new CodexAgent();
      case AgentId.GoogleGemini25Pro:
      case AgentId.GoogleGemini25Flash:
        return new GeminiAgent();
      default:
        throw new Error(`Unknown agent: ${agentId}`);
    }
  }
}
