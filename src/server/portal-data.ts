import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isExpired } from "@/lib/security/tokens";
import type {
  Request,
  RequestItemWithFiles,
} from "@/types/database";

export interface PortalRequest extends Request {
  client_name: string;
  org_name: string;
}

export interface PortalContext {
  request: PortalRequest;
  items: RequestItemWithFiles[];
}

export type PortalLoadResult =
  | { context: PortalContext; code: "ok" }
  | { code: "not_found" | "expired" | "not_open" };

/** Loads everything a final client needs for their magic link. */
export async function getPortalContext(token: string): Promise<PortalLoadResult> {
  const admin = createAdminClient();

  const { data: request, error } = await admin
    .from("requests")
    .select("*")
    .eq("magic_token", token)
    .maybeSingle();

  if (error || !request) return { code: "not_found" };
  const r = request as Request;

  // A draft was never emailed; treat its link as invalid.
  if (r.status === "draft") return { code: "not_open" };
  if (r.status === "expired" || isExpired(r.expires_at)) {
    return { code: "expired" };
  }

  // Client, organization and items (with their files embedded) are all
  // independent once we have the request — fetch them in a single wave.
  const [clientRes, orgRes, itemsRes] = await Promise.all([
    admin.from("clients").select("name").eq("id", r.client_id).maybeSingle(),
    admin.from("organizations").select("name").eq("id", r.organization_id).maybeSingle(),
    admin
      .from("request_items")
      .select("*, files: files(id, file_name, file_size, uploaded_at)")
      .eq("request_id", r.id)
      .order("position", { ascending: true }),
  ]);

  const itemRows = (itemsRes.data ?? []) as RequestItemWithFiles[];
  itemRows.forEach((item) => {
    item.files = item.files ?? [];
  });

  return {
    code: "ok",
    context: {
      request: {
        ...r,
        client_name: clientRes.data?.name ?? "Cliente",
        org_name: orgRes.data?.name ?? "",
      },
      items: itemRows,
    },
  };
}
