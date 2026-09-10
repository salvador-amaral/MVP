import "server-only";

/**
 * ⚠️ LOCAL TESTING ESCAPE HATCH — NOT FOR PRODUCTION ⚠️
 *
 * The client portal is deliberately read-only for staff of the owning office:
 * an accountant who opens /p/<token> sees exactly what the client sees, but
 * can never upload files or answer items on the client's behalf.
 *
 * That guard lives in two places:
 *   1. src/app/p/[token]/page.tsx      → hides the controls + shows the banner
 *   2. src/server/actions/portal.ts    → refuses the write (the one that counts)
 *
 * Setting PORTAL_ALLOW_STAFF_EDITS=true lifts BOTH, so you can walk the client
 * flow end-to-end while still signed in as staff. Keep it in your local
 * .env.local only — enabling it in production would let an accountant submit
 * documents as their own client, defeating the point of the magic-link flow.
 */
export function staffEditsAllowed(): boolean {
  return process.env.PORTAL_ALLOW_STAFF_EDITS === "true";
}
