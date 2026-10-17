import { handleFallbackRequest } from './fallbackEngine.js';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const TOKEN_STORAGE_KEY = 'logicq_access_token';

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

export async function apiRequest<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE}${cleanEndpoint}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
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

  try {
    response = await fetch(url, config);
    if (!isJsonResponse(response)) {
      useFallback = true;
    }
  } catch {
    useFallback = true;
  }

  // Primary student data (auth, submissions, practice progress, profile) must never silently decay
  // into browser localStorage fallback in production.
  if (useFallback || !response) {
    if (cleanEndpoint.startsWith('/submissions') || (import.meta.env.PROD && cleanEndpoint.startsWith('/auth'))) {
      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
      // Fail closed: Replaces legacy generic "LogicQ server connection unavailable" with honest classified errors
      let errorMsg = 'LogicQ server did not respond. The judge service may be starting up or temporarily offline. Your code is saved.';
      let errorCode = 'SERVER_UNAVAILABLE';

      if (isOffline) {
        errorMsg = 'You are currently offline. Please reconnect to the internet and click Retry.';
        errorCode = 'OFFLINE';
      } else if (response && !isJsonResponse(response)) {
        errorMsg = 'LogicQ judge service is currently unreachable (server returned non-API response). Your code is safely saved locally.';
        errorCode = 'JUDGE_UNREACHABLE';
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

  // If 401 Unauthorized and not already retrying, attempt token refresh
  if (response.status === 401 && !options.skipAuthRefresh && !cleanEndpoint.includes('/auth/')) {
    try {
      const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (refreshRes.ok && isJsonResponse(refreshRes)) {
        const refreshData = await refreshRes.json().catch(() => null);
        if (refreshData?.data?.accessToken) {
          localStorage.setItem(TOKEN_STORAGE_KEY, refreshData.data.accessToken);
          headers.set('Authorization', `Bearer ${refreshData.data.accessToken}`);
        }
        response = await fetch(url, { ...config, headers, skipAuthRefresh: true } as any);
      }
    } catch {
      // Refresh failed, continue with original 401 response
    }
  }

  const data = await response.json().catch(() => null);

  if (!response.ok || !data) {
    let errorMsg = data?.message || `Request failed with status ${response.status}`;
    let errorCode = data?.code;
    let canRetry = true;

    if (response.status === 401) {
      errorMsg = 'Your session has expired. Please log in again to run or submit code.';
      errorCode = 'SESSION_EXPIRED';
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
  if (cleanEndpoint.includes('/auth/logout')) {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } else {
    try {
      localStorage.setItem('logicq_last_activity', String(Date.now()));
    } catch {
      // ignore
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
