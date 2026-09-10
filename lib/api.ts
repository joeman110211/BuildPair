import { Platform } from 'react-native';

type TokenGetter = () => Promise<string | null>;

const DEFAULT_API_TIMEOUT_MS = 12000;
const DEFAULT_AUTH_TIMEOUT_MS = 8000;

function baseUrl() {
  // Web is served by the same BuildPair Node server as the API. Always use
  // relative same-origin requests so staging, www and the eventual production
  // host cannot accidentally call a different environment or trip CORS.
  if (Platform.OS === 'web') return '';

  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!url) throw new Error('EXPO_PUBLIC_API_URL is required for native builds');
  return url.replace(/\/$/, '');
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

async function tokenWithTimeout(getToken: TokenGetter) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      getToken(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new ApiError(408, 'BuildPair could not authenticate your session. Please refresh and try again.')), DEFAULT_AUTH_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}, getToken?: TokenGetter): Promise<T> {
  const token = getToken ? await tokenWithTimeout(getToken) : null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_API_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl()}${path}`, {
      ...options,
      signal: options.signal ?? controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    const body = await response.json().catch(() => null);
    if (!response.ok) {
      throw new ApiError(response.status, body?.error ?? 'Request failed', body?.details);
    }
    return body as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(408, 'BuildPair could not reach the account service. Please try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

type ClerkLikeError = {
  errors?: { longMessage?: string; message?: string; code?: string }[];
  message?: string;
};

type ValidationIssue = {
  message?: string;
};

export function errorMessage(error: unknown) {
  if (error instanceof ApiError) {
    const issue = Array.isArray(error.details) ? (error.details[0] as ValidationIssue | undefined) : undefined;
    return issue?.message ? `${error.message}: ${issue.message}` : error.message;
  }

  if (error && typeof error === 'object') {
    const clerkError = error as ClerkLikeError;
    const first = clerkError.errors?.[0];
    if (first?.longMessage) return first.longMessage;
    if (first?.message) return first.message;
    if (typeof clerkError.message === 'string' && clerkError.message) return clerkError.message;
  }

  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}
