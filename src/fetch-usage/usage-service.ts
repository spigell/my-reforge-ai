import { getUsage as getCodexUsage } from '@codex/api';
import { config } from 'dotenv-safe';

config(); // Load environment variables

export async function getUsage(): Promise<any> {
  return getCodexUsage();
}
