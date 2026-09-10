import "server-only";

import { randomBytes } from "crypto";

export const MAGIC_TOKEN_TTL_DAYS = 30;

/** Cryptographically secure random token for public request links. */
export function generateMagicToken(): string {
  return randomBytes(32).toString("hex");
}

export function defaultTokenExpiry(from = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + MAGIC_TOKEN_TTL_DAYS);
  return d;
}

export function isExpired(expiresAt: string | Date | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return email;
  return `${user.slice(0, 2)}…@${domain}`;
}
