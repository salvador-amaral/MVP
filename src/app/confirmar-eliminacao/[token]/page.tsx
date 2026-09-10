import { createAdminClient } from "@/lib/supabase/admin";
import { listOrganizationStoragePaths } from "@/lib/storage-cleanup";
import { ConfirmDeletionForm } from "@/components/settings/confirm-deletion-form";

export const dynamic = "force-dynamic";

/**
 * Step 2 of organization deletion — the page the owner reaches from the emailed
 * link. Public (no session required) because the token is the credential: it is
 * single-use, expires after an hour, and was only ever sent to the owner's
 * address, so opening it on a phone works without signing in first.
 */
function InvalidLink({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-xl font-bold">Não é possível continuar</h1>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export default async function ConfirmDeletionPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: pending } = await admin
    .from("organization_deletion_requests")
    .select("organization_id, expires_at, consumed_at")
    .eq("token", token)
    .maybeSingle();

  if (!pending) {
    return (
      <InvalidLink message="Esta ligação não é válida. Peça uma nova em Definições → Zona de perigo." />
    );
  }
  if (pending.consumed_at) {
    return <InvalidLink message="Esta confirmação já foi utilizada." />;
  }
  if (new Date(pending.expires_at).getTime() < Date.now()) {
    return (
      <InvalidLink message="Esta ligação expirou. Peça uma nova em Definições → Zona de perigo." />
    );
  }

  const { data: org } = await admin
    .from("organizations")
    .select("id, name")
    .eq("id", pending.organization_id)
    .maybeSingle();
  if (!org) {
    return <InvalidLink message="Esta organização já não existe." />;
  }

  // Concrete numbers make the destructive step harder to wave through.
  const [clients, requests, files] = await Promise.all([
    admin
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", org.id),
    admin
      .from("requests")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", org.id),
    listOrganizationStoragePaths(org.id),
  ]);

  const counts = [
    { label: "Clientes", value: clients.count ?? 0 },
    { label: "Pedidos", value: requests.count ?? 0 },
    { label: "Ficheiros", value: files.length },
  ];

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <h1 className="text-xl font-bold text-destructive">
        Eliminar «{org.name}»
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Confirmou o pedido no painel. Esta é a última etapa — depois de
        eliminar, não há forma de recuperar nada.
      </p>

      <ul className="mt-6 space-y-2 rounded-lg border p-4 text-sm">
        {counts.map((c) => (
          <li key={c.label} className="flex items-center justify-between">
            <span className="text-muted-foreground">{c.label}</span>
            <span className="font-semibold">{c.value}</span>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-xs text-muted-foreground">
        As contas da equipa são removidas e ninguém poderá voltar a entrar.
      </p>

      <div className="mt-6">
        <ConfirmDeletionForm token={token} organizationName={org.name} />
      </div>
    </div>
  );
}
