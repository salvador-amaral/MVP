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

  // This runs inline in the sign-up request, so the number of sequential round
  // trips matters: seed every template in one insert, then every item in one
  // insert. The previous per-template loop cost two round trips each (~13
  // total) and could push the action past the serverless timeout.
  const { data: templates, error } = await admin
    .from("templates")
    .insert(
      DEFAULT_TEMPLATES.map((tpl) => ({
        organization_id: orgId,
        name: tpl.name,
        description: tpl.description,
      }))
    )
    .select("id, name");
  if (error || !templates) {
    console.error("template seed failed", error);
    return;
  }

  // Match items back by name — the template names in DEFAULT_TEMPLATES are
  // distinct, and this avoids depending on insert return order.
  const idByName = new Map(templates.map((t) => [t.name, t.id]));
  const items = DEFAULT_TEMPLATES.flatMap((tpl) => {
    const templateId = idByName.get(tpl.name);
    if (!templateId) return [];
    return tpl.items.map((item, idx) => ({
      template_id: templateId,
      title: item.title,
      description: item.description,
      type: item.type,
      is_required: item.is_required,
      position: idx,
    }));
  });
  if (items.length === 0) return;

  const { error: itemsError } = await admin
    .from("template_items")
    .insert(items);
  if (itemsError) console.error("template item seed failed", itemsError);
}
