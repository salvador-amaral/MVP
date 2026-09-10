/**
 * Seed script: creates a demo organization + staff owner (auth user) and
 * loads the realistic Portuguese accounting templates.
 *
 * Usage:
 *   1. Fill the Supabase env vars (see .env.example) — SUPABASE_SERVICE_ROLE_KEY
 *      is required because there is no user session during seeding.
 *   2. npm run db:seed
 *
 * Interactive args (optional):
 *   npm run db:seed -- demo@acme.pt "Contabilidade Demo" "Maria Silva" secret123
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { DEFAULT_TEMPLATES } from "../lib/default-templates";

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var ${name} (see .env.example)`);
  return value;
}

function slugify(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "organizacao";
}

async function main() {
  const [email, orgName, ownerName, password] = process.argv.slice(2);
  const finalEmail = email ?? "demo@escritorio.pt";
  const finalOrg = orgName ?? "Escritório Demo";
  const finalOwner = ownerName ?? "Maria Silva";
  const finalPassword = password ?? "demo12345";

  const admin = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`→ Criando utilizador ${finalEmail}…`);
  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email: finalEmail,
    password: finalPassword,
    email_confirm: true,
    user_metadata: { full_name: finalOwner },
  });
  if (authError) throw authError;
  const userId = authUser.user!.id;

  console.log(`→ Criando organização "${finalOrg}"…`);
  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({ name: finalOrg, slug: `${slugify(finalOrg)}-${randomUUID().slice(0, 6)}` })
    .select()
    .single();
  if (orgError) throw orgError;

  const { error: memberError } = await admin.from("users").insert({
    id: userId,
    organization_id: org.id,
    email: finalEmail,
    full_name: finalOwner,
    role: "owner",
  });
  if (memberError) throw memberError;

  console.log(`→ Carregando ${DEFAULT_TEMPLATES.length} modelos de exemplo…`);
  for (const tpl of DEFAULT_TEMPLATES) {
    const { data: template, error: tErr } = await admin
      .from("templates")
      .insert({ organization_id: org.id, name: tpl.name, description: tpl.description })
      .select()
      .single();
    if (tErr) throw tErr;
    const items = tpl.items.map((item, idx) => ({
      template_id: template!.id,
      title: item.title,
      description: item.description,
      type: item.type,
      is_required: item.is_required,
      position: idx,
    }));
    const { error: iErr } = await admin.from("template_items").insert(items);
    if (iErr) throw iErr;
  }

  console.log("\n✅ Seed concluído!");
  console.log("   Email:    " + finalEmail);
  console.log("   Password: " + finalPassword);
  console.log("   Organização: " + finalOrg);
}

main().catch((error) => {
  console.error("\n✗ Seed falhou:", error.message);
  process.exit(1);
});
