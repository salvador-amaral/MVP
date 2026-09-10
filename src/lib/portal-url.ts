import "server-only";

/** Public base URL of the app (APP_URL), without a trailing slash. */
export function appBaseUrl(): string {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return base.replace(/\/$/, "");
}

/** Public magic-link URL for a request. Always derived from APP_URL. */
export function requestPortalUrl(token: string): string {
  return `${appBaseUrl()}/p/${token}`;
}

/** One-off URL the owner opens to confirm an organization deletion. */
export function organizationDeletionUrl(token: string): string {
  return `${appBaseUrl()}/confirmar-eliminacao/${token}`;
}
