"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireUser, isAdmin } from "@/server/data";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
