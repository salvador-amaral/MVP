/**
 * Dev/test helper: instantly creates an additional staff account (member by
 * default) inside an existing organization, so you can log in and verify
 * role-based permissions without waiting for the invite email.
 *
 * Usage (args optional):
 *   npm run db:member                 → member@escritorio.pt / membro12345 (member)
 *   npm run db:member -- ana@x.pt "Ana Costa" segredo123 admin
 */
import { createClient } from "@supabase/supabase-js";

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var ${name} (see .env.example)`);
  return value;
}

// Dev script: keep the param loose — exact Supabase typing is irrelevant here.
async function findAuthUserByEmail(admin: any, email: string) {
  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (error || !data?.users) return null;
  return (
    data.users.find(
      (u: { email?: string | null }) => u.email?.toLowerCase() === email.toLowerCase()
    ) ?? null
  );
}

async function main() {
  const [argEmail, argName, argPassword, argRole] = process.argv.slice(2);
  const email = argEmail ?? "membro@escritorio.pt";
  const fullName = argName ?? "Membro Teste";
  const password = argPassword ?? "membro12345";
  const role = (argRole === "admin" ? "admin" : "member") as "admin" | "member";

  const admin = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Find the target organization: owner account (demo) → Demo org → first org.
  const ownerEmail = process.env.DEMO_OWNER_EMAIL ?? "demo@escritorio.pt";
  const { data: owner } = await admin
    .from("users")
    .select("organization_id")
    .eq("email", ownerEmail)
    .maybeSingle();

  let orgId: string | undefined = owner?.organization_id;
  if (!orgId) {
    const { data: demoOrg } = await admin
      .from("organizations")
      .select("id")
      .ilike("name", "%demo%")
      .limit(1)
      .maybeSingle();
    orgId = demoOrg?.id;
  }
  if (!orgId) {
    const { data: anyOrg } = await admin
      .from("organizations")
      .select("id")
      .limit(1)
      .maybeSingle();
    orgId = anyOrg?.id;
  }
  if (!orgId) {
    console.error("Não foi encontrada nenhuma organização. Corra primeiro o npm run db:seed.");
    process.exit(1);
  }

  // Create the auth user (email already confirmed → can log in immediately).
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  let userId = created?.user?.id;
  if (createError && /already (been )?registered/i.test(createError.message ?? "")) {
    const existing = await findAuthUserByEmail(admin, email);
    userId = existing?.id;
  } else if (createError) {
    throw createError;
  }
  if (!userId) {
    console.error("Não foi possível criar/utilizar a conta do membro.");
    process.exit(1);
  }

  const { error: insertError } = await admin.from("users").insert({
    id: userId,
    organization_id: orgId,
    email,
    full_name: fullName,
    role,
  });
  if (insertError && !/duplicate key/i.test(insertError.message)) {
    throw insertError;
  }

  console.log("\n✅ Membro pronto a testar!");
  console.log(`   Email:    ${email}`);
  console.log(`   Password: ${password}`);
  console.log(`   Função:   ${role}`);
  console.log("   Organização id: " + orgId);
  console.log(
    "\nInicie sessão em http://localhost:3000/login para verificar que, como membro,\nnão vê 'Organização', convites nem botões de eliminar."
  );
}

main().catch((error) => {
  console.error("\n✗ Falhou:", error.message);
  process.exit(1);
});
