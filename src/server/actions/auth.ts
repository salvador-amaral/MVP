"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { signInSchema, signUpSchema } from "@/lib/validations";
import { ensureDefaultTemplatesForOrg } from "@/server/seed";
import type { ActionState } from "@/lib/action-state";

/** "Escritório & Associados" → "escritorio-associados" */
function slugify(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "organizacao";
}

async function uniqueSlug(name: string): Promise<string> {
  const admin = createAdminClient();
  const base = slugify(name);
  const { data } = await admin
    .from("organizations")
    .select("slug")
    .like("slug", `${base}%`);
  const existing = new Set((data ?? []).map((o) => o.slug));
  if (!existing.has(base)) return base;
  let i = 2;
  while (existing.has(`${base}-${i}`)) i += 1;
  return `${base}-${i}`;
}

export async function signUpAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = signUpSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    organizationName: formData.get("organizationName"),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  }
  const { fullName, email, password, organizationName } = parsed.data;

  const headerStore = await headers();
  const origin = headerStore.get("x-forwarded-host")
    ? `${headerStore.get("x-forwarded-proto") ?? "https"}://${headerStore.get("x-forwarded-host")}`
    : headerStore.get("origin") ?? process.env.APP_URL ?? "http://localhost:3000";

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
    },
  });

  if (error) {
    return { error: toMessage(error.message) };
  }
  if (!data.user) {
    return { error: "Não foi possível criar a conta. Tente novamente." };
  }

  // Supabase deliberately does not error on an already-registered email (so the
  // response can't be used to enumerate accounts): it returns a user with an
  // empty `identities` array. Without this guard we would seed a second
  // organization and then fail on the duplicate users primary key, leaving an
  // orphan org behind on every retry.
  if (data.user.identities?.length === 0) {
    return {
      error:
        "Este email já está registado. Inicie sessão — se ainda não confirmou a conta, verifique a caixa de entrada.",
    };
  }

  // Create organization + owner row (service role: no user session yet).
  const admin = createAdminClient();
  const slug = await uniqueSlug(organizationName);
  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({ name: organizationName, slug })
    .select()
    .single();
  if (orgError) {
    console.error("org insert failed", orgError);
    return { error: "Não foi possível criar a organização." };
  }

  const { error: memberError } = await admin.from("users").insert({
    id: data.user.id,
    organization_id: org.id,
    email,
    full_name: fullName,
    role: "owner",
  });
  if (memberError) {
    console.error("member insert failed", memberError);
    return { error: "Não foi possível associar a conta à organização." };
  }

  // Seed realistic Portuguese templates for immediate value.
  await ensureDefaultTemplatesForOrg(org.id);

  // With "Confirm email" disabled Supabase returns a session immediately, so the
  // account is already usable — send them straight to the dashboard instead of
  // telling them to check an inbox that will never receive anything. With
  // confirmation enabled there is no session yet and the message below applies.
  if (data.session) {
    redirect("/dashboard");
  }

  return {
    ok: true,
    message:
      "Conta criada! Verifique o seu email para confirmar e depois inicie sessão.",
  };
}

export async function signInAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Introduza email e palavra-passe válidos." };
  }
  const next = (formData.get("next") as string) || "/dashboard";

  // "Lembrar-me": keep a flag so the session cookie is made persistent.
  const remember = formData.get("remember") === "on";
  const cookieStore = await cookies();
  if (remember) {
    cookieStore.set("remember", "1", {
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  } else {
    cookieStore.delete("remember");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) {
    return { error: toMessage(error.message) };
  }
  redirect(next);
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

function toMessage(message: string): string {
  const map: Record<string, string> = {
    "Invalid login credentials":
      "Email ou palavra-passe incorretos.",
    "Email not confirmed": "Confirme o seu email antes de iniciar sessão.",
    "User already registered": "Já existe uma conta com este email.",
  };
  return map[message] ?? message;
}
