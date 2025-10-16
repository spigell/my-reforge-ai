import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import winston from 'winston';

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

interface UsageDetails {
  plan_type: string;
  consumedAllowance: number;
  remainingForToday: number;
  primaryWindow: RateLimitWindow;
  secondaryWindow: RateLimitWindow;
  limitReached: boolean;
}

export class UsageManager {
  private logger: winston.Logger;

  constructor(logger: winston.Logger) {
    this.logger = logger;
  }

  private async readAuthFile(): Promise<AuthFile> {
    const homeDir = os.homedir();
    const authFilePath = path.join(homeDir, '.codex', 'auth.json');

    try {
      const fileContent = await fs.readFile(authFilePath, 'utf-8');
      return JSON.parse(fileContent);
    } catch (error) {
      this.logger.error(
        `Error: Could not read or parse the auth file at: ${authFilePath}`,
      );
      if (
        error instanceof Error &&
        (error as NodeJS.ErrnoException).code === 'ENOENT'
      ) {
        this.logger.error('The file does not exist.');
      } else if (error instanceof Error) {
        this.logger.error(`Error details: ${error.message}`);
      }
      process.exit(1);
    }
  }

  private async fetchUsageData(
    token: string,
    accountId: string,
  ): Promise<UsageData> {
    try {
      const response = await fetch(
        'https://chatgpt.com/backend-api/wham/usage',
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'chatgpt-account-id': accountId,
          },
        },
      );

      if (!response.ok) {
        throw new Error(
          `API request failed with status ${response.status}: ${response.statusText}`,
        );
      }

      return (await response.json()) as UsageData;
    } catch (error) {
      this.logger.error('Error: Failed to fetch usage data from the API.');
      if (error instanceof Error) {
        this.logger.error(error.message);
      }
      process.exit(1);
    }
  }

  private async getUsageDetails(): Promise<UsageDetails> {
    const authData = await this.readAuthFile();
    const token = authData.tokens?.access_token;
    const accountId = authData.tokens?.account_id;

    if (!token || !accountId) {
      this.logger.error(
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

    return {
      plan_type: usageData.plan_type,
      consumedAllowance,
      remainingForToday,
      primaryWindow: usageData.rate_limit.primary_window,
      secondaryWindow: usageData.rate_limit.secondary_window,
      limitReached: usageData.rate_limit.limit_reached,
    };
  }

  public async hasTokens(): Promise<boolean> {
    const usageDetails = await this.getUsageDetails();
    this.logUsage(usageDetails);
    return usageDetails.remainingForToday >= 0;
  }

  private logUsage(usageDetails: UsageDetails): void {
    this.logger.info(`Plan: ${usageDetails.plan_type}`);
    this.logger.info(
      `Total weekly usage so far: ${usageDetails.consumedAllowance.toFixed(2)}%`,
    );
    this.logger.info(
      `Primary limit resets in ${this.formatSeconds(usageDetails.primaryWindow.reset_after_seconds)} on ${this.getResetDateTime(usageDetails.primaryWindow.reset_after_seconds)}.`,
    );
    this.logger.info(
      `Weekly limit resets in ${this.formatSeconds(usageDetails.secondaryWindow.reset_after_seconds)} on ${this.getResetDateTime(usageDetails.secondaryWindow.reset_after_seconds)}.`,
    );

    if (usageDetails.remainingForToday >= 0) {
      this.logger.info(
        `You have ${usageDetails.remainingForToday.toFixed(2)}% of your token budget left for today.`,
      );
    } else {
      this.logger.warn(
        `You have exceeded today's token budget by ${Math.abs(usageDetails.remainingForToday).toFixed(2)}%.`,
      );

      if (usageDetails.primaryWindow.limit_reached) {
        this.logger.warn(
          'Reason: You have hit your short-term (5-hour window) rate limit.',
        );
      } else if (usageDetails.limitReached) {
        this.logger.warn(
          'Reason: You have hit your overall weekly rate limit.',
        );
      } else {
        this.logger.warn(
          'Reason: You are currently using tokens faster than your average weekly budget. To stay within budget, try to reduce usage.',
        );
      }
    }

    const dailyBudget = 100 / 7;
    this.logger.info(
      `(Your average daily budget is ~${dailyBudget.toFixed(2)}% of the weekly total)`,
    );
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
    const usageDetails = await this.getUsageDetails();
    this.logUsage(usageDetails);
  }
}
