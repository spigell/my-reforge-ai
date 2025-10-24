import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import winston from 'winston';
import {
  AuthFile,
  CodexApi,
  UsageData,
} from '../adapters/codex-api/codex-api.js';
import { CodexUsage } from '../adapters/usage/codex-usage.js';

const createSilentLogger = () =>
  winston.createLogger({
    level: 'info',
    transports: [new winston.transports.Console({ silent: true })],
  });

class StubCodexApi extends CodexApi {
  private readonly usageData: UsageData;
  private readonly authFile: AuthFile;

  constructor(
    logger: winston.Logger,
    usageData: UsageData,
    authFile: AuthFile,
  ) {
    super(logger);
    this.usageData = usageData;
    this.authFile = authFile;
  }

  public async readAuthFile(): Promise<AuthFile> {
    return this.authFile;
  }

  public async fetchUsageData(): Promise<UsageData> {
    return this.usageData;
  }
}

const createUsageData = (
  overrides: Partial<UsageData['rate_limit']> & {
    primary_window?: Partial<UsageData['rate_limit']['primary_window']>;
    secondary_window?: Partial<UsageData['rate_limit']['secondary_window']>;
  } = {},
): UsageData => ({
  plan_type: 'test-plan',
  rate_limit: {
    allowed: true,
    limit_reached: false,
    primary_window: {
      used_percent: 2,
      limit_window_seconds: 18_000,
      reset_after_seconds: 9_000,
      limit_reached: false,
      ...overrides.primary_window,
    },
    secondary_window: {
      used_percent: 2,
      limit_window_seconds: 604_800,
      reset_after_seconds: 302_400,
      limit_reached: false,
      ...overrides.secondary_window,
    },
    ...overrides,
  },
});

const authFile: AuthFile = {
  tokens: {
    access_token: 'token',
    account_id: 'account',
  },
};

describe('CodexUsage', () => {
  test('returns true when usage limits are not reached', async () => {
    const logger = createSilentLogger();
    const usageData = createUsageData();
    const stubApi = new StubCodexApi(logger, usageData, authFile);
    const codexUsage = new CodexUsage(logger, stubApi);

    const result = await codexUsage.hasTokens();

    assert.strictEqual(result, true);
  });

  test('returns false when weekly limit is reached', async () => {
    const logger = createSilentLogger();
    const usageData = createUsageData({
      secondary_window: {
        limit_reached: true,
        used_percent: 100,
        limit_window_seconds: 604_800,
        reset_after_seconds: 302_400,
      },
    });
    const stubApi = new StubCodexApi(logger, usageData, authFile);
    const codexUsage = new CodexUsage(logger, stubApi);

    const result = await codexUsage.hasTokens();

    assert.strictEqual(result, false);
  });

  test('returns false when short-term limit blocks requests', async () => {
    const logger = createSilentLogger();
    const usageData = createUsageData({
      primary_window: {
        limit_reached: true,
        used_percent: 100,
        limit_window_seconds: 18_000,
        reset_after_seconds: 1_800,
      },
    });
    const stubApi = new StubCodexApi(logger, usageData, authFile);
    const codexUsage = new CodexUsage(logger, stubApi);

    const result = await codexUsage.hasTokens();

    assert.strictEqual(result, false);
  });

  test('returns false when provider does not allow requests', async () => {
    const logger = createSilentLogger();
    const usageData = createUsageData({
      allowed: false,
    });
    const stubApi = new StubCodexApi(logger, usageData, authFile);
    const codexUsage = new CodexUsage(logger, stubApi);

    const result = await codexUsage.hasTokens();

    assert.strictEqual(result, false);
  });
});
