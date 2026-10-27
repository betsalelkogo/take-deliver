// Browser-side access to the app's API routes (the database is server-only).

const POLL_MS = 10_000;
const REFRESH_EVENT = "td:refresh";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

export async function api<T>(
  path: string,
  init: { method?: string; body?: unknown } = {}
): Promise<T> {
  const hasBody = init.body !== undefined;
  const res = await fetch(path, {
    method: init.method ?? "GET",
    headers: hasBody ? { "Content-Type": "application/json" } : undefined,
    body: hasBody ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      data && typeof data.error === "string" ? data.error : "משהו השתבש, נסו שוב.";
    throw new ApiError(message, res.status);
  }
  return data as T;
}

// Ask every live board to re-fetch now (e.g. right after a local change).
export function requestRefresh(): void {
  window.dispatchEvent(new Event(REFRESH_EVENT));
}

// Stand-in for realtime updates: re-fetch every POLL_MS while the tab is
// visible, immediately when it becomes visible again, and on requestRefresh().
export function poll<T>(
  load: () => Promise<T>,
  onData: (data: T) => void,
  onError: (error: Error) => void
): () => void {
  let stopped = false;
  let inFlight = false;
  let rerun = false;
  let timer: number | undefined;

  const run = async () => {
    if (stopped) return;
    if (inFlight) {
      rerun = true;
      return;
    }
    inFlight = true;
    window.clearTimeout(timer);
    try {
      const data = await load();
      if (!stopped) onData(data);
    } catch (err) {
      if (!stopped) onError(err as Error);
    } finally {
      inFlight = false;
      if (!stopped) {
        if (rerun) {
          rerun = false;
          void run();
        } else if (document.visibilityState === "visible") {
          timer = window.setTimeout(run, POLL_MS);
        }
      }
    }
  };

  const onVisibility = () => {
    if (document.visibilityState === "visible") void run();
  };

  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener(REFRESH_EVENT, run);
  void run();

  return () => {
    stopped = true;
    window.clearTimeout(timer);
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener(REFRESH_EVENT, run);
  };
}
