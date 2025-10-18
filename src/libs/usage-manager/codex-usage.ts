import winston from 'winston';
import { AgentUsage } from './agent-usage.js';
import { CodexApi, RateLimitWindow } from '../codex-api/codex-api.js';

interface UsageDetails {
  planType: string;
  primaryWindow: RateLimitWindow;
  secondaryWindow: RateLimitWindow;
  overallLimitReached: boolean;
  requestsAllowed: boolean;
}

export class CodexUsage implements AgentUsage {
  private logger: winston.Logger;
  private codexApi: CodexApi;

  constructor(logger: winston.Logger, codexApi?: CodexApi) {
    this.logger = logger;
    this.codexApi = codexApi ?? new CodexApi(logger);
  }

  private async getUsageDetails(): Promise<UsageDetails> {
    const authData = await this.codexApi.readAuthFile();
    const token = authData.tokens?.access_token;
    const accountId = authData.tokens?.account_id;

    if (!token || !accountId) {
      this.logger.error(
        `Error: Could not find '.tokens.access_token' or '.tokens.account_id' in auth file.`,
      );
      process.exit(1);
    }

    const usageData = await this.codexApi.fetchUsageData(token, accountId);

    return {
      planType: usageData.plan_type,
      primaryWindow: usageData.rate_limit.primary_window,
      secondaryWindow: usageData.rate_limit.secondary_window,
      overallLimitReached: usageData.rate_limit.limit_reached,
      requestsAllowed: usageData.rate_limit.allowed,
    };
  }

  public async hasTokens(): Promise<boolean> {
    const usageDetails = await this.getUsageDetails();
    const canUseTokens =
      usageDetails.requestsAllowed &&
      !usageDetails.primaryWindow.limit_reached &&
      !usageDetails.secondaryWindow.limit_reached &&
      !usageDetails.overallLimitReached;

    this.logUsage(usageDetails, canUseTokens);
    return canUseTokens;
  }

  private logUsage(usageDetails: UsageDetails, canUseTokens: boolean): void {
    this.logger.info(`Plan: ${usageDetails.planType}`);
    this.logger.info(
      `Weekly usage: ${usageDetails.secondaryWindow.used_percent.toFixed(2)}%`,
    );
    this.logger.info(
      `Short-term usage: ${usageDetails.primaryWindow.used_percent.toFixed(2)}%`,
    );
    this.logger.info(
      `Short-term limit resets in ${this.formatSeconds(usageDetails.primaryWindow.reset_after_seconds)} (${this.getResetDateTime(usageDetails.primaryWindow.reset_after_seconds)}).`,
    );
    this.logger.info(
      `Weekly limit resets in ${this.formatSeconds(usageDetails.secondaryWindow.reset_after_seconds)} (${this.getResetDateTime(usageDetails.secondaryWindow.reset_after_seconds)}).`,
    );

    if (canUseTokens) {
      this.logger.info('Tokens available. Proceeding with the task.');
      return;
    }

    this.logger.warn('Tokens are currently unavailable.');
    if (!usageDetails.requestsAllowed) {
      this.logger.warn('Reason: requests are blocked by the provider.');
    }
    if (usageDetails.primaryWindow.limit_reached) {
      this.logger.warn('Reason: short-term rate limit reached.');
    }
    if (usageDetails.secondaryWindow.limit_reached) {
      this.logger.warn('Reason: weekly rate limit reached.');
    }
    if (usageDetails.overallLimitReached) {
      this.logger.warn('Reason: overall account limit reached.');
    }
  }

  private formatSeconds(seconds: number): string {
    const days = Math.floor(seconds / (24 * 3600));
    seconds %= 24 * 3600;
    const hours = Math.floor(seconds / 3600);
    seconds %= 3600;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    const parts: string[] = [];
    if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
    if (minutes > 0) parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
    if (remainingSeconds > 0 || parts.length === 0) {
      parts.push(
        `${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`,
      );
    }

    return parts.join(', ');
  }

  private getResetDateTime(secondsUntilReset: number): string {
    const now = new Date();
    const resetDate = new Date(now.getTime() + secondsUntilReset * 1000);
    return resetDate.toLocaleString();
  }
}
