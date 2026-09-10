import Link from "next/link";
import { ArrowRight, Plus, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/data";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  await requireUser();

  const supabase = await createClient();
  let query = supabase
    .from("clients")
    .select("id, name, email, phone")
    .order("name", { ascending: true });
  if (q && q.trim()) {
    const term = `%${q.trim()}%`;
    query = query.or(`name.ilike.${term},email.ilike.${term}`);
  }
  const { data: clients } = await query;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        description="As pessoas e empresas a quem envia pedidos de documentação."
        actions={
          <Button asChild>
            <Link href="/clients/new">
              <Plus /> Novo cliente
            </Link>
          </Button>
        }
      />

      <form className="relative max-w-sm" action="/clients">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="q"
          defaultValue={q}
          placeholder="Procurar por nome ou email…"
          className="pl-9"
        />
      </form>

      {!clients || clients.length === 0 ? (
        <EmptyState
          title={q ? "Sem resultados" : "Ainda não tem clientes"}
          description={
            q
              ? "Tente um termo de pesquisa diferente."
              : "Adicione o primeiro cliente para começar a enviar pedidos de documentos."
          }
          action={
            !q ? (
              <Button asChild>
                <Link href="/clients/new">
                  <Plus /> Adicionar cliente
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card>
          <ul className="divide-y">
            {clients.map((client) => (
              <li key={client.id}>
                <Link
                  href={`/clients/${client.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 font-medium">
                      {client.name}
                      {client.phone ? (
                        <span className="text-xs text-muted-foreground font-normal">
                          {client.phone}
                        </span>
                      ) : null}
                    </div>
                    <div className="truncate text-sm text-muted-foreground">
                      {client.email}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
