export interface RestreamerResponse<T> {
  err: null | {
    code: number;
    message: string;
  };
  val: T | null;
}

type FetchOptions = RequestInit & {
  expect?: 'any' | 'json' | 'blob' | 'text';
  token?: string | (() => Promise<string> | string);
};

export class API {
  private base = '/api';
  private address: string;
  private token: string | (() => Promise<string> | string) = '';
  private cache = new Map<string, { payload: unknown; ts: number }>();

  constructor(address: string) {
    this.address = address;
  }

  setAddress(address: string) {
    this.address = address;
  }

  setToken(token: string | (() => Promise<string> | string)) {
    this.token = token;
  }

  clearCache() {
    this.cache.clear();
  }

  async get<T>(path: string, options?: FetchOptions): Promise<RestreamerResponse<T>> {
    return this.cachedCall('GET', path, options);
  }

  async head(path: string, options?: FetchOptions) {
    return this.call('HEAD', path, options);
  }

  async post<T>(path: string, options?: FetchOptions) {
    return this.call<T>('POST', path, options);
  }

  async put<T>(path: string, options?: FetchOptions) {
    return this.call<T>('PUT', path, options);
  }

  async patch<T>(path: string, options?: FetchOptions) {
    return this.call<T>('PATCH', path, options);
  }

  async delete<T>(path: string, options?: FetchOptions) {
    return this.call<T>('DELETE', path, options);
  }

  private async cachedCall<T>(method: string, path: string, options?: FetchOptions) {
    const key = `${method}:${path}:${JSON.stringify(options ?? {})}`;
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.ts < 950) {
      return structuredClone({ err: null, val: cached.payload as T });
    }

    const res = await this.call<T>(method, path, options);

    if (!res.err && res.val !== null) {
      this.cache.set(key, { payload: res.val, ts: Date.now() });
    }

    return res;
  }

  private async call<T>(method: string, path: string, options: FetchOptions = {}) {
    const { expect = 'any', headers = {}, token = '' } = options;
    let resolvedToken = '';

    if (typeof token === 'function') {
      resolvedToken = await token();
    } else if (typeof token === 'string' && token.length) {
      resolvedToken = token;
    } else if (typeof this.token === 'function') {
      resolvedToken = await this.token();
    } else if (typeof this.token === 'string' && this.token.length) {
      resolvedToken = this.token;
    }

    const finalHeaders = new Headers(headers);
    if (resolvedToken.length) {
      finalHeaders.set('Authorization', `Bearer ${resolvedToken}`);
    }

    const requestInit: RequestInit = {
      ...options,
      method: method.toUpperCase(),
      headers: finalHeaders,
    };

    let normalizedPath = path.startsWith('/') ? path : `/${path}`;
    if (normalizedPath !== '/' && normalizedPath.endsWith('/')) {
      normalizedPath = normalizedPath.slice(0, -1);
    }

    const url = `${this.address}${this.base}${normalizedPath}`;

    const response: RestreamerResponse<T> = { err: null, val: null };

    try {
      const res = await fetch(url, requestInit);
      if (!res.ok) {
        response.err = {
          code: res.status,
          message: res.statusText,
        };
        return response;
      }

      if (requestInit.method === 'HEAD') {
        return response;
      }

      if (expect === 'json') {
        response.val = (await res.json()) as T;
      } else if (expect === 'text') {
        response.val = (await res.text()) as unknown as T;
      } else if (expect === 'blob') {
        response.val = (await res.blob()) as unknown as T;
      } else if (expect === 'any') {
        const contentType = res.headers.get('Content-Type') ?? '';
        if (contentType.includes('application/json')) {
          response.val = (await res.json()) as T;
        } else if (contentType.startsWith('text/')) {
          response.val = (await res.text()) as unknown as T;
        } else {
          response.val = (await res.blob()) as unknown as T;
        }
      }
    } catch (error) {
      const err = error as Error;
      response.err = { code: -1, message: err.message };
    }

    return response;
  }
}
