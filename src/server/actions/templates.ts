"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser, isAdmin } from "@/server/data";
import { createClient } from "@/lib/supabase/server";
import { templateSchema } from "@/lib/validations";
import type { ActionState } from "@/lib/action-state";
import type { TemplateItemType } from "@/types/database";

interface EditorItem {
  title: string;
  description: string;
  type: TemplateItemType;
  is_required: boolean;
}

function parseItems(raw: string | null): EditorItem[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.map((i) => ({
      title: String(i?.title ?? ""),
      description: String(i?.description ?? ""),
      type: i?.type ?? "file",
      is_required: Boolean(i?.is_required),
    }));
  } catch {
    return null;
  }
}

export async function createTemplateAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = templateSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    items: parseItems(formData.get("items") as string | null) ?? [],
  });
  if (!parsed.success) {
    return {
      error:
        parsed.error.errors.find((e) => e.path[0] === "items")
          ?.message ?? "Dados inválidos",
    };
  }

  const supabase = await createClient();
  const { data: template, error: templateError } = await supabase
    .from("templates")
    .insert({
      name: parsed.data.name,
      description: parsed.data.description,
      organization_id: user.organization_id,
    })
    .select()
    .single();
  if (templateError || !template) {
    return { error: templateError?.message ?? "Não foi possível criar o modelo" };
  }

  const items = parsed.data.items.map((item, idx) => ({
    template_id: template.id,
    title: item.title,
    description: item.description,
    type: item.type,
    is_required: item.is_required,
    position: idx,
  }));

  const { error: itemsError } = await supabase.from("template_items").insert(items);
  if (itemsError) {
    return { error: itemsError.message };
  }

  revalidatePath("/templates");
  return { ok: true, data: { id: template.id } };
}

export async function updateTemplateAction(
  templateId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireUser();

  const parsed = templateSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    items: parseItems(formData.get("items") as string | null) ?? [],
  });
  if (!parsed.success) {
    return {
      error:
        parsed.error.errors.find((e) => e.path[0] === "items")
          ?.message ?? "Dados inválidos",
    };
  }

  const supabase = await createClient();
  const { error: updateError } = await supabase
    .from("templates")
    .update({
      name: parsed.data.name,
      description: parsed.data.description,
    })
    .eq("id", templateId);
  if (updateError) return { error: updateError.message };

  // Replace the item set (requests snapshot their own copy when sent, so
  // editing a template never mutates requests already in flight).
  await supabase.from("template_items").delete().eq("template_id", templateId);
  const items = parsed.data.items.map((item, idx) => ({
    template_id: templateId,
    title: item.title,
    description: item.description,
    type: item.type,
    is_required: item.is_required,
    position: idx,
  }));
  const { error: itemsError } = await supabase.from("template_items").insert(items);
  if (itemsError) return { error: itemsError.message };

  revalidatePath("/templates");
  revalidatePath(`/templates/${templateId}`);
  return { ok: true, data: { id: templateId } };
}

export async function deleteTemplateAction(templateId: string): Promise<void> {
  const user = await requireUser();
  // Shared template deletion is a manager action.
  if (!isAdmin(user)) redirect("/dashboard");
  const supabase = await createClient();
  // RLS: only owner/admin of the org may delete a template.
  await supabase.from("templates").delete().eq("id", templateId);
  revalidatePath("/templates");
  redirect("/templates");
}

export async function seedExampleTemplatesAction(): Promise<ActionState> {
  const user = await requireUser();
  const { ensureDefaultTemplatesForOrg } = await import("@/server/seed");
  await ensureDefaultTemplatesForOrg(user.organization_id);
  revalidatePath("/templates");
  return { ok: true, message: "Modelos de exemplo adicionados." };
}
