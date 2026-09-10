"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser, isAdmin } from "@/server/data";
import { createClient } from "@/lib/supabase/server";
import { clientSchema } from "@/lib/validations";
import type { ActionState } from "@/lib/action-state";

export async function createClientAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = clientSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .insert({ ...parsed.data, organization_id: user.organization_id })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }
  revalidatePath("/clients");
  return { ok: true, data: { id: data.id } };
}

export async function updateClientAction(
  clientId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireUser();

  const parsed = clientSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update(parsed.data)
    .eq("id", clientId);

  if (error) {
    return { error: error.message };
  }
  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  return { ok: true, data: { id: clientId } };
}

export async function deleteClientAction(clientId: string): Promise<void> {
  const user = await requireUser();
  // Deleting a client is destructive — managers only.
  if (!isAdmin(user)) redirect("/dashboard");
  const supabase = await createClient();
  // RLS restricts this delete to the caller's organization.
  await supabase.from("clients").delete().eq("id", clientId);
  revalidatePath("/clients");
  redirect("/clients");
}
