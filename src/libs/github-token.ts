const GITHUB_TOKEN_ENV = 'GITHUB_TOKEN';

let cachedToken: string | undefined | null = null;

type ResolveOptions = {
  required?: boolean;
};

/**
 * Resolves the GitHub token from environment variables.
 * We cache the result to avoid re-reading process.env across consumers.
 */
export const resolveGithubToken = (
  options: ResolveOptions = {},
): string | undefined => {
  const { required = true } = options;

  if (cachedToken !== null) {
    return cachedToken ?? undefined;
  }

  const token = process.env[GITHUB_TOKEN_ENV]?.trim();

  if (!token) {
    if (process.env.GH_TOKEN) {
      throw new Error(
        'GITHUB_TOKEN environment variable is not set. Rename GH_TOKEN to GITHUB_TOKEN.',
      );
    }

    if (required) {
      throw new Error('GITHUB_TOKEN environment variable is not set.');
    }

    cachedToken = null;
    return undefined;
  }

  cachedToken = token;
  return token;
};

/**
 * Resets the cached token. Intended for use in tests.
 */
export const resetGithubTokenCache = () => {
  cachedToken = null;
};

export const githubTokenEnvName = GITHUB_TOKEN_ENV;

