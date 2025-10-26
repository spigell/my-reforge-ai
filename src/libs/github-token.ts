const GITHUB_TOKEN_ENV = 'GITHUB_TOKEN';

let cachedToken: string | undefined;
let cacheInitialized = false;

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

  if (cacheInitialized) {
    return cachedToken;
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

    return undefined;
  }

  cacheInitialized = true;
  cachedToken = token;
  return token;
};

/**
 * Resets the cached token. Intended for use in tests.
 */
export const resetGithubTokenCache = () => {
  cachedToken = undefined;
  cacheInitialized = false;
};

export const githubTokenEnvName = GITHUB_TOKEN_ENV;