const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('knowbase_token') : null;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    // Token 过期自动跳转登录页
    if (res.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('knowbase_token');
      window.location.href = '/login';
      throw new Error('登录已过期，请重新登录');
    }
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.detail?.message || error.message || `API Error ${res.status}`);
  }

  return res;
}

export async function apiJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, options);
  return res.json();
}

/**
 * Upload a file via multipart/form-data.
 * Does NOT set Content-Type so the browser adds the correct multipart boundary.
 */
export async function apiUpload<T>(path: string, body: FormData): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('knowbase_token') : null;

  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.detail?.message || error.message || `API Error ${res.status}`);
  }

  return res.json();
}

/**
 * Start an SSE stream via fetch + ReadableStream.
 * Returns the raw Response so callers can read the body stream.
 */
export async function apiStream(path: string, options: RequestInit = {}): Promise<Response> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('knowbase_token') : null;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.detail?.message || error.message || `API Error ${res.status}`);
  }

  return res;
}
