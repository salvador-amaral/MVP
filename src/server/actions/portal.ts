"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAdminClient, STORAGE_BUCKET, MAX_FILE_SIZE } from "@/lib/supabase/admin";
import { isExpired } from "@/lib/security/tokens";
import { getSessionUser } from "@/server/data";
import type { ActionState } from "@/lib/action-state";
import type { Request, RequestItem } from "@/types/database";

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "application/zip",
  "application/x-zip-compressed",
]);

function sanitizeFileName(name: string): string {
  const clean = name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  return clean || "ficheiro";
}

async function loadRequestByToken(
  token: string
): Promise<{ error?: string; request?: Request }> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("requests")
    .select("*")
    .eq("magic_token", token)
    .maybeSingle();
  if (!data) return { error: "Esta ligação não é válida." };
  const request = data as Request;
  if (request.status === "draft") {
    return { error: "Esta ligação ainda não está ativa." };
  }
  if (request.status === "expired" || isExpired(request.expires_at)) {
    return { error: "Esta ligação expirou. Contacte o seu contabilista." };
  }

  // Staff of this office only see a read-only preview — they must never be
  // able to submit/upload on the client portal.
  const hasSessionCookie = (await cookies())
    .getAll()
    .some((c) => c.name.startsWith("sb-"));
  if (hasSessionCookie) {
    const session = await getSessionUser();
    if (session?.organization_id === request.organization_id) {
      return {
        error: "Modo pré-visualização do escritório — apenas o cliente pode enviar documentos.",
      };
    }
  }

  return { request };
}

async function loadItemForRequest(
  admin: ReturnType<typeof createAdminClient>,
  request: Request,
  requestItemId: string
): Promise<{ error?: string; item?: RequestItem }> {
  const { data } = await admin
    .from("request_items")
    .select("*")
    .eq("id", requestItemId)
    .eq("request_id", request.id)
    .maybeSingle();
  if (!data) return { error: "Item não encontrado." };
  return { item: data as RequestItem };
}

// ---------------------------------------------------------------------------
// Save a simple answer (text / number / checkbox)
// ---------------------------------------------------------------------------
export async function submitAnswerAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const token = String(formData.get("token") ?? "");
  const requestItemId = String(formData.get("requestItemId") ?? "");
  const value = String(formData.get("value") ?? "");

  const { error, request } = await loadRequestByToken(token);
  if (error) return { error };
  if (!request) return { error: "Pedido não encontrado." };

  const admin = createAdminClient();
  const { error: itemError, item } = await loadItemForRequest(admin, request, requestItemId);
  if (itemError || !item) return { error: itemError ?? "Item não encontrado." };
  if (item.status === "accepted") {
    return { error: "Este item já foi aceite e não pode ser alterado." };
  }
  if (item.type === "checkbox") {
    if (value !== "true" && value !== "false") return { error: "Resposta inválida." };
  }
  if (item.type === "number") {
    if (value !== "" && Number.isNaN(Number(value))) {
      return { error: "Introduza um valor numérico válido." };
    }
  }
  if (item.type === "text" && value.length > 2000) {
    return { error: "Resposta demasiado longa." };
  }

  const answered =
    item.type === "checkbox"
      ? value === "true" // a required confirmation only counts when checked
      : value.trim() !== "";

  const { error: updateError } = await admin
    .from("request_items")
    .update({
      value: value || null,
      status: answered ? "uploaded" : "pending",
      completed_at: answered ? new Date().toISOString() : null,
      rejection_reason: null,
    })
    .eq("id", requestItemId);
  if (updateError) return { error: updateError.message };

  revalidatePath(`/p/${token}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// File upload: create a presigned upload URL (browser uploads directly)
// ---------------------------------------------------------------------------
export async function createUploadUrlAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const token = String(formData.get("token") ?? "");
  const requestItemId = String(formData.get("requestItemId") ?? "");
  const fileName = String(formData.get("fileName") ?? "");
  const contentType = String(formData.get("contentType") ?? "");
  const size = Number(formData.get("size") ?? 0);

  const { error, request } = await loadRequestByToken(token);
  if (error) return { error };
  if (!request) return { error: "Pedido não encontrado." };

  const admin = createAdminClient();
  const { error: itemError, item } = await loadItemForRequest(admin, request, requestItemId);
  if (itemError || !item) return { error: itemError ?? "Item não encontrado." };
  if (item.type !== "file") return { error: "Este item não aceita ficheiros." };
  if (item.status === "accepted") {
    return { error: "Este documento já foi aceite." };
  }
  if (!ALLOWED_MIME.has(contentType)) {
    return { error: "Tipo de ficheiro não suportado. Use PDF, imagem, Word, Excel ou ZIP." };
  }
  if (size <= 0 || size > MAX_FILE_SIZE) {
    return { error: "O ficheiro deve ter entre 1 byte e 25 MB." };
  }

  const storagePath = `${request.organization_id}/${request.id}/${requestItemId}/${crypto.randomUUID()}-${sanitizeFileName(fileName)}`;
  const { data, error: signError } = await admin.storage
    .from(STORAGE_BUCKET)
    .createSignedUploadUrl(storagePath);
  if (signError || !data) {
    return { error: signError?.message ?? "Não foi possível preparar o envio." };
  }

  return { ok: true, data: { url: data.signedUrl, path: data.path } };
}

// ---------------------------------------------------------------------------
// Confirm an upload finished: register the file + mark the item answered
// ---------------------------------------------------------------------------
export async function confirmUploadAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const token = String(formData.get("token") ?? "");
  const requestItemId = String(formData.get("requestItemId") ?? "");
  const path = String(formData.get("path") ?? "");
  const fileName = String(formData.get("fileName") ?? "");
  const contentType = String(formData.get("contentType") ?? "");
  const size = Number(formData.get("size") ?? 0);

  const { error, request } = await loadRequestByToken(token);
  if (error) return { error };
  if (!request) return { error: "Pedido não encontrado." };

  const admin = createAdminClient();
  const { error: itemError, item } = await loadItemForRequest(admin, request, requestItemId);
  if (itemError || !item) return { error: itemError ?? "Item não encontrado." };
  if (item.type !== "file") return { error: "Item inválido." };
  if (!path.startsWith(`${request.organization_id}/${request.id}/${requestItemId}/`)) {
    return { error: "Caminho de ficheiro inválido." };
  }

  const { error: fileError } = await admin.from("files").insert({
    request_item_id: requestItemId,
    file_name: sanitizeFileName(fileName),
    file_size: size,
    mime_type: contentType,
    storage_path: path,
  });
  if (fileError) return { error: fileError.message };

  await admin
    .from("request_items")
    .update({
      status: "uploaded",
      completed_at: new Date().toISOString(),
      rejection_reason: null,
    })
    .eq("id", requestItemId);

  revalidatePath(`/p/${token}`);
  return { ok: true, message: "Ficheiro enviado com sucesso." };
}
