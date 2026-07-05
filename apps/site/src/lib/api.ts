export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors?: Record<string, string>;
  readonly code?: string;
  constructor(
    status: number,
    message: string,
    fieldErrors?: Record<string, string>,
    code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.code = code;
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      message?: string;
      fieldErrors?: Record<string, string>;
      code?: string;
    };
    throw new ApiError(
      res.status,
      body.message ?? `Request failed (${res.status})`,
      body.fieldErrors,
      body.code,
    );
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function jsonInit(method: string, body?: unknown): RequestInit {
  return {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  };
}

export const api = {
  get: <T>(url: string, signal?: AbortSignal): Promise<T> =>
    fetch(url, { signal }).then((r) => handle<T>(r)),
  post: <T>(url: string, body?: unknown): Promise<T> =>
    fetch(url, jsonInit('POST', body)).then((r) => handle<T>(r)),
  postForm: <T>(url: string, form: FormData): Promise<T> =>
    fetch(url, { method: 'POST', body: form }).then((r) => handle<T>(r)),
  patch: <T>(url: string, body?: unknown): Promise<T> =>
    fetch(url, jsonInit('PATCH', body)).then((r) => handle<T>(r)),
  del: <T>(url: string, body?: unknown): Promise<T> =>
    fetch(url, jsonInit('DELETE', body)).then((r) => handle<T>(r)),
};
