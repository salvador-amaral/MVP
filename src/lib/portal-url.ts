import "server-only";

/** Public magic-link URL for a request. Always derived from APP_URL. */
export function requestPortalUrl(token: string): string {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/p/${token}`;
}
