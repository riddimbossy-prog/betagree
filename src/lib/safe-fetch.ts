/** Timed, retried JSON GET that never treats HTML error pages as data. */

export class FetchError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "FetchError";
    this.status = status;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function looksLikeJson(text: string, contentType: string) {
  if (contentType.includes("json")) return true;
  const trim = text.trim();
  return trim.startsWith("{") || trim.startsWith("[");
}

export async function fetchJson<T>(
  url: string,
  {
    timeoutMs = 12_000,
    retries = 2,
  }: {
    timeoutMs?: number;
    retries?: number;
  } = {},
): Promise<T> {
  let last: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
      const text = await res.text();
      const type = res.headers.get("content-type") ?? "";
      if (!res.ok) {
        last = new FetchError(`HTTP ${res.status}`, res.status);
        if (res.status >= 500 || res.status === 429) {
          await sleep(280 * (attempt + 1) ** 2);
          continue;
        }
        throw last;
      }
      if (!looksLikeJson(text, type)) {
        throw new FetchError("Response was not JSON");
      }
      return JSON.parse(text) as T;
    } catch (err) {
      last = err;
      const retryable =
        err instanceof FetchError
          ? err.status === 429 || (err.status != null && err.status >= 500)
          : err instanceof TypeError || (err instanceof DOMException && err.name === "TimeoutError") || err instanceof SyntaxError;
      if (!retryable || attempt === retries) break;
      await sleep(280 * (attempt + 1) ** 2);
    }
  }
  throw last instanceof Error ? last : new FetchError("Request failed");
}

export function parseJsonLoose<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1)) as T;
      } catch {
        /* fall through */
      }
    }
    return fallback;
  }
}
