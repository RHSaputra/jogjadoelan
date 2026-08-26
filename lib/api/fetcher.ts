// lib/api/fetcher.ts
// Wrapper fetch untuk React Query — handle JSON serialize, error normalize,
// dan auto-include credentials (cookies NextAuth).
//
// Semua API route di /api/* WAJIB return shape:
//   sukses: { data: T }
//   gagal:  { error: { message: string, code?: string, fields?: Record<string,string> } }

export interface ApiErrorShape {
  message: string;
  code?: string;
  fields?: Record<string, string>;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  fields?: Record<string, string>;
  constructor(status: number, body: ApiErrorShape) {
    super(body.message);
    this.status = status;
    this.code = body.code;
    this.fields = body.fields;
  }
}

interface FetcherOpts extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Kalau true: kirim sebagai FormData (file upload). `body` harus FormData. */
  formData?: boolean;
  /** Query params. */
  query?: Record<string, string | number | boolean | undefined | null>;
}

function buildUrl(path: string, query?: FetcherOpts["query"]): string {
  if (!query) return path;
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null) continue;
    usp.set(k, String(v));
  }
  const s = usp.toString();
  return s ? `${path}?${s}` : path;
}

/** Sleep helper for retry backoff */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function apiFetch<T = unknown>(
  path: string,
  opts: FetcherOpts = {},
  retries = 2,
): Promise<T> {
  const { body, formData, query, headers, ...rest } = opts;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const init: RequestInit = {
      credentials: "include",
      ...rest,
      headers: formData
        ? { Accept: "application/json", ...(headers as Record<string, string>) }
        : {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...(headers as Record<string, string>),
          },
      body: formData
        ? (body as FormData)
        : body !== undefined
          ? JSON.stringify(body)
          : undefined,
    };

    const res = await fetch(buildUrl(path, query), init);

    // Retry on 429 (rate limit) with exponential backoff
    if (res.status === 429 && attempt < retries) {
      const retryAfter = res.headers.get("Retry-After");
      const waitMs = retryAfter
        ? parseInt(retryAfter, 10) * 1000
        : Math.min(1000 * Math.pow(2, attempt), 8000);
      console.warn(`[apiFetch] 429 rate limit on ${path}, retrying in ${waitMs}ms (attempt ${attempt + 1}/${retries})`);
      await sleep(waitMs);
      continue;
    }

    const isJson = res.headers.get("content-type")?.includes("application/json");

    if (!res.ok) {
      let err: ApiErrorShape = { message: `HTTP ${res.status}` };
      if (isJson) {
        try {
          const j = await res.json();
          if (j?.error) err = j.error;
        } catch {
          /* ignore */
        }
      }
      throw new ApiError(res.status, err);
    }

    if (res.status === 204) return undefined as T;
    const j = isJson ? await res.json() : null;
    if (j && typeof j === "object" && "data" in j) {
      return j.data as T;
    }
    return j as T;
  }

  throw new Error(`apiFetch ${path} gagal setelah ${retries} percobaan ulang`);
}

/* Shortcut HTTP verbs */
export const api = {
  get:    <T>(p: string, o?: Omit<FetcherOpts, "body">) => apiFetch<T>(p, { ...o, method: "GET" }),
  post:   <T>(p: string, body?: unknown, o?: FetcherOpts) => apiFetch<T>(p, { ...o, method: "POST", body }),
  put:    <T>(p: string, body?: unknown, o?: FetcherOpts) => apiFetch<T>(p, { ...o, method: "PUT", body }),
  patch:  <T>(p: string, body?: unknown, o?: FetcherOpts) => apiFetch<T>(p, { ...o, method: "PATCH", body }),
  delete: <T>(p: string, o?: FetcherOpts) => apiFetch<T>(p, { ...o, method: "DELETE" }),
  upload: <T>(p: string, form: FormData, o?: FetcherOpts) =>
    apiFetch<T>(p, { ...o, method: "POST", body: form, formData: true }),
};