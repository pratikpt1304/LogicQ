import { handleFallbackRequest } from './fallbackEngine.js';

const API_BASE = '/api';
const LOCAL_BACKEND_BASE = 'http://localhost:5000/api';
const TOKEN_STORAGE_KEY = 'logicq_access_token';

interface RequestOptions extends RequestInit {
  skipAuthRefresh?: boolean;
}

function isJsonResponse(res: Response): boolean {
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json');
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
    credentials: 'include', // Include httpOnly cookies
  };

  let response: Response | null = null;
  let useFallback = false;

  try {
    response = await fetch(url, config);
    // On Firebase Static Hosting, /api/* gets rewritten to /index.html (200 OK text/html)
    if (!isJsonResponse(response)) {
      try {
        const localRes = await fetch(`${LOCAL_BACKEND_BASE}${cleanEndpoint}`, config);
        if (isJsonResponse(localRes)) {
          response = localRes;
        } else {
          useFallback = true;
        }
      } catch {
        useFallback = true;
      }
    }
  } catch {
    useFallback = true;
  }

  if (useFallback || !response) {
    return (await handleFallbackRequest(cleanEndpoint, options)) as T;
  }

  // If 401 Unauthorized and not already retrying, attempt token refresh
  if (response.status === 401 && !options.skipAuthRefresh && !cleanEndpoint.includes('/auth/')) {
    try {
      const refreshBase = response.url.startsWith(LOCAL_BACKEND_BASE) ? LOCAL_BACKEND_BASE : API_BASE;
      const refreshRes = await fetch(`${refreshBase}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (refreshRes.ok && isJsonResponse(refreshRes)) {
        const refreshData = await refreshRes.json().catch(() => null);
        if (refreshData?.data?.accessToken) {
          localStorage.setItem(TOKEN_STORAGE_KEY, refreshData.data.accessToken);
          headers.set('Authorization', `Bearer ${refreshData.data.accessToken}`);
        }
        const retryUrl = `${refreshBase}${cleanEndpoint}`;
        response = await fetch(retryUrl, { ...config, headers, skipAuthRefresh: true } as any);
      }
    } catch {
      // Refresh failed, continue with original 401 response
    }
  }

  const data = await response.json().catch(() => null);

  if (!response.ok || !data) {
    const errorMsg = data?.message || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  if (data?.data?.accessToken) {
    localStorage.setItem(TOKEN_STORAGE_KEY, data.data.accessToken);
  }
  if (cleanEndpoint.includes('/auth/logout')) {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
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
  delete: <T = any>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
};
