import "server-only";

import { createAdminClient, STORAGE_BUCKET } from "@/lib/supabase/admin";

/** Removes files from storage. Errors are logged, never thrown. */
export async function deleteStoragePaths(paths: string[]): Promise<void> {
  const unique = [...new Set(paths)].filter(Boolean);
  if (unique.length === 0) return;
  try {
    const admin = createAdminClient();
    // The API accepts a list of keys, but keep batches bounded so deleting a
    // whole organization cannot blow past the request size limit.
    for (let i = 0; i < unique.length; i += 100) {
      const { error } = await admin.storage
        .from(STORAGE_BUCKET)
        .remove(unique.slice(i, i + 100));
      if (error) {
        console.error("storage cleanup failed:", error.message);
      }
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

/**
 * Storage paths of every file belonging to an organization.
 *
 * Deleting an organization cascades its `files` rows away, but the objects
 * themselves live in the bucket and would be orphaned forever — so this has to
 * run *before* the organization row is deleted.
 */
export async function listOrganizationStoragePaths(
  organizationId: string
): Promise<string[]> {
  const admin = createAdminClient();

  const { data: requests } = await admin
    .from("requests")
    .select("id")
    .eq("organization_id", organizationId);
  const requestIds = (requests ?? []).map((r) => r.id);
  if (requestIds.length === 0) return [];

  const { data: items } = await admin
    .from("request_items")
    .select("id")
    .in("request_id", requestIds);
  const itemIds = (items ?? []).map((i) => i.id);
  if (itemIds.length === 0) return [];

  const { data: files } = await admin
    .from("files")
    .select("storage_path")
    .in("request_item_id", itemIds);
  return (files ?? []).map((f) => f.storage_path);
}
