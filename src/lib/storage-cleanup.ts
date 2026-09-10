import "server-only";

import { createAdminClient, STORAGE_BUCKET } from "@/lib/supabase/admin";

/** Removes files from storage. Errors are logged, never thrown. */
export async function deleteStoragePaths(paths: string[]): Promise<void> {
  const unique = [...new Set(paths)].filter(Boolean);
  if (unique.length === 0) return;
  try {
    const admin = createAdminClient();
    const { error } = await admin.storage.from(STORAGE_BUCKET).remove(unique);
    if (error) {
      console.error("storage cleanup failed:", error.message);
    }
  } catch (e) {
    console.error("storage cleanup failed:", e);
  }
}

/** Storage paths of every file belonging to a request. */
export async function listRequestStoragePaths(requestId: string): Promise<string[]> {
  const admin = createAdminClient();
  const { data: items } = await admin
    .from("request_items")
    .select("id")
    .eq("request_id", requestId);
  const ids = (items ?? []).map((i) => i.id);
  if (ids.length === 0) return [];

  const { data: files } = await admin
    .from("files")
    .select("storage_path")
    .in("request_item_id", ids);
  return (files ?? []).map((f) => f.storage_path);
}
