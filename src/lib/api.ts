/** Thrown by `api()` with the server's `{ error }` message. */
export class ApiRequestError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

/** JSON fetch helper for the browser. Throws ApiRequestError on non-2xx responses. */
export async function api<T>(path: string, init?: Omit<RequestInit, "body"> & { body?: unknown }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
      body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    // Network failure (server stopped, offline): give the user a message they can act on.
    throw new ApiRequestError(0, "Can't reach the server. Check that the site is running and try again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiRequestError(res.status, data.error ?? "Something went wrong", data.details);
  return data as T;
}
