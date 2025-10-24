import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { LoggerPort } from '../../core/ports/logger-port.js';

// Define types for the data structures we expect.
export interface AuthTokens {
  access_token: string;
  account_id: string;
}

export interface AuthFile {
  tokens: AuthTokens;
}

export interface RateLimitWindow {
  used_percent: number;
  limit_window_seconds: number;
  reset_after_seconds: number;
  limit_reached: boolean;
}

export interface UsageData {
  plan_type: string;
  rate_limit: {
    allowed: boolean;
    limit_reached: boolean;
    primary_window: RateLimitWindow;
    secondary_window: RateLimitWindow;
  };
}

export class CodexApi {
  private logger: LoggerPort;

  constructor(logger: LoggerPort) {
    this.logger = logger;
  }

  public async readAuthFile(): Promise<AuthFile> {
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

  public async fetchUsageData(
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
}
