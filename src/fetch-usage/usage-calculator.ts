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

export class UsageCalculator {
  private async readAuthFile(): Promise<AuthFile> {
    const homeDir = os.homedir();
    const authFilePath = path.join(homeDir, '.codex', 'auth.json');

    try {
      const fileContent = await fs.readFile(authFilePath, 'utf-8');
      return JSON.parse(fileContent);
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
  }

  private async fetchUsageData(token: string, accountId: string): Promise<UsageData> {
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

      return (await response.json()) as UsageData;
    } catch (error) {
      console.error('Error: Failed to fetch usage data from the API.');
      if (error instanceof Error) {
        console.error(error.message);
      }
      process.exit(1);
    }
  }

  private formatSeconds(seconds: number): string {
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
    if (remainingSeconds > 0 || parts.length === 0)
      parts.push(
        `${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`,
      );

    return parts.join(', ');
  }

  private getResetDateTime(secondsUntilReset: number): string {
    const now = new Date();
    const resetDate = new Date(now.getTime() + secondsUntilReset * 1000);
    return resetDate.toLocaleString();
  }

  public async getTodaysRemainingUsage(): Promise<void> {
    const authData = await this.readAuthFile();

    const token = authData.tokens?.access_token;
    const accountId = authData.tokens?.account_id;

    if (!token || !accountId) {
      console.error(
        `Error: Could not find '.tokens.access_token' or '.tokens.account_id' in auth file.`,
      );
      process.exit(1);
    }

    const usageData = await this.fetchUsageData(token, accountId);

    const weeklyUsage = usageData.rate_limit.secondary_window;
    const totalWeeklyWindowSeconds = weeklyUsage.limit_window_seconds;
    const secondsUntilReset = weeklyUsage.reset_after_seconds;

    const totalDaysInWindow = 7;

    const secondsPassed = totalWeeklyWindowSeconds - secondsUntilReset;
    const daysPassed = secondsPassed / (60 * 60 * 24);

    const totalWeeklyAllowance = 100;

    const earnedAllowance =
      (daysPassed / totalDaysInWindow) * totalWeeklyAllowance;

    const consumedAllowance = weeklyUsage.used_percent;

    const remainingForToday = earnedAllowance - consumedAllowance;

    console.log(`Plan: ${usageData.plan_type}`);
    console.log(`Total weekly usage so far: ${consumedAllowance.toFixed(2)}%`);

    console.log(`Primary limit resets in ${this.formatSeconds(usageData.rate_limit.primary_window.reset_after_seconds)} on ${this.getResetDateTime(usageData.rate_limit.primary_window.reset_after_seconds)}.`);
    console.log(`Weekly limit resets in ${this.formatSeconds(usageData.rate_limit.secondary_window.reset_after_seconds)} on ${this.getResetDateTime(usageData.rate_limit.secondary_window.reset_after_seconds)}.`);

    if (remainingForToday >= 0) {
      console.log(`
You have ${remainingForToday.toFixed(2)}% of your token budget left for today.`);
    } else {
      console.log(`
You have exceeded today's token budget by ${Math.abs(remainingForToday).toFixed(2)}%.`);

      if (usageData.rate_limit.primary_window.limit_reached) {
        console.log(
          'Reason: You have hit your short-term (5-hour window) rate limit.',
        );
      } else if (usageData.rate_limit.limit_reached) {
        console.log('Reason: You have hit your overall weekly rate limit.');
      } else {
        console.log(
          'Reason: You are currently using tokens faster than your average weekly budget. To stay within budget, try to reduce usage.',
        );
      }
    }

    const dailyBudget = totalWeeklyAllowance / totalDaysInWindow;
    console.log(
      `(Your average daily budget is ~${dailyBudget.toFixed(2)}% of the weekly total)`,
    );
  }
}
