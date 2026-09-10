import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formats a byte count into a human readable string. */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/** Truncates a long token for display. */
export function shortToken(token: string): string {
  return token.length > 16 ? `${token.slice(0, 8)}…${token.slice(-6)}` : token;
}

/**
 * PostgREST embedded resources (e.g. `select("client: clients(name)")`) can
 * arrive as an array of one object. Normalizes them to a single value.
 */
export function embed<T>(value: unknown): T | null {
  if (Array.isArray(value)) {
    return value.length > 0 ? (value[0] as T) : null;
  }
  return (value as T) ?? null;
}
