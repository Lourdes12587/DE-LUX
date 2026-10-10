/** Only same-site paths are accepted as `?next=` redirects (prevents open redirects to other domains). */
export function safeNext(next: string | null | undefined, fallback = "/account/orders") {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : fallback;
}
