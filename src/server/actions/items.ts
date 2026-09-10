"use server";

import { revalidatePath } from "next/cache";
import { requireUser, getCurrentOrganization } from "@/server/data";
import { createClient } from "@/lib/supabase/server";
import { reviewItemSchema } from "@/lib/validations";
import { requestPortalUrl } from "@/lib/portal-url";
import { isExpired } from "@/lib/security/tokens";
import { sendRejectionEmail } from "@/lib/emails";
import type { ActionState } from "@/lib/action-state";

/**
 * Accountant reviews a single answered request item: accept or reject.
 * Rejections can carry an optional reason shown to the client, and an email
 * is sent automatically so the client knows to send a corrected document.
 */
export async function reviewItemAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const supabase = await createClient();

  const parsed = reviewItemSchema.safeParse({
    requestItemId: formData.get("requestItemId"),
    status: formData.get("decision"),
    rejectionReason: formData.get("rejectionReason"),
  });
  if (!parsed.success) {
    return { error: "Decisão inválida." };
  }

  // Locate the item (RLS-scoped to this org) to learn its request id.
  const { data: item, error: itemError } = await supabase
    .from("request_items")
    .select("request_id, title")
    .eq("id", parsed.data.requestItemId)
    .maybeSingle();
  if (itemError || !item) {
    return { error: itemError?.message ?? "Item não encontrado." };
  }

  const rejected = parsed.data.status === "rejected";
  const reason = rejected ? parsed.data.rejectionReason || "" : "";
  const { error } = await supabase
    .from("request_items")
    .update({
      status: parsed.data.status,
      rejection_reason: rejected ? reason || null : null,
      completed_at: rejected ? null : new Date().toISOString(),
    })
    .eq("id", parsed.data.requestItemId);
  if (error) return { error: error.message };

  // Notify the client so they can re-upload the corrected document.
  if (rejected) {
    await sendRejectionNotification(supabase, user.id, {
      requestId: item.request_id,
      itemTitle: item.title,
      reason,
    });
  }

  revalidatePath("/requests");
  revalidatePath(`/requests/${item.request_id}`);
  return { ok: true };
}

/** Loads request + client and emails the client about the rejection. */
async function sendRejectionNotification(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  info: { requestId: string; itemTitle: string; reason: string }
) {
  try {
    const { data: request } = await supabase
      .from("requests")
      .select("client_id, magic_token, expires_at")
      .eq("id", info.requestId)
      .maybeSingle();
    // If the magic link already expired, an email would be pointless.
    if (!request || isExpired(request.expires_at)) return;

    const { data: client } = await supabase
      .from("clients")
      .select("name, email")
      .eq("id", request.client_id)
      .maybeSingle();
    if (!client) return;

    const org = await getCurrentOrganization(userId);
    const delivery = await sendRejectionEmail({
      to: client.email,
      orgName: org?.name ?? "O nosso escritório",
      clientName: client.name,
      magicUrl: requestPortalUrl(request.magic_token),
      itemTitle: info.itemTitle,
      reason: info.reason || undefined,
      replyTo: org?.reply_to_email,
    });

    if (!delivery.ok) {
      // Surface it on the request so the office can see the client was never
      // told, without failing the review that already succeeded.
      await supabase
        .from("requests")
        .update({ last_email_error: delivery.error })
        .eq("id", info.requestId);
    }
  } catch (emailError) {
    // The review itself already succeeded; never fail it over the email.
    console.error("rejection email failed", emailError);
  }
}
