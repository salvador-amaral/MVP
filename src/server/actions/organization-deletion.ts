"use server";

import { redirect } from "next/navigation";
import { requireUser, getCurrentOrganization } from "@/server/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateMagicToken } from "@/lib/security/tokens";
import { organizationDeletionUrl } from "@/lib/portal-url";
import { sendOrganizationDeletionEmail } from "@/lib/emails";
import {
  deleteStoragePaths,
  listOrganizationStoragePaths,
} from "@/lib/storage-cleanup";
import type { ActionState } from "@/lib/action-state";

/** How long the emailed confirmation link stays valid. */
const DELETION_TTL_MINUTES = 60;

/**
 * Step 1: queue the deletion and email the owner a confirmation link.
 *
 * Nothing is destroyed here. The typed organization name proves intent, and
 * the emailed token proves the requester controls the owner's inbox — so a
 * stolen session on its own cannot delete a tenant.
 */
export async function requestOrganizationDeletionAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();

  if (user.role !== "owner") {
    return { error: "Apenas o proprietário pode eliminar a organização." };
  }

  const org = await getCurrentOrganization(user.id);
  if (!org) return { error: "Organização não encontrada." };

  const confirmation = String(formData.get("confirmation") ?? "").trim();
  if (confirmation !== org.name) {
    return {
      error: `Para confirmar, escreva o nome exato da organização: ${org.name}`,
    };
  }

  const admin = createAdminClient();
  const token = generateMagicToken();
  const expiresAt = new Date(
    Date.now() + DELETION_TTL_MINUTES * 60_000
  ).toISOString();

  // One live request per organization: a second attempt replaces the first, so
  // only the most recent email can be acted on.
  await admin
    .from("organization_deletion_requests")
    .delete()
    .eq("organization_id", org.id);

  const { error: insertError } = await admin
    .from("organization_deletion_requests")
    .insert({
      organization_id: org.id,
      requested_by: user.id,
      token,
      expires_at: expiresAt,
    });
  if (insertError) return { error: insertError.message };

  const delivery = await sendOrganizationDeletionEmail({
    to: user.email,
    orgName: org.name,
    requesterName: user.full_name || user.email,
    confirmUrl: organizationDeletionUrl(token),
    expiresInMinutes: DELETION_TTL_MINUTES,
  });

  if (!delivery.ok) {
    // Without the email there is no way to confirm, so don't leave a live token
    // behind that nobody can redeem.
    await admin
      .from("organization_deletion_requests")
      .delete()
      .eq("token", token);
    return {
      error: `Não foi possível enviar o email de confirmação: ${delivery.error}`,
    };
  }

  return {
    ok: true,
    message: `Enviámos um email de confirmação para ${user.email}. A organização só será eliminada depois de abrir essa ligação (válida durante ${DELETION_TTL_MINUTES} minutos).`,
  };
}

/** Step 2: the owner opened the emailed link and pressed the final button. */
export async function confirmOrganizationDeletionAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const token = String(formData.get("token") ?? "").trim();
  if (!token) return { error: "Ligação inválida." };
  return performOrganizationDeletion(token);
}

/**
 * The actual, irreversible deletion.
 *
 * Kept private to this module so the only way to reach it is a live, single-use
 * token that was emailed to the owner. Three things outlive the database
 * cascade and have to be handled explicitly:
 *   1. Storage objects — `files` rows cascade, the documents in the
 *      `client-files` bucket do not.
 *   2. Supabase Auth accounts — `users` rows cascade, `auth.users` does not.
 */
async function performOrganizationDeletion(token: string): Promise<ActionState> {
  const admin = createAdminClient();

  const { data: pending } = await admin
    .from("organization_deletion_requests")
    .select("id, organization_id, expires_at, consumed_at")
    .eq("token", token)
    .maybeSingle();

  if (!pending) return { error: "Esta ligação não é válida." };
  if (pending.consumed_at) {
    return { error: "Esta confirmação já foi utilizada." };
  }
  if (new Date(pending.expires_at).getTime() < Date.now()) {
    return { error: "Esta confirmação expirou. Peça uma nova em Definições." };
  }

  const { data: org } = await admin
    .from("organizations")
    .select("id, name")
    .eq("id", pending.organization_id)
    .maybeSingle();
  if (!org) return { error: "A organização já não existe." };

  // Burn the token before doing anything destructive, so a refresh or a double
  // submit can never run the deletion twice.
  const { data: burned } = await admin
    .from("organization_deletion_requests")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", pending.id)
    .is("consumed_at", null)
    .select("id")
    .maybeSingle();
  if (!burned) return { error: "Esta confirmação já foi utilizada." };

  // Collect the paths before deleting: once the rows are gone they are lost.
  const [storagePaths, members] = await Promise.all([
    listOrganizationStoragePaths(org.id),
    admin.from("users").select("id").eq("organization_id", org.id),
  ]);
  const memberIds = (members.data ?? []).map((m) => m.id);

  // 1. Files in the bucket — the cascade does not touch these.
  await deleteStoragePaths(storagePaths);

  // 2. The organization row: clients, templates, requests, request_items,
  //    files and reminders all cascade from here.
  const { error: deleteError } = await admin
    .from("organizations")
    .delete()
    .eq("id", org.id);
  if (deleteError) return { error: deleteError.message };

  // 3. Auth accounts outlive the rows we just cascaded.
  for (const id of memberIds) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) {
      console.error(`failed to delete auth user ${id}:`, error.message);
    }
  }

  redirect("/login?eliminado=1");
}