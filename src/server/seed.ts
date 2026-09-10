import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_TEMPLATES } from "@/lib/default-templates";

/**
 * Seeds the realistic Portuguese accountant templates for an organization.
 * Called automatically after sign-up and on demand from the templates page.
 * Uses the service-role client so it works for brand-new organizations where
 * the current user may not exist yet, and bypasses RLS on purpose (this is a
 * privileged bootstrap operation scoped to the caller-provided org).
 */
export async function ensureDefaultTemplatesForOrg(orgId: string) {
  const admin = createAdminClient();

  // Do not duplicate on repeated calls.
  const { count } = await admin
    .from("templates")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId);
  if (count && count > 0) return;

  for (const tpl of DEFAULT_TEMPLATES) {
    const { data: template, error } = await admin
      .from("templates")
      .insert({
        organization_id: orgId,
        name: tpl.name,
        description: tpl.description,
      })
      .select()
      .single();
    if (error || !template) continue;
    const items = tpl.items.map((item, idx) => ({
      template_id: template.id,
      title: item.title,
      description: item.description,
      type: item.type,
      is_required: item.is_required,
      position: idx,
    }));
    await admin.from("template_items").insert(items);
  }
}
