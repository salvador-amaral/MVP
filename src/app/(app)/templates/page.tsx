import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowRight, FileText, Plus, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/data";
import { seedExampleTemplatesAction } from "@/server/actions/templates";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ActionButton } from "@/components/shared/action-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default async function TemplatesPage() {
  await requireUser();

  const supabase = await createClient();
  const { data: templates } = await supabase
    .from("templates")
    .select("id, name, description, created_at")
    .order("created_at", { ascending: false });

  const { data: allItems } = templates?.length
    ? await supabase
        .from("template_items")
        .select("template_id")
        .in("template_id", templates.map((t) => t.id))
    : { data: null };

  const counts = new Map<string, number>();
  for (const item of allItems ?? []) {
    counts.set(item.template_id, (counts.get(item.template_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Modelos"
        description="Listas de documentos reutilizáveis para enviar aos clientes."
        actions={
          <Button asChild>
            <Link href="/templates/new">
              <Plus /> Novo modelo
            </Link>
          </Button>
        }
      />

      {!templates || templates.length === 0 ? (
        <EmptyState
          title="Ainda não tem modelos"
          description="Crie um modelo ou carregue modelos de exemplo de contabilidade em português para começar já."
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <ActionButton
                variant="outline"
                action={seedExampleTemplatesAction}
                successMessage="Modelos de exemplo adicionados"
                pendingText="A carregar…"
              >
                <Sparkles /> Carregar modelos de exemplo
              </ActionButton>
              <Button asChild>
                <Link href="/templates/new">
                  <Plus /> Criar do zero
                </Link>
              </Button>
            </div>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Link key={template.id} href={`/templates/${template.id}`}>
              <Card className="h-full p-5 transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {counts.get(template.id) ?? 0} itens
                  </span>
                </div>
                <h3 className="mt-3 font-semibold">{template.name}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {template.description || "Sem descrição"}
                </p>
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {format(new Date(template.created_at), "dd/MM/yyyy", {
                      locale: ptBR,
                    })}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
