import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/data";
import { createRequestAction } from "@/server/actions/requests";
import { DEFAULT_DUE_DAYS } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RequestForm } from "@/components/requests/request-form";

export default async function NewRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; templateId?: string }>;
}) {
  const { clientId, templateId } = await searchParams;
  await requireUser();

  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name")
    .order("name", { ascending: true });
  const { data: templates } = await supabase
    .from("templates")
    .select("id, name")
    .order("name", { ascending: true });

  // item counts per template
  const templateIds = (templates ?? []).map((t) => t.id);
  const { data: itemRows } = templateIds.length
    ? await supabase
        .from("template_items")
        .select("template_id")
        .in("template_id", templateIds)
    : { data: null };
  const counts = new Map<string, number>();
  for (const row of itemRows ?? []) {
    counts.set(row.template_id, (counts.get(row.template_id) ?? 0) + 1);
  }

  if (clientId) {
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("id", clientId)
      .maybeSingle();
    if (!client) notFound();
  }
  if (templateId) {
    const { data: template } = await supabase
      .from("templates")
      .select("id")
      .eq("id", templateId)
      .maybeSingle();
    if (!template) notFound();
  }

  const defaultDue = new Date();
  defaultDue.setDate(defaultDue.getDate() + DEFAULT_DUE_DAYS);
  const defaultDueDate = defaultDue.toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/requests"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Pedidos
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Novo pedido de documentos</CardTitle>
        </CardHeader>
        <CardContent>
          {(clients ?? []).length === 0 ? (
            <div className="space-y-4 rounded-md border border-dashed p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Precisa de pelo menos um cliente e um modelo para criar um pedido.
              </p>
              <Button asChild>
                <Link href="/clients/new">
                  <Plus /> Criar cliente
                </Link>
              </Button>
            </div>
          ) : (templates ?? []).length === 0 ? (
            <div className="space-y-4 rounded-md border border-dashed p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Crie um modelo (ou carregue modelos de exemplo) primeiro.
              </p>
              <Button asChild>
                <Link href="/templates/new">
                  <Plus /> Criar modelo
                </Link>
              </Button>
            </div>
          ) : (
            <RequestForm
              action={createRequestAction}
              clients={(clients ?? []).map((c) => ({ id: c.id, name: c.name }))}
              templates={(templates ?? []).map((t) => ({
                id: t.id,
                name: t.name,
                items: counts.get(t.id) ?? 0,
              }))}
              defaultClientId={clientId}
              defaultTemplateId={templateId}
              defaultDueDate={defaultDueDate}
              title="Guardar rascunho"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
