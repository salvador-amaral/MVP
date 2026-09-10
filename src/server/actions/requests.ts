"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser, getCurrentOrganization, isAdmin } from "@/server/data";
import { createClient } from "@/lib/supabase/server";
import { requestSchema } from "@/lib/validations";
import {
  defaultTokenExpiry,
  generateMagicToken,
  isExpired,
} from "@/lib/security/tokens";
import { requestPortalUrl } from "@/lib/portal-url";
import { reminderReason } from "@/lib/reminder-text";
import {
  deleteStoragePaths,
  listRequestStoragePaths,
} from "@/lib/storage-cleanup";
import { sendRequestInviteEmail, sendReminderEmail } from "@/lib/emails";
import type { ActionState } from "@/lib/action-state";
import type { Request } from "@/types/database";

export async function createRequestAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = requestSchema.safeParse({
    clientId: formData.get("clientId"),
    templateId: formData.get("templateId"),
    dueDate: formData.get("dueDate"),
    customMessage: formData.get("customMessage"),
    remindersEnabled: formData.get("remindersEnabled") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();

  // Defense-in-depth: only allow references within the caller's organization
  // (RLS checks organization_id on requests, not the referenced client/template).
  const [clientRes, templateRes] = await Promise.all([
    supabase
      .from("clients")
      .select("id")
      .eq("id", parsed.data.clientId)
      .eq("organization_id", user.organization_id)
      .maybeSingle(),
    supabase
      .from("templates")
      .select("id")
      .eq("id", parsed.data.templateId)
      .eq("organization_id", user.organization_id)
      .maybeSingle(),
  ]);
  if (!clientRes.data) return { error: "Cliente inválido." };
  if (!templateRes.data) return { error: "Modelo inválido." };

  const { data: request, error } = await supabase
    .from("requests")
    .insert({
      organization_id: user.organization_id,
      client_id: parsed.data.clientId,
      template_id: parsed.data.templateId,
      status: "draft",
      due_date: parsed.data.dueDate
        ? parsed.data.dueDate.toISOString().slice(0, 10)
        : null,
      custom_message: parsed.data.customMessage,
      reminders_enabled: parsed.data.remindersEnabled,
      magic_token: generateMagicToken(),
    })
    .select()
    .single();

  if (error) return { error: error.message };
  if (!request) return { error: "Não foi possível criar o pedido" };

  revalidatePath("/requests");
  return { ok: true, data: { id: request.id } };
}

/** Snapshot the template items into request_items + flip status to "sent". */
async function snapshotAndSend(
  requestId: string,
  request: Request,
  orgName: string
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { data: templateItems, error: itemError } = await supabase
    .from("template_items")
    .select("id, title, description, type, is_required, position")
    .eq("template_id", request.template_id)
    .order("position", { ascending: true });
  if (itemError) return { error: itemError.message };
  if (!templateItems || templateItems.length === 0) {
    return { error: "O modelo selecionado não tem itens. Adicione itens primeiro." };
  }

  const snapshot = templateItems.map((t) => ({
    request_id: requestId,
    template_item_id: t.id,
    title: t.title,
    description: t.description,
    type: t.type,
    is_required: t.is_required,
    position: t.position,
    status: "pending",
  }));

  const { error: insertError } = await supabase
    .from("request_items")
    .insert(snapshot);
  if (insertError) return { error: insertError.message };

  const { error: updateError } = await supabase
    .from("requests")
    .update({
      status: "sent",
      expires_at: defaultTokenExpiry().toISOString(),
    })
    .eq("id", requestId);
  if (updateError) return { error: updateError.message };

  // Client + portal link for the invite email.
  const { data: client } = await supabase
    .from("clients")
    .select("name, email")
    .eq("id", request.client_id)
    .single();

  if (client) {
    await sendRequestInviteEmail({
      to: client.email,
      orgName,
      clientName: client.name,
      magicUrl: requestPortalUrl(request.magic_token),
      dueDate: request.due_date ? new Date(request.due_date) : null,
      customMessage: request.custom_message || undefined,
      itemCount: snapshot.length,
    });
  }
  return {};
}

export async function sendRequestAction(requestId: string): Promise<ActionState> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: request, error } = await supabase
    .from("requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();
  if (error || !request) return { error: error?.message ?? "Pedido não encontrado" };

  const org = await getCurrentOrganization(user.id);
  const result = await snapshotAndSend(requestId, request, org?.name ?? "O nosso escritório");
  if (result.error) return { error: result.error };

  revalidatePath("/requests");
  revalidatePath(`/requests/${requestId}`);
  return { ok: true, message: "Pedido enviado por email ao cliente." };
}

/** Re-send the invite email for a request that is already sent/in progress. */
export async function resendInviteAction(requestId: string): Promise<ActionState> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: request, error } = await supabase
    .from("requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();
  if (error || !request) return { error: error?.message ?? "Pedido não encontrado" };

  const org = await getCurrentOrganization(user.id);
  const { data: client } = await supabase
    .from("clients")
    .select("name, email")
    .eq("id", request.client_id)
    .single();
  const { data: items } = await supabase
    .from("request_items")
    .select("id")
    .eq("request_id", requestId);

  if (client) {
    await sendRequestInviteEmail({
      to: client.email,
      orgName: org?.name ?? "O nosso escritório",
      clientName: client.name,
      magicUrl: requestPortalUrl(request.magic_token),
      dueDate: request.due_date ? new Date(request.due_date) : null,
      customMessage: request.custom_message || undefined,
      itemCount: items?.length ?? 0,
    });
  }
  return { ok: true, message: "Convite reenviado por email." };
}

export async function sendManualReminderAction(
  requestId: string
): Promise<ActionState> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: request, error } = await supabase
    .from("requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();
  if (error || !request) return { error: error?.message ?? "Pedido não encontrado" };

  if (isExpired(request.expires_at) || request.status === "expired") {
    return { error: "A ligação deste pedido já expirou." };
  }
  if (request.status === "completed") {
    return { error: "O pedido já está concluído — não são enviados lembretes." };
  }

  const org = await getCurrentOrganization(user.id);
  const { data: client } = await supabase
    .from("clients")
    .select("name, email")
    .eq("id", request.client_id)
    .single();
  if (!client) return { error: "Cliente não encontrado" };

  await sendReminderEmail({
    to: client.email,
    orgName: org?.name ?? "O nosso escritório",
    clientName: client.name,
    magicUrl: requestPortalUrl(request.magic_token),
    reason: reminderReason(request),
  });

  await supabase.from("reminders").insert({
    request_id: requestId,
    type: "manual",
    channel: "email",
  });

  revalidatePath(`/requests/${requestId}`);
  return { ok: true, message: "Lembrete enviado ao cliente." };
}

export async function deleteRequestAction(requestId: string): Promise<void> {
  const user = await requireUser();
  const supabase = await createClient();

  // Concluded requests are history — only owners/admins may delete them.
  // Members can still clean up drafts / sent / expired ones.
  const { data: existing } = await supabase
    .from("requests")
    .select("status")
    .eq("id", requestId)
    .maybeSingle();
  if (existing?.status === "completed" && !isAdmin(user)) {
    redirect("/requests");
  }

  // Remove the actual files from storage before dropping the rows
  // (deleting the request cascades the request_items/files rows).
  const paths = await listRequestStoragePaths(requestId);
  await supabase.from("requests").delete().eq("id", requestId);
  await deleteStoragePaths(paths);

  revalidatePath("/requests");
  redirect("/requests");
}
