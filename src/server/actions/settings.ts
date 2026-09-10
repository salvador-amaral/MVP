"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser, isAdmin, getCurrentOrganization } from "@/server/data";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  deleteStoragePaths,
  listOrganizationStoragePaths,
} from "@/lib/storage-cleanup";
import { inviteSchema, orgSettingsSchema } from "@/lib/validations";
import type { ActionState } from "@/lib/action-state";

/** Rename organization + configure automatic reminder rules. */
export async function updateOrganizationAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  if (!isAdmin(user)) {
    return {
      error: "Apenas o proprietário ou administradores podem alterar a organização.",
    };
  }

  const daysBefore = formData
    .get("daysBefore")
    ?.toString()
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n)) ?? [];

  const parsed = orgSettingsSchema.safeParse({
    name: formData.get("name"),
    replyToEmail: String(formData.get("replyToEmail") ?? "").trim(),
    reminderSettings: {
      enabled: formData.get("remindersEnabled") === "on",
      daysBefore,
      everyDaysAfter: parseInt((formData.get("everyDaysAfter") as string) ?? "2", 10),
    },
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({
      name: parsed.data.name,
      reply_to_email: parsed.data.replyToEmail,
      reminder_settings: parsed.data.reminderSettings,
    })
    .eq("id", user.organization_id);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { ok: true, message: "Definições guardadas." };
}

export async function updateProfileAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const fullName = String(formData.get("fullName") ?? "").trim();
  if (!fullName) return { error: "Indique o seu nome." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("users")
    .update({ full_name: fullName })
    .eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { ok: true, message: "Perfil atualizado." };
}

/** Finds an existing Supabase auth user by email (used to link invites). */
async function findAuthUserByEmail(
  admin: ReturnType<typeof createAdminClient>,
  email: string
) {
  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (error || !data?.users) return null;
  return (
    data.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    ) ?? null
  );
}

/**
 * Owner/admin adds a teammate to the organization. The invitee receives a
 * Supabase invitation email to create their password, then lands straight on
 * the dashboard — a member of this same organization.
 */
export async function inviteMemberAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const caller = await requireUser();
  if (!["owner", "admin"].includes(caller.role)) {
    return { error: "Apenas o proprietário ou administradores podem convidar." };
  }

  const parsed = inviteSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  }
  const { fullName, email, role } = parsed.data;

  const admin = createAdminClient();

  // Is the email already a member of some organization?
  const { data: existing } = await admin
    .from("users")
    .select("id, organization_id")
    .eq("email", email)
    .maybeSingle();
  if (existing) {
    return existing.organization_id === caller.organization_id
      ? { error: "Este email já faz parte da equipa." }
      : { error: "Este email já está registado noutra organização." };
  }

  const headerStore = await headers();
  const redirectTo = `${
    headerStore.get("x-forwarded-host")
      ? `${headerStore.get("x-forwarded-proto") ?? "https"}://${headerStore.get("x-forwarded-host")}`
      : headerStore.get("origin") ?? process.env.APP_URL ?? "http://localhost:3000"
  }/auth/callback?next=/dashboard`;

  const { data: invited, error: inviteError } =
    await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName },
      redirectTo,
    });

  let userId: string | undefined = invited?.user?.id;
  if (inviteError) {
    const message = inviteError.message ?? "";
    // Already a Supabase user (but not in any organization yet) → link them.
    if (/already (been )?registered/i.test(message)) {
      const found = await findAuthUserByEmail(admin, email);
      if (!found) {
        return {
          error:
            "Já existe uma conta com este email e não foi possível associá-la. Peça-lhe para iniciar sessão primeiro.",
        };
      }
      userId = found.id;
    } else {
      return { error: message };
    }
  }
  if (!userId) return { error: "Não foi possível criar o convite." };

  const { error: insertError } = await admin.from("users").insert({
    id: userId,
    organization_id: caller.organization_id,
    email,
    full_name: fullName,
    role,
  });
  if (insertError) {
    if (/duplicate key/i.test(insertError.message)) {
      return { error: "Este email já faz parte da equipa." };
    }
    return { error: insertError.message };
  }

  revalidatePath("/settings");
  return { ok: true, message: `Convite enviado para ${email}.` };
}

/**
 * Irreversibly deletes the organization and everything inside it.
 *
 * Owner-only, and requires the caller to type the organization's exact name.
 * It is also the one operation that cannot go through RLS: `organizations` has
 * select and update policies but deliberately no delete policy, so the row can
 * only be removed with the service-role client.
 *
 * Three things outlive the database cascade and have to be handled explicitly:
 *   1. Storage objects — `files` rows cascade away, the documents in the
 *      `client-files` bucket do not.
 *   2. Supabase Auth accounts — `users` rows cascade, `auth.users` does not.
 *   3. Our own session, which we clear before removing our own account.
 */
export async function deleteOrganizationAction(
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

  // Gather what we need *before* destroying anything: once the rows are gone
  // the storage paths are unrecoverable.
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

  // 3. Clear our own session while the account still exists, so the browser is
  //    not left holding a token for a user that is about to disappear.
  const supabase = await createClient();
  await supabase.auth.signOut();

  // 4. Auth accounts outlive the rows we just cascaded.
  for (const id of memberIds) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) {
      console.error(`failed to delete auth user ${id}:`, error.message);
    }
  }

  redirect("/login");
}
