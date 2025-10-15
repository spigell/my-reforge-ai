import { getUsage } from './usage-service.js';

export class FetchUsage {
  async run(): Promise<void> {
    try {
      const usage = await getUsage();
      console.log('Usage:', usage);
    } catch (error) {
      console.error('Error fetching usage:', error);
      process.exit(1);
    }
  }
}
