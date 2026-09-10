/**
 * One-off data fix: "NIF dos sócios" must be a free-text field (a client may
 * have several partners/NIFs) instead of a single numeric input.
 *
 * Updates:
 *   - template_items  (the template definition)
 *   - request_items   (already-sent request snapshots)
 * where the title is "NIF dos sócios" and the type is still "number".
 *
 * Run: npm run db:seed:fix:nif
 *      (or) tsx --env-file=.env.local src/scripts/fix-nif-type.ts
 */
import { createClient } from "@supabase/supabase-js";

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var ${name} (see .env.example)`);
  return value;
}

async function main() {
  const admin = createClient(
    env("NEXT_PUBLIC_SUPABASE_URL"),
    env("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const TITLE = "NIF dos sócios";

  const { data: templateItems } = await admin
    .from("template_items")
    .select("id")
    .eq("title", TITLE)
    .eq("type", "number");
  if (templateItems && templateItems.length > 0) {
    await admin
      .from("template_items")
      .update({ type: "text" })
      .eq("title", TITLE)
      .eq("type", "number");
    console.log(`→ template_items corrigidos: ${templateItems.length}`);
  }

  const { data: requestItems } = await admin
    .from("request_items")
    .select("id")
    .eq("title", TITLE)
    .eq("type", "number");
  if (requestItems && requestItems.length > 0) {
    await admin
      .from("request_items")
      .update({ type: "text" })
      .eq("title", TITLE)
      .eq("type", "number");
    console.log(`→ request_items corrigidos: ${requestItems.length}`);
  }

  console.log("✅ NIF dos sócios agora é um campo de texto.");
}

main().catch((error) => {
  console.error("\n✗ Falhou:", error.message);
  process.exit(1);
});
