import { handleFallbackRequest } from './fallbackEngine.js';
import { auth } from '../config/firebase.js';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const TOKEN_STORAGE_KEY = 'logicq_access_token';
const REFRESH_TOKEN_STORAGE_KEY = 'logicq_refresh_token';

interface RequestOptions extends RequestInit {
  skipAuthRefresh?: boolean;
}

function isJsonResponse(res: Response): boolean {
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json');
}

export interface LogicQApiError extends Error {
  status?: number;
  code?: string;
  isOffline?: boolean;
  canRetry?: boolean;
  queuePosition?: number;
  ended?: boolean;
  todayChallengeUrl?: string;
}



let activeRefreshPromise: Promise<string | null> | null = null;

async function refreshAuthSession(): Promise<string | null> {
  if (activeRefreshPromise) {
    return activeRefreshPromise;
  }

  activeRefreshPromise = (async () => {
    try {
      const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);

      // 1. Try backend refresh endpoint
      if (storedRefreshToken) {
        try {
          const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ refreshToken: storedRefreshToken }),
          });

          if (refreshRes.ok && isJsonResponse(refreshRes)) {
            const refreshData = await refreshRes.json().catch(() => null);
            const token = refreshData?.data?.accessToken;
            if (typeof token === 'string' && token.length > 0) {
              localStorage.setItem(TOKEN_STORAGE_KEY, token);
              const rToken = refreshData?.data?.refreshToken;
              if (typeof rToken === 'string' && rToken.length > 0) {
                localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, rToken);
              }
              return token;
            }
          } else if (refreshRes.status === 401 || refreshRes.status === 403) {
            // Expired/invalid refresh token: wipe immediately to eliminate recursive 401 spam
            localStorage.removeItem(TOKEN_STORAGE_KEY);
            localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
          }
        } catch {
          // Continue to Firebase Auth fallback
        }
      }

      // 2. Silent Firebase Auth token re-exchange
      if (auth.currentUser) {
        try {
          const idToken = await auth.currentUser.getIdToken(true);
          const googleRes = await fetch(`${API_BASE}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              idToken,
              email: auth.currentUser.email,
              avatarUrl: auth.currentUser.photoURL,
              googleId: auth.currentUser.uid,
            }),
          });
          if (googleRes.ok && isJsonResponse(googleRes)) {
            const googleData = await googleRes.json().catch(() => null);
            const token = googleData?.data?.accessToken;
            if (typeof token === 'string' && token.length > 0) {
              localStorage.setItem(TOKEN_STORAGE_KEY, token);
              const rToken = googleData?.data?.refreshToken;
              if (typeof rToken === 'string' && rToken.length > 0) {
                localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, rToken);
              }
              return token;
            }
          }
        } catch {
          // ignore
        }
      }

      // If both backend refresh and Firebase re-exchange fail, wipe dead tokens
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
      return null;
    } finally {
      activeRefreshPromise = null;
    }
  })();

  return activeRefreshPromise;
}

export async function apiRequest<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('logicq_last_activity', String(Date.now()));
    }
  } catch {}
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE}${cleanEndpoint}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  let savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!savedToken && typeof window !== 'undefined' && auth.currentUser) {
    try {
      const idToken = await auth.currentUser.getIdToken();
      const googleRes = await fetch(`${API_BASE}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken,
          email: auth.currentUser.email,
          avatarUrl: auth.currentUser.photoURL,
          googleId: auth.currentUser.uid,
        }),
      });
      if (googleRes.ok && isJsonResponse(googleRes)) {
        const googleData = await googleRes.json().catch(() => null);
        const token = googleData?.data?.accessToken;
        if (typeof token === 'string' && token.length > 0) {
          savedToken = token;
          localStorage.setItem(TOKEN_STORAGE_KEY, token);
          const rToken = googleData?.data?.refreshToken;
          if (typeof rToken === 'string' && rToken.length > 0) {
            localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, rToken);
          }
        }
      }
    } catch {
      // ignore
    }
  }

  if (savedToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${savedToken}`);
  }

  const config: RequestInit = {
    ...options,
    headers,
    credentials: 'include',
  };

  let response: Response | null = null;
  let useFallback = false;

  // Resilient retry loop to smoothly absorb Render free tier cold-starts (502/503/504)
  const maxAttempts = (cleanEndpoint.startsWith('/auth') || cleanEndpoint.startsWith('/sections') || cleanEndpoint.startsWith('/admin') || cleanEndpoint.startsWith('/practice') || cleanEndpoint.startsWith('/submissions')) ? 3 : 1;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const fetchConfig: RequestInit = { ...config };
      if (!fetchConfig.signal && typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal) {
        // Generous 45s timeout to seamlessly absorb Render free tier spin-up
        fetchConfig.signal = (AbortSignal as any).timeout(45000);
      }
      response = await fetch(url, fetchConfig);
      if (response && (response.status === 502 || response.status === 503 || response.status === 504) && attempt < maxAttempts) {
        await new Promise((res) => setTimeout(res, 2000 * attempt));
        continue;
      }
      if (!isJsonResponse(response)) {
        if (attempt < maxAttempts) {
          await new Promise((res) => setTimeout(res, 2000 * attempt));
          continue;
        }
        useFallback = true;
      }
      break;
    } catch {
      if (attempt < maxAttempts) {
        await new Promise((res) => setTimeout(res, 2000 * attempt));
        continue;
      }
      useFallback = true;
    }
  }

  // Primary student data (auth, submissions, practice progress, profile) must never silently decay
  // into browser localStorage fallback in production.
  if (useFallback || !response) {
    if (cleanEndpoint.startsWith('/submissions') || (import.meta.env.PROD && cleanEndpoint.startsWith('/auth') && !cleanEndpoint.includes('-otp') && !cleanEndpoint.includes('change-password'))) {
      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
      // Fail closed: Replaces legacy generic "LogicQ server connection unavailable" with honest classified errors
      let errorMsg = cleanEndpoint.startsWith('/submissions')
        ? 'LogicQ server did not respond. The judge service may be starting up or temporarily offline. Your code is saved.'
        : 'Server is temporarily unavailable. Please try again in a moment.';
      let errorCode = 'SERVER_UNAVAILABLE';

      if (isOffline) {
        errorMsg = 'You are currently offline. Please reconnect to the internet and click Retry.';
        errorCode = 'OFFLINE';
      } else if (response && !isJsonResponse(response)) {
        errorMsg = cleanEndpoint.startsWith('/submissions')
          ? 'Judge service unreachable: server returned unexpected response. Your code is safely saved to your account.'
          : 'Server returned an unexpected response. Please try again.';
        errorCode = cleanEndpoint.startsWith('/submissions') ? 'JUDGE_UNREACHABLE' : 'SERVER_ERROR';
      }

      const err = new Error(errorMsg) as LogicQApiError;
      err.status = response?.status;
      err.code = errorCode;
      err.isOffline = isOffline;
      err.canRetry = true;
      throw err;
    }
    return (await handleFallbackRequest(cleanEndpoint, options)) as T;
  }

  // If 401 Unauthorized and not already retrying, attempt token refresh or silent Firebase Auth re-exchange
  if (response.status === 401 && !options.skipAuthRefresh && !cleanEndpoint.includes('/auth/')) {
    try {
      const refreshedAccessToken = await refreshAuthSession();
      if (refreshedAccessToken) {
        headers.set('Authorization', `Bearer ${refreshedAccessToken}`);
        response = await fetch(url, { ...config, headers, skipAuthRefresh: true } as any);
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
      }
    } catch {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    }
  }

  const data = await response.json().catch(() => null);

  if (!response.ok || !data) {
    if (cleanEndpoint.includes('-otp')) {
      try {
        const fallbackRes = await handleFallbackRequest(cleanEndpoint, options);
        if (fallbackRes && typeof fallbackRes === 'object') {
          return fallbackRes as T;
        }
      } catch (fallbackErr: any) {
        // Continue to server error if fallback didn't resolve
      }
      if (data && data.message) {
        const err = new Error(data.message) as LogicQApiError;
        err.status = response.status;
        throw err;
      }
    }
    let errorMsg = data?.message || (!data 
      ? (cleanEndpoint.startsWith('/submissions')
          ? 'Judge service unreachable: server returned unexpected response. Your code is safely saved to your account.'
          : 'Server returned an unexpected response. Please try again in a moment.')
      : `Request failed with status ${response.status}`);
    let errorCode = data?.code || (!data ? 'INVALID_RESPONSE' : undefined);
    let canRetry = true;

    if (response.status === 401) {
      if (cleanEndpoint.includes('/auth/login') || cleanEndpoint.includes('/auth/prn-login') || cleanEndpoint.includes('/auth/verify-login-otp') || cleanEndpoint.includes('/auth/send-login-otp')) {
        errorMsg = data?.message || 'Invalid PRN or password. Please verify your credentials.';
        errorCode = 'INVALID_CREDENTIALS';
      } else {
        errorMsg = 'Your session has expired. Please log in again to run or submit code.';
        errorCode = 'SESSION_EXPIRED';
      }
      canRetry = false;
    } else if (response.status === 429) {
      errorMsg = 'Submission limit reached. Please wait a few seconds before trying again.';
      errorCode = 'RATE_LIMITED';
      canRetry = true;
    } else if (response.status === 503) {
      errorMsg = data?.message || 'LogicQ judge is busy processing submissions. Please wait a moment.';
      errorCode = 'JUDGE_BUSY';
      canRetry = true;
    } else if (response.status === 504) {
      errorMsg = 'Code execution timed out. The server did not respond.';
      errorCode = 'TIMEOUT';
      canRetry = true;
    }

    const err = new Error(errorMsg) as LogicQApiError;
    err.status = response.status;
    err.code = errorCode;
    err.canRetry = canRetry;
    err.queuePosition = data?.queuePosition;
    err.ended = Boolean(data?.ended);
    err.todayChallengeUrl = data?.todayChallengeUrl;
    throw err;
  }

  if (data?.data?.accessToken) {
    localStorage.setItem(TOKEN_STORAGE_KEY, data.data.accessToken);
  }
  if (data?.data?.refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, data.data.refreshToken);
  }
  if (cleanEndpoint.includes('/auth/logout')) {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  } else {
    try {
      localStorage.setItem('logicq_last_activity', String(Date.now()));
    } catch {
      // ignore
    }
  }

  // Strict Daily Challenge Isolation: Never allow a practice or kanetkar problem as the daily challenge!
  if (cleanEndpoint === '/problems/daily' || cleanEndpoint.endsWith('/problems/daily')) {
    const prob = data?.data?.problem;
    if (
      prob &&
      (prob.isPractice === true ||
        prob.sourceType === 'PRACTICE' ||
        prob.sourceType === 'BOOK' ||
        prob.slug?.startsWith('practice-') ||
        prob.slug?.startsWith('kanetkar-') ||
        Boolean(prob.moduleSlug))
    ) {
      console.warn('Daily endpoint returned practice question; substituting pure daily challenge.');
      return (await handleFallbackRequest('/problems/daily', options)) as T;
    }
  }

  if (
    cleanEndpoint.startsWith('/problems/') &&
    !cleanEndpoint.includes('/history') &&
    !cleanEndpoint.includes('/submissions') &&
    !cleanEndpoint.includes('/batch')
  ) {
    const prob = data?.data?.problem || data?.data;
    if (
      prob &&
      typeof window !== 'undefined' &&
      window.location.pathname.startsWith('/challenge') &&
      !window.location.pathname.includes('/practice') &&
      (prob.isPractice === true ||
        prob.sourceType === 'PRACTICE' ||
        prob.sourceType === 'BOOK' ||
        prob.slug?.startsWith('practice-') ||
        prob.slug?.startsWith('kanetkar-') ||
        Boolean(prob.moduleSlug))
    ) {
      console.warn('Challenge workspace received practice question; substituting pure daily challenge.');
      return (await handleFallbackRequest('/problems/daily', options)) as T;
    }
  }

  return data;
}

export const api = {
  get: <T = any>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),
  post: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),
  patch: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T = any>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
};
