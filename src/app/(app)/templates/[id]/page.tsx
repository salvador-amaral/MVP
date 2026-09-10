import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Send, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser, isAdmin } from "@/server/data";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/shared/confirm-button";
import { TemplateEditor } from "@/components/templates/template-editor";
import {
  deleteTemplateAction,
  updateTemplateAction,
} from "@/server/actions/templates";
import type { TemplateItemType } from "@/types/database";

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const supabase = await createClient();
  const { data: template } = await supabase
    .from("templates")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!template) notFound();

  const { data: items } = await supabase
    .from("template_items")
    .select("*")
    .eq("template_id", id)
    .order("position", { ascending: true });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={template.name}
        description="Os pedidos já enviados guardam uma cópia deste modelo."
        actions={
          <>
            {isAdmin(user) ? (
              <ConfirmButton
                action={deleteTemplateAction.bind(null, template.id)}
                confirmText={`Eliminar o modelo "${template.name}"?`}
                variant="ghost"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 /> Eliminar
              </ConfirmButton>
            ) : null}
            <Button asChild>
              <Link href={`/requests/new?templateId=${template.id}`}>
                <Send /> Criar pedido
              </Link>
            </Button>
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Editar modelo</CardTitle>
        </CardHeader>
        <CardContent>
          <TemplateEditor
            action={updateTemplateAction.bind(null, template.id)}
            defaultName={template.name}
            defaultDescription={template.description}
            initialItems={(items ?? []).map((item) => ({
              title: item.title,
              description: item.description,
              type: item.type as TemplateItemType,
              is_required: item.is_required,
            }))}
          />
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4 shrink-0" />
        <span>
          Alterações a este modelo não afetam pedidos já enviados — cada pedido
          guarda uma cópia dos itens no momento do envio.
        </span>
      </div>
    </div>
  );
}
