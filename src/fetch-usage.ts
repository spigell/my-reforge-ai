#!/usr/bin/env ts-node
// To run this script, you may need to install ts-node:
// npm install -g ts-node
// Then, you can run the script directly:
// ./src/fetch-usage.ts
// Or using:
// ts-node src/fetch-usage.ts

import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Define types for the data structures we expect.
interface AuthTokens {
  access_token: string;
  account_id: string;
}

interface AuthFile {
  tokens: AuthTokens;
}

interface RateLimitWindow {
  used_percent: number;
  limit_window_seconds: number;
  reset_after_seconds: number;
  limit_reached: boolean;
}

interface UsageData {
  plan_type: string;
  rate_limit: {
    allowed: boolean;
    limit_reached: boolean;
    primary_window: RateLimitWindow;
    secondary_window: RateLimitWindow;
  };
}

/**
 * Fetches API usage data, calculates, and displays the remaining token budget for the current day.
 */
async function getTodaysRemainingUsage() {
  // Construct the path to the auth file, located in the user's home directory.
  const homeDir = os.homedir();
  const authFilePath = path.join(homeDir, '.codex', 'auth.json');

  let authData: AuthFile;
  try {
    const fileContent = await fs.readFile(authFilePath, 'utf-8');
    authData = JSON.parse(fileContent);
  } catch (error) {
    console.error(
      `Error: Could not read or parse the auth file at: ${authFilePath}`,
    );
    if (
      error instanceof Error &&
      (error as NodeJS.ErrnoException).code === 'ENOENT'
    ) {
      console.error('The file does not exist.');
    } else if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    process.exit(1);
  }

  // Extract the token and account ID from the auth file.
  const token = authData.tokens?.access_token;
  const accountId = authData.tokens?.account_id;

  if (!token || !accountId) {
    console.error(
      `Error: Could not find '.tokens.access_token' or '.tokens.account_id' in ${authFilePath}`,
    );
    process.exit(1);
  }

  // Fetch the usage data from the API endpoint.
  let usageData: UsageData;
  try {
    const response = await fetch('https://chatgpt.com/backend-api/wham/usage', {
      headers: {
        Authorization: `Bearer ${token}`,
        'chatgpt-account-id': accountId,
      },
    });

    if (!response.ok) {
      throw new Error(
        `API request failed with status ${response.status}: ${response.statusText}`,
      );
    }

    usageData = (await response.json()) as UsageData;
  } catch (error) {
    console.error('Error: Failed to fetch usage data from the API.');
    if (error instanceof Error) {
      console.error(error.message);
    }
    process.exit(1);
  }

  // Calculate the remaining daily budget from the weekly usage window.
  const weeklyUsage = usageData.rate_limit.secondary_window;
  const totalWeeklyWindowSeconds = weeklyUsage.limit_window_seconds;
  const secondsUntilReset = weeklyUsage.reset_after_seconds;

  // The API provides a weekly window. We assume it's exactly 7 days.
  const totalDaysInWindow = 7;

  const secondsPassed = totalWeeklyWindowSeconds - secondsUntilReset;
  const daysPassed = secondsPassed / (60 * 60 * 24);

  // The API provides usage as a percentage, so the total allowance is 100.
  const totalWeeklyAllowance = 100;

  // Calculate the "earned" portion of the allowance based on how much of the week has passed.
  const earnedAllowance =
    (daysPassed / totalDaysInWindow) * totalWeeklyAllowance;

  const consumedAllowance = weeklyUsage.used_percent;

  const remainingForToday = earnedAllowance - consumedAllowance;

  // Display the results to the user.
  console.log(`Plan: ${usageData.plan_type}`);
  console.log(`Total weekly usage so far: ${consumedAllowance.toFixed(2)}%`);

  console.log(`Primary limit resets in ${formatSeconds(usageData.rate_limit.primary_window.reset_after_seconds)} on ${getResetDateTime(usageData.rate_limit.primary_window.reset_after_seconds)}.`);
  console.log(`Weekly limit resets in ${formatSeconds(usageData.rate_limit.secondary_window.reset_after_seconds)} on ${getResetDateTime(usageData.rate_limit.secondary_window.reset_after_seconds)}.`);

  if (remainingForToday >= 0) {
    console.log(`
You have ${remainingForToday.toFixed(2)}% of your token budget left for today.`);
  } else {
    console.log(`
You have exceeded today's token budget by ${Math.abs(remainingForToday).toFixed(2)}%.`);

    // Provide more specific reasons for exceeding the budget
            if (usageData.rate_limit.primary_window.limit_reached) {
                console.log(
                    'Reason: You have hit your short-term (5-hour window) rate limit.',
                );
            } else if (usageData.rate_limit.limit_reached) {
                // If overall limit_reached is true but primary is not, it's likely the weekly limit.
                console.log('Reason: You have hit your overall weekly rate limit.');
            } else {
                console.log(
                    'Reason: You are currently using tokens faster than your average weekly budget. To stay within budget, try to reduce usage.',
                );
            }  }

  const dailyBudget = totalWeeklyAllowance / totalDaysInWindow;
  console.log(
    `(Your average daily budget is ~${dailyBudget.toFixed(2)}% of the weekly total)`,
  );
}

/**
 * Formats a given number of seconds into a human-readable string (e.g., "1 day, 2 hours, 30 minutes").
 * @param seconds The number of seconds to format.
 * @returns A formatted string.
 */
function formatSeconds(seconds: number): string {
  const days = Math.floor(seconds / (24 * 3600));
  seconds %= 24 * 3600;
  const hours = Math.floor(seconds / 3600);
  seconds %= 3600;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  let parts: string[] = [];
  if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
  // Only add seconds if there are no other larger units, or if it's the only unit.
  if (remainingSeconds > 0 || parts.length === 0)
    parts.push(
      `${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`,
    );

  return parts.join(', ');
}

/**
 * Calculates the exact date and time when a limit will reset.
 * @param secondsUntilReset The number of seconds until the limit resets.
 * @returns A formatted string representing the reset date and time.
 */
function getResetDateTime(secondsUntilReset: number): string {
  const now = new Date();
  const resetDate = new Date(now.getTime() + secondsUntilReset * 1000);
  return resetDate.toLocaleString();
}

// Run the script and handle any top-level errors.
getTodaysRemainingUsage().catch((error) => {
  console.error('An unexpected error occurred:', error);
  process.exit(1);
});
