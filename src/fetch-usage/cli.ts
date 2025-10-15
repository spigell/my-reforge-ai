import { UsageCalculator } from './usage-calculator.js';

async function main() {
  const calculator = new UsageCalculator();
  await calculator.getTodaysRemainingUsage();
}

main().catch((error) => {
  console.error('An unexpected error occurred:', error);
  process.exit(1);
});
