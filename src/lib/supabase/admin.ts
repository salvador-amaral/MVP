import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client. BYPASSES Row Level Security — use it ONLY where a
 * higher privilege is truly required:
 *   - creating organizations / staff user rows during sign-up,
 *   - the public magic-token portal (no user session exists),
 *   - generating presigned storage URLs,
 *   - the automatic reminder worker.
 * Never use it to read org data that could be fetched with the user client.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing Supabase configuration (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)."
    );
  }

  return createSupabaseClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/** Allowed file MIME types / max size mirror the storage bucket policy. */
export const STORAGE_BUCKET = "client-files";
export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
